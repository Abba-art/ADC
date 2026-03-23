import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import { institutGuard } from '../middleware/institut.middleware.js'
import { EnseignementService } from '../services/enseignement.service.js'
import { assignationSchema, clotureSchema, reconductionSchema } from '../schemas/enseignement.schema.js'
import prisma from '../lib/prisma.js'
import { z } from 'zod' // Correction import

type Variables = {
  user: { id: string; role: string | { libelle: string } }
  institutIds?: number[]
}

const enseignementRoutes = new Hono<{ Variables: Variables }>()
const service = new EnseignementService()

enseignementRoutes.use('*', authMiddleware)
enseignementRoutes.use('*', institutGuard)   

enseignementRoutes.post(
  '/assigner',
  requireRole(['ADMIN', 'CHEF_ETABLISSEMENT', 'CHEF_DEPARTEMENT']),
  zValidator('json', assignationSchema),
  async (c) => {
    const payload = c.req.valid('json')
    
    // EXTRACTION DU RÔLE POUR LE PASSER AU SERVICE
    const user = c.get('user')
    const role = typeof user.role === 'object' && user.role !== null ? (user.role as any).libelle : user.role;
    
    // ON PASSE LE ROLE AU SERVICE
    const data = await service.assignerProfesseur(payload, role as string)
    return c.json({ success: true, message: 'Professeur assigné avec succès', data }, 201)
  }
)

enseignementRoutes.post(
  '/clore',
  requireRole(['ADMIN', 'CHEF_ETABLISSEMENT', 'CHEF_DEPARTEMENT']),
  zValidator('json', clotureSchema),
  async (c) => {
    const payload = c.req.valid('json')
    const data = await service.cloreEnseignement(payload)
    return c.json({ success: true, message: 'Enseignement clôturé', data })
  }
)

enseignementRoutes.get('/professeur/:id', async (c) => {
  const id = c.req.param('id')
  const data = await service.getChargeProfesseur(id)
  return c.json({ success: true, data })
})

enseignementRoutes.get('/course/:courseId', async (c) => {
  const courseId = c.req.param('courseId')
  const enseignementActif = await prisma.enseignement.findFirst({
    where: { courseId, estActif: true },
    include: { utilisateur: { select: { nom: true, prenom: true } } },
  })
  return c.json({ success: true, data: enseignementActif })
})

// CORRECTION ZOD : z.string().uuid() au lieu de z.uuid()
const validationSchema = z.object({
  enseignementId: z.string().uuid(),
  statut: z.enum(['VALIDE', 'REJETE'])
})

enseignementRoutes.patch(
  '/valider',
  requireRole(['ADMIN', 'CHEF_ETABLISSEMENT']),
  zValidator('json', validationSchema),
  async (c) => {
    const { enseignementId, statut } = c.req.valid('json')
    
    const data = await prisma.enseignement.update({
      where: { id: enseignementId },
      data: { statutValidation: statut }
    })
    
    return c.json({ success: true, message: `Proposition ${statut}`, data })
  }
)
enseignementRoutes.get('/propositions', requireRole(['ADMIN', 'CHEF_ETABLISSEMENT']), async (c) => {
  const user = c.get('user');
  const role = typeof user.role === 'object' && user.role !== null ? (user.role as any).libelle : user.role;
  const institutIds = c.get('institutIds') || [];

  const data = await service.getPropositionsEnAttente(role as string, institutIds);
  return c.json({ success: true, count: data.length, data });
});

// 2. Obtenir le tableau de bord global des cours actifs
enseignementRoutes.get('/actifs', async (c) => {
  const user = c.get('user');
  const role = typeof user.role === 'object' && user.role !== null ? (user.role as any).libelle : user.role;
  const institutIds = c.get('institutIds') || [];

  const data = await service.getEnseignementsActifs(role as string, institutIds);
  return c.json({ success: true, count: data.length, data });
});

// 3. Déclencher la reconduction automatique
enseignementRoutes.post('/reconduire', requireRole(['ADMIN', 'CHEF_ETABLISSEMENT']), zValidator('json', reconductionSchema), async (c) => {
  const { anneeSourceId, anneeCibleId } = c.req.valid('json');
  const user = c.get('user');
  const role = typeof user.role === 'object' && user.role !== null ? (user.role as any).libelle : user.role;

  const data = await service.reconduireAnnee(anneeSourceId, anneeCibleId, role as string);
  
  return c.json({ 
    success: true, 
    message: `${data.successCount} enseignements reconduits avec succès.`, 
    data 
  });
});
export default enseignementRoutes