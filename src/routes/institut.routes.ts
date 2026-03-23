import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import { institutGuard } from '../middleware/institut.middleware.js'
import { InstitutService } from '../services/institut.service.js'
import { institutSchema } from '../schemas/institut.schema.js'

type Variables = {
  user: { id: string; role: string | { libelle: string } }
}

const institutRoutes = new Hono<{ Variables: Variables }>()
const service = new InstitutService()

institutRoutes.use('*', authMiddleware)
institutRoutes.use('*', institutGuard)

institutRoutes.get('/', requireRole(['ADMIN']), async (c) => {
  const data = await service.getAllInstituts()
  return c.json({ success: true, data })
})

institutRoutes.post('/', requireRole(['ADMIN']), zValidator('json', institutSchema), async (c) => {
  const payload = c.req.valid('json')
  const data = await service.createInstitut(payload)
  return c.json({ success: true, data }, 201)
})

institutRoutes.patch('/:id', requireRole(['ADMIN']), zValidator('json', institutSchema.partial()), async (c) => {
  const id = Number(c.req.param('id'))
  const payload = c.req.valid('json')
  const data = await service.updateInstitut(id, payload)
  return c.json({ success: true, data })
})

institutRoutes.delete('/:id', requireRole(['ADMIN']), async (c) => {
  const id = Number(c.req.param('id'))
  await service.deleteInstitut(id)
  return c.json({ success: true, message: 'Institut supprimé' })
})

export default institutRoutes