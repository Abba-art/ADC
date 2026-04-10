import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import { institutGuard } from '../middleware/institut.middleware.js'
import { UtilisateurService } from '../services/utilisateur.service.js'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import prisma from '../lib/prisma.js'
import { ReportService } from '../services/report.service.js';

type Variables = {
  user: { id: string; role: string | { libelle: string } }
  institutIds?: number[]
}

const utilisateurRoutes = new Hono<{ Variables: Variables }>()
const service = new UtilisateurService()

utilisateurRoutes.use('*', authMiddleware)
utilisateurRoutes.use('*', institutGuard)

// ──── Accessible à tous (PROF + CHEFS + ADMIN) ────
// 🔥 AJOUT : Accepte ?anneeId=X pour filtrer le volume horaire
utilisateurRoutes.get('/professeurs', async (c) => {
  const anneeId = c.req.query('anneeId') ? Number(c.req.query('anneeId')) : undefined;
  const data = await service.getProfesseursActifs(anneeId)
  return c.json({ success: true, data })
})

// Route pour le profil connecté
utilisateurRoutes.get('/me', async (c) => {
  const currentUser = c.get('user');
  const anneeId = c.req.query('anneeId') ? Number(c.req.query('anneeId')) : undefined;
  
  const data = await service.getUtilisateurById(currentUser.id, true, anneeId);
  return c.json({ success: true, data });
})

// Route pour télécharger le PDF du professeur connecté
utilisateurRoutes.get('/me/export-charge', async (c) => {
  const currentUser = c.get('user');
  const reportService = new ReportService();
  const pdfBuffer = await reportService.generateFicheEnseignantPdf(currentUser.id);

  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', `attachment; filename="Ma_Fiche_Charge.pdf"`);
  return c.body(pdfBuffer as any);
})

// ──── CHEFS & ADMIN ────
utilisateurRoutes.get('/', requireRole(['ADMIN', 'CHEF_ETABLISSEMENT', 'CHEF_DEPARTEMENT']), async (c) => {
  const user = c.get('user')
  const role = typeof user.role === 'object' ? user.role.libelle : user.role
  const institutIds = c.get('institutIds') || []

  const data = await service.getAllUtilisateurs(role, institutIds)
  return c.json({ success: true, count: data.length, data })
})

// 🔥 LA CORRECTION EST ICI : On place la route /deleted AVANT /:id
// Sinon le routeur croit que "deleted" est un ID d'utilisateur !
utilisateurRoutes.get('/deleted', requireRole(['ADMIN', 'CHEF_ETABLISSEMENT']), async (c) => {
  const data = await service.getDeletedUsers();
  return c.json({ success: true, data });
})

// ──── RÉCUPÉRER UN UTILISATEUR ────
utilisateurRoutes.get('/:id', requireRole(['ADMIN', 'CHEF_ETABLISSEMENT', 'CHEF_DEPARTEMENT', 'PROFESSEUR']), async (c) => {
  const id = c.req.param('id')
  if (!id) throw new HTTPException(400, { message: 'ID utilisateur manquant' })

  const currentUser = c.get('user')
  const role = typeof currentUser.role === 'object' ? (currentUser.role as any).libelle : currentUser.role;

  if (role === 'PROFESSEUR' && currentUser.id !== id) {
    throw new HTTPException(403, { message: "Accès interdit. Vous ne pouvez consulter que votre propre profil." })
  }

  const withCharge = c.req.query('withCharge') === 'true'
  const anneeId = c.req.query('anneeId') ? Number(c.req.query('anneeId')) : undefined;

  const data = await service.getUtilisateurById(id, withCharge, anneeId)
  return c.json({ success: true, data })
})

// ──── SEULEMENT ADMIN peut modifier ou supprimer ────
const updateSchema = z.object({
  nom: z.string().min(2).optional(),
  prenom: z.string().min(2).optional(),
  idRole: z.number().int().positive().optional(),
  idStatut: z.number().int().positive().optional(),
})

utilisateurRoutes.patch(
  '/:id',
  requireRole(['ADMIN']),
  zValidator('json', updateSchema),
  async (c) => {
    const id = c.req.param('id')
    const payload = c.req.valid('json')
    const currentUser = c.get('user')

    if (id === currentUser.id && payload.idRole) {
      throw new HTTPException(403, { message: 'Vous ne pouvez pas modifier votre propre rôle' })
    }

    const updated = await service.updateUser(id, payload)
    return c.json({ success: true, message: 'Utilisateur modifié', data: updated })
  }
)

utilisateurRoutes.delete('/:id', requireRole(['ADMIN', 'CHEF_ETABLISSEMENT', 'CHEF_DEPARTEMENT']), async (c) => {
  const id = c.req.param('id');
  if(!id) throw new HTTPException(400, {message:"veuillez entrer l'id"});

  const currentUser = c.get('user');
  const role = typeof currentUser.role === 'object' ? (currentUser.role as any).libelle : currentUser.role;

  // SÉCURITÉ RENFORCÉE
  if (role !== 'ADMIN') {
    const targetUser = await prisma.utilisateur.findUnique({ where: { id }, include: { role: true } });
    if (!targetUser) {
      throw new HTTPException(404, { message: "Utilisateur introuvable." });
    }
    if (targetUser.role?.libelle !== 'PROFESSEUR') {
      throw new HTTPException(403, { message: "Vous n'êtes autorisé à désactiver que les professeurs." });
    }
  }

  await service.softDelete(id);
  return c.json({ success: true, message: 'Utilisateur désactivé avec succès' });
});

utilisateurRoutes.post('/:id/instituts', requireRole(['ADMIN']), async (c) => {
  const userId = c.req.param('id');
  const { institutId } = await c.req.json();

  await prisma.utilisateur.update({
    where: { id: userId },
    data: {
      instituts: {
        connect: { id: institutId }
      }
    }
  });

  return c.json({ success: true, message: "Institut assigné avec succès" });
});

utilisateurRoutes.post('/:id/restore', requireRole(['ADMIN', 'CHEF_ETABLISSEMENT', 'CHEF_DEPARTEMENT']), async (c) => {
  const id = c.req.param('id');
  if(!id) throw new HTTPException(400, {message:"veuillez entrer l'id"});

  const currentUser = c.get('user');
  const role = typeof currentUser.role === 'object' ? (currentUser.role as any).libelle : currentUser.role;

  if (role !== 'ADMIN') {
    const targetUser = await prisma.utilisateur.findUnique({ where: { id }, include: { role: true } });
    if (!targetUser) throw new HTTPException(404, { message: "Utilisateur introuvable." });
    
    if (targetUser.role?.libelle !== 'PROFESSEUR') {
      throw new HTTPException(403, { message: "Vous n'êtes autorisé à restaurer que les professeurs." });
    }
  }

  await service.restoreUser(id); 
  return c.json({ success: true, message: 'Utilisateur réactivé avec succès' });
});

utilisateurRoutes.get('/:id/export-charge', requireRole(['ADMIN', 'CHEF_ETABLISSEMENT', 'CHEF_DEPARTEMENT', 'PROFESSEUR']), async (c) => {
  const id = c.req.param('id');
  const currentUser = c.get('user');

  if (currentUser.role === 'PROFESSEUR' && currentUser.id !== id) {
    throw new HTTPException(403, { message: "Accès interdit." });
  }

  const reportService = new ReportService();
  if (!id) return 
  const pdfBuffer = await reportService.generateFicheEnseignantPdf(id);

  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', `attachment; filename="Fiche_Charge_${id}.pdf"`);
  return c.body(pdfBuffer as any);
});

export default utilisateurRoutes;