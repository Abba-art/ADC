import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { institutGuard } from '../middleware/institut.middleware.js'
import { DashboardService } from '../services/dashboard.service.js'

type Variables = {
  user: { id: string; role: string | { libelle: string } }
}

const dashboardRoutes = new Hono<{ Variables: Variables }>()
const service = new DashboardService()

dashboardRoutes.use('*', authMiddleware)
dashboardRoutes.use('*', institutGuard)

dashboardRoutes.get('/', async (c) => {
  const stats = await service.getStats()
  return c.json({ success: true, data: stats })
})

export default dashboardRoutes