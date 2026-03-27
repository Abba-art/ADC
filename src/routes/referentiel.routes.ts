import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.middleware.js'
import prisma from '../lib/prisma.js'

const referentielRoutes = new Hono()

referentielRoutes.use('*', authMiddleware)

// Obtenir la liste des Instituts
referentielRoutes.get('/instituts', async (c) => {
  const data = await prisma.institut.findMany({ orderBy: { nom: 'asc' } })
  return c.json({ success: true, data })
})

referentielRoutes.get('/roles', async (c) => {
  const data = await prisma.role.findMany({ 
    where: { libelle: { not: 'ADMIN' } },
    orderBy: { libelle: 'asc' } 
  })
  return c.json({ success: true, data })
})

export default referentielRoutes