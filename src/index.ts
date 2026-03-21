import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception' // NOUVEAU
import 'dotenv/config'
import authRoutes from './routes/auth.routes.js'
import structureRoutes from './routes/structure.routes.js'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({
  origin: 'http://localhost:5173', 
  credentials: true,
}))

app.onError((err, c) => {
  console.error(`[ERREUR SERVEUR]: ${err.message}`)
  if (err instanceof HTTPException) {
    return c.json({ 
      success: false, 
      message: err.message 
    }, err.status)
  }
  
  const status = 'status' in err ? (err.status as number) : 500
  return c.json({
    success: false,
    message: err.message || "Une erreur interne est survenue",
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
  }, status as any)
})

app.notFound((c) => {
  return c.json({ message: "La ressource demandée n'existe pas" }, 404)
})

app.route('/auth', authRoutes)
app.route('/structure', structureRoutes);

const port = 3000
console.log(`Serveur démarré sur http://localhost:${port}`)

serve({ fetch: app.fetch, port })