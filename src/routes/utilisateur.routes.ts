import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import { institutGuard } from '../middleware/institut.middleware.js'
import { UtilisateurService } from '../services/utilisateur.service.js'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'

type Variables = {
  user: { id: string; role: string | { libelle: string } }
  institutIds?: number[]
}

const utilisateurRoutes = new Hono<{ Variables: Variables }>()
const service = new UtilisateurService()

utilisateurRoutes.use('*', authMiddleware)
utilisateurRoutes.use('*', institutGuard)

// ──── Accessible à tous (PROF + CHEFS + ADMIN) ────
utilisateurRoutes.get('/professeurs', async (c) => {
  const data = await service.getProfesseursActifs()
  return c.json({ success: true, data })
})

// ──── CHEFS & ADMIN (Filtrage auto par institut via le service) ────
utilisateurRoutes.get('/', requireRole(['ADMIN', 'CHEF_ETABLISSEMENT', 'CHEF_DEPARTEMENT']), async (c) => {
  const user = c.get('user')
  const role = typeof user.role === 'object' ? user.role.libelle : user.role
  const institutIds = c.get('institutIds') || []

  const data = await service.getAllUtilisateurs(role, institutIds)
  return c.json({ success: true, count: data.length, data })
})

utilisateurRoutes.get('/:id', requireRole(['ADMIN', 'CHEF_ETABLISSEMENT', 'CHEF_DEPARTEMENT']), async (c) => {
  const id = c.req.param('id')
  if (!id) throw new HTTPException(400, { message: 'ID utilisateur manquant' })

  const withCharge = c.req.query('withCharge') === 'true'
  const data = await service.getUtilisateurById(id, withCharge)
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

utilisateurRoutes.delete('/:id', requireRole(['ADMIN']), async (c) => {
  const id = c.req.param('id')
  if(!id) throw new HTTPException(400, {message:"veuillez entrer l'id"})
  await service.softDelete(id)
  return c.json({ success: true, message: 'Utilisateur désactivé (soft delete)' })
})

export default utilisateurRoutes