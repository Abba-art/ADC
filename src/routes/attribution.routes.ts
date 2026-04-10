import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import { AttributionService } from '../services/attribution.service.js'
import { assignationSchema } from '../schemas/attribution.schema.js'
import prisma from '../lib/prisma.js'

const attributionRoutes = new Hono<{ Variables: { user: any } }>()
const service = new AttributionService()

attributionRoutes.use('*', authMiddleware)

attributionRoutes.post('/assigner', requireRole(['ADMIN', 'CHEF_DEPARTEMENT']), zValidator('json', assignationSchema), async (c) => {
  const role = c.get('user').role.libelle || c.get('user').role;
  const data = await service.assignerProfesseur(c.req.valid('json'), role);
  return c.json({ success: true, data }, 201);
})

attributionRoutes.patch(
  '/decider/:id',
  requireRole(['ADMIN', 'CHEF_ETABLISSEMENT']),
  zValidator('json', z.object({ decision: z.enum(['VALIDE', 'REJETE']), motif: z.string().optional() })),
  async (c) => {
    const id = c.req.param('id');
    const { decision, motif } = c.req.valid('json');
    
    const data = await prisma.attribution.update({
      where: { id },
      data: { statutValidation: decision, motif: motif || undefined } 
    });
    
    return c.json({ success: true, message: `L'attribution a été ${decision.toLowerCase()}e avec succès`, data });
  }
)

// Reconduction annuelle (Année X -> X+1)
attributionRoutes.post(
  '/reconduire', 
  requireRole(['ADMIN', 'CHEF_DEPARTEMENT']), 
  zValidator('json', z.object({ anneeSourceId: z.number(), anneeCibleId: z.number() })),
  async (c) => {
    const { anneeSourceId, anneeCibleId } = c.req.valid('json');
    const data = await service.reconduireAnnee(anneeSourceId, anneeCibleId);
    return c.json({ success: true, message: `Reconduction terminée`, data });
  }
)

// 🔥 NOUVELLE ROUTE : Obtenir la liste des professeurs reconduits pour une année spécifique
attributionRoutes.get(
  '/suivi-reconduction', 
  requireRole(['ADMIN', 'CHEF_DEPARTEMENT', 'CHEF_ETABLISSEMENT']), 
  zValidator('query', z.object({ anneeCibleId: z.string() })),
  async (c) => {
    const { anneeCibleId } = c.req.valid('query');
    const data = await service.getSuiviReconduction(Number(anneeCibleId));
    return c.json({ success: true, data });
  }
)

// Obtenir toutes les attributions
attributionRoutes.get('/toutes', requireRole(['ADMIN', 'CHEF_ETABLISSEMENT', 'CHEF_DEPARTEMENT']), async (c) => {
  const data = await prisma.attribution.findMany({
    include: {
      utilisateur: { select: { nom: true, prenom: true } },
      matiere: { select: { nom: true, credits: true, code: true } },
      classe: { select: { code: true } },
      annee: { select: { libelle: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
 
  return c.json({ success: true, data });
});

export default attributionRoutes