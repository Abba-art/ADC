import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import { institutGuard } from '../middleware/institut.middleware.js'
import { StructureService } from '../services/structure.service.js'
import {
  filiereSchema,
  niveauSchema,
  classeSchema,
  anneeAcademiqueSchema,
  matiereSchema,
  courseSchema,
} from '../schemas/structure.schema.js'
import prisma from '../lib/prisma.js'

type Variables = {
  user: { id: string; role: string | { libelle: string } }
  institutIds?: number[]
}

const structureRoutes = new Hono<{ Variables: Variables }>()
const service = new StructureService()

structureRoutes.use('*', authMiddleware)
structureRoutes.use('*', institutGuard)   // ← Guard appliqué

structureRoutes.get('/filieres', async (c) => {
  const data = await service.getAllFilieres()
  return c.json({ success: true, data })
})

structureRoutes.post('/filieres', requireRole(['ADMIN']), zValidator('json', filiereSchema), async (c) => {
  const { nom, institutId } = c.req.valid('json') 
  const data = await service.createFiliere(nom, institutId) // 🔥 On le passe au service
  return c.json({ success: true, data }, 201)
})
structureRoutes.get('/niveaux', async (c) => {
  const data = await service.getAllNiveaux()
  return c.json({ success: true, data })
})

structureRoutes.post('/niveaux', requireRole(['ADMIN']), zValidator('json', niveauSchema), async (c) => {
  const { libelle } = c.req.valid('json')
  const data = await service.createNiveau(libelle)
  return c.json({ success: true, data }, 201)
})

structureRoutes.get('/classes', async (c) => {
  const institutIds = c.get('institutIds') || [] 
  const user = c.get('user');
  const role = typeof user.role === 'object' && user.role !== null ? (user.role as any).libelle : user.role;
  
  // Lecture de la requête ?filiereId=X
  const filiereId = c.req.query('filiereId') ? parseInt(c.req.query('filiereId')!) : undefined;
  
  const data = await service.getAllClasses(role as string, institutIds, filiereId)
  return c.json({ success: true, data })
})  

structureRoutes.post('/classes', requireRole(['ADMIN']), zValidator('json', classeSchema), async (c) => {
  const { code, filiereId, niveauId } = c.req.valid('json')
  const data = await service.createClasse(code, filiereId, niveauId)
  return c.json({ success: true, data }, 201)
})

structureRoutes.get('/annees', async (c) => {
  const data = await service.getAllAnneesAcademiques()
  return c.json({ success: true, data })
})

structureRoutes.post('/annees', requireRole(['ADMIN']), zValidator('json', anneeAcademiqueSchema), async (c) => {
  const { libelle } = c.req.valid('json')
  const data = await service.createAnneeAcademique(libelle)
  return c.json({ success: true, data }, 201)
})

structureRoutes.get('/matieres', async (c) => {
  const institutIds = c.get('institutIds') || [] 
  const user = c.get('user');
  const role = typeof user.role === 'object' && user.role !== null ? (user.role as any).libelle : user.role;
  
  const filiereId = c.req.query('filiereId') ? parseInt(c.req.query('filiereId')!) : undefined;

  const data = await service.getAllMatieres(role as string, institutIds, filiereId)
  return c.json({ success: true, data })
})

structureRoutes.post('/matieres', requireRole(['ADMIN']), zValidator('json', matiereSchema), async (c) => {
  const payload = c.req.valid('json')
  const data = await service.createMatiere(payload)
  return c.json({ success: true, data }, 201)
})

structureRoutes.get('/courses', async (c) => {
  const institutIds = c.get('institutIds') || [] 
  const user = c.get('user');
  const role = typeof user.role === 'object' && user.role !== null ? (user.role as any).libelle : user.role;
  
  const classeId = c.req.query('classeId') ? parseInt(c.req.query('classeId')!) : undefined;
  const anneeId = c.req.query('anneeId') ? parseInt(c.req.query('anneeId')!) : undefined;
  
  const nonAssigne = c.req.query('nonAssigne') === 'true';

  const data = await service.getAllCourses(role as string, institutIds, classeId, anneeId, nonAssigne)
  return c.json({ success: true, data })
})
structureRoutes.post('/courses', requireRole(['ADMIN']), zValidator('json', courseSchema), async (c) => {
  const payload = c.req.valid('json')
  const data = await service.createCourse(payload)
  return c.json({ success: true, data }, 201)
})
structureRoutes.delete('/filieres/:id', requireRole(['ADMIN']), async (c) => {
  const id = Number(c.req.param('id'));
  // Prisma va bloquer la suppression si la filière contient déjà des classes (grâce à onDelete: Restrict)
  // C'est une excellente sécurité pour ne pas casser la base de données !
  await prisma.filiere.delete({ where: { id } });
  return c.json({ success: true, message: 'Filière supprimée avec succès' });
});

// Supprimer une Classe
structureRoutes.delete('/classes/:id', requireRole(['ADMIN']), async (c) => {
  const id = Number(c.req.param('id'));
  await prisma.classe.delete({ where: { id } });
  return c.json({ success: true, message: 'Classe supprimée avec succès' });
});
// --- ROUTES DE MODIFICATION (PATCH) ---
structureRoutes.patch('/filieres/:id', requireRole(['ADMIN']), async (c) => {
  const { nom, institutId } = await c.req.json(); // 🔥 Récupération de l'institutId
  const data = await service.updateFiliere(Number(c.req.param('id')), nom, institutId);
  return c.json({ success: true, message: 'Filière modifiée', data });
});

structureRoutes.patch('/niveaux/:id', requireRole(['ADMIN']), async (c) => {
  const { libelle } = await c.req.json();
  const data = await service.updateNiveau(Number(c.req.param('id')), libelle);
  return c.json({ success: true, message: 'Niveau modifié', data });
});

structureRoutes.patch('/classes/:id', requireRole(['ADMIN']), async (c) => {
  const payload = await c.req.json();
  const data = await service.updateClasse(Number(c.req.param('id')), payload);
  return c.json({ success: true, message: 'Classe modifiée', data });
});

structureRoutes.patch('/matieres/:id', requireRole(['ADMIN']), async (c) => {
  const payload = await c.req.json();
  const data = await service.updateMatiere(Number(c.req.param('id')), payload);
  return c.json({ success: true, message: 'Matière modifiée', data });
});

structureRoutes.delete('/niveaux/:id', requireRole(['ADMIN']), async (c) => {
  await service.deleteNiveau(Number(c.req.param('id')));
  return c.json({ success: true, message: 'Niveau supprimé' });
});

structureRoutes.delete('/matieres/:id', requireRole(['ADMIN']), async (c) => {
  await service.deleteMatiere(Number(c.req.param('id')));
  return c.json({ success: true, message: 'Matière supprimée' });
});


export default structureRoutes