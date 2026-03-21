import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator'; // Ajouté
import { StructureService } from '../services/structure.service.js'; 
import { authMiddleware } from '../middleware/auth.middleware.js';
import { classeSchema, filiereSchema, niveauSchema } from '../schemas/structure.schema.js';

const structureRoutes = new Hono();
const service = new StructureService();

structureRoutes.use('*', authMiddleware);

// --- Routes Filières ---
structureRoutes.get('/filieres', async (c) => {
  const data = await service.getAllFilieres();
  return c.json({ success: true, data });
});

structureRoutes.post('/filieres', zValidator('json', filiereSchema), async (c) => {
  const { nom } = c.req.valid('json');
  const data = await service.createFiliere(nom);
  return c.json({ success: true, data }, 201);
});

structureRoutes.get('/niveaux', async (c) => {
  const data = await service.getAllNiveaux();
  return c.json({ success: true, data });
});

structureRoutes.post('/niveaux', zValidator('json', niveauSchema), async (c) => {
  const { libelle } = c.req.valid('json');
  const data = await service.createNiveau(libelle);
  return c.json({ success: true, data }, 201);
});
structureRoutes.get('/classes', async (c) => {
  const data = await service.getAllClasses();
  return c.json({ success: true, data });
});

structureRoutes.post('/classes', zValidator('json', classeSchema), async (c) => {
  const { code, filiereId, niveauId } = c.req.valid('json');
  const data = await service.createClasse(code, filiereId, niveauId);
  return c.json({ success: true, data }, 201);
});

export default structureRoutes;