import { Hono } from 'hono';
import { StatutService } from '../services/statut.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { QuotaPeriode } from '@prisma/client'; // 🔥 IMPORT DE L'ENUM PRISMA

const statutRoutes = new Hono();
const service = new StatutService();

// Protection par token pour toutes les requêtes
statutRoutes.use('*', authMiddleware);

// Récupérer tous les statuts
statutRoutes.get('/', async (c) => {
  const data = await service.getAll();
  return c.json({ success: true, data });
});

// MODIFIER UN STATUT (Réservé à l'Admin)
statutRoutes.patch('/:id', requireRole(['ADMIN']), async (c) => {
  const id = Number(c.req.param('id'));
  const payload = await c.req.json();
  
  // Appel du service de mise à jour avec les bonnes données et typages
  const data = await service.update(id, {
    quotaHeureMax: payload.quotaHeureMax,
    quotaPeriode: payload.quotaPeriode as QuotaPeriode // 🔥 CAST POUR RASSURER TYPESCRIPT
  });
  
  return c.json({ success: true, message: 'Statut mis à jour avec succès', data });
});

export default statutRoutes;