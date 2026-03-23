import { Hono } from 'hono';
import { StatutService } from '../services/statut.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const statutRoutes = new Hono();
const service = new StatutService();

statutRoutes.use('*', authMiddleware);

statutRoutes.get('/', async (c) => {
  const data = await service.getAll();
  return c.json({ success: true, data });
});

export default statutRoutes;