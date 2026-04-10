 // src/routes/structure.routes.ts (DANS LE BACKEND)

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Semestre } from '@prisma/client'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import { institutGuard } from '../middleware/institut.middleware.js'
import { StructureService } from '../services/structure.service.js'

const structureRoutes = new Hono<{ Variables: { user: any, institutIds: number[] } }>()
const service = new StructureService()

structureRoutes.use('*', authMiddleware)
structureRoutes.use('*', institutGuard)

// ==========================================
// ROUTES DÉPARTEMENTS
// ==========================================
structureRoutes.get('/departements', async (c) => {
  const data = await service.getAllDepartements()
  return c.json({ success: true, data })
})

structureRoutes.post('/departements', requireRole(['ADMIN']), zValidator('json', z.object({
  nom: z.string().min(2),
  institutId: z.number().positive(),
  chefId: z.uuid()
})), async (c) => {
  const { nom, institutId, chefId } = c.req.valid('json')
  const data = await service.createDepartement(nom, institutId, chefId)
  return c.json({ success: true, message: 'Département créé avec succès', data }, 201)
})
structureRoutes.delete('/departements/:id', requireRole(['ADMIN']), async (c) => {
  const id = Number(c.req.param('id'))
  await service.deleteDepartement(id)
  return c.json({ success: true, message: 'Département supprimé' })
})

// ==========================================
// ROUTES MATIÈRES
// ==========================================
structureRoutes.get('/matieres', async (c) => {
  const user = c.get('user')
  const role = typeof user.role === 'object' ? user.role.libelle : user.role
  const institutIds = c.get('institutIds') || []
  
  const data = await service.getAllMatieres(role, institutIds)
  return c.json({ success: true, data })
})

structureRoutes.post('/matieres', requireRole(['ADMIN']), zValidator('json', z.object({
  code: z.string().min(2),
  nom: z.string().min(2),
  credits: z.number().positive(),
  semestre: z.nativeEnum(Semestre),
  departementId: z.number().positive()
})), async (c) => {
  const payload = c.req.valid('json')
  const data = await service.createMatiere(payload)
  return c.json({ success: true, message: 'Matière ajoutée au catalogue', data }, 201)
})

structureRoutes.delete('/matieres/:id', requireRole(['ADMIN']), async (c) => {
  const id = Number(c.req.param('id'))
  await service.deleteMatiere(id)
  return c.json({ success: true, message: 'Matière supprimée' })
})
// ==========================================
// ROUTES CLASSES
// ==========================================
structureRoutes.get('/classes', async (c) => {
  const user = c.get('user')
  const role = typeof user.role === 'object' ? user.role.libelle : user.role
  const institutIds = c.get('institutIds') || []
  const data = await service.getAllClasses(role, institutIds)
  return c.json({ success: true, data })
})

structureRoutes.post('/classes', requireRole(['ADMIN']), zValidator('json', z.object({
  code: z.string().min(2),
  departementId: z.number().positive(),
  niveauId: z.number().positive()
})), async (c) => {
  const { code, departementId, niveauId } = c.req.valid('json')
  const data = await service.createClasse(code, departementId, niveauId)
  return c.json({ success: true, message: 'Classe créée', data }, 201)
})

// ==========================================
// ROUTES ANNÉES ACADÉMIQUES
// ==========================================
structureRoutes.get('/annees', async (c) => {
  const data = await service.getAllAnneesAcademiques()
  return c.json({ success: true, data })
})

structureRoutes.post('/annees', requireRole(['ADMIN']), zValidator('json', z.object({
  libelle: z.string().min(4)
})), async (c) => {
  const { libelle } = c.req.valid('json')
  const data = await service.createAnneeAcademique(libelle)
  return c.json({ success: true, message: 'Année ajoutée', data }, 201)
})

// ==========================================
// ROUTES NIVEAUX
// ==========================================
structureRoutes.get('/niveaux', async (c) => {
  const data = await service.getAllNiveaux()
  return c.json({ success: true, data })
})

structureRoutes.post('/niveaux', requireRole(['ADMIN']), zValidator('json', z.object({
  libelle: z.string().min(2)
})), async (c) => {
  const { libelle } = c.req.valid('json')
  const data = await service.createNiveau(libelle)
  return c.json({ success: true, message: 'Niveau ajouté', data }, 201)
})
export default structureRoutes;