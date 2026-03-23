import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { sign } from 'hono/jwt'
import { setCookie } from 'hono/cookie'
import { loginSchema, registerSchema } from '../schemas/auth.schema.js'
import { AuthService } from '../services/auth.service.js'
import { authMiddleware } from '../middleware/auth.middleware.js';
import { HTTPException } from 'hono/http-exception'

type Variables = {
  user: { id: string; role: string | { libelle: string } }
}

const authRoutes = new Hono<{ Variables: Variables }>()
const service = new AuthService()

authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const input = c.req.valid('json')
  const user = await service.register(input)

  return c.json({
    success: true,
    message: 'Compte créé avec succès',
    data: user
  }, 201)
})

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const input = c.req.valid('json')
  const user = await service.login(input)

  const payload = {
    id: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 14) 
  }

  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new HTTPException(500, { message: 'Configuration JWT invalide' })
  }

  const token = await sign(payload, secret)

  setCookie(c, 'token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 60 * 60 * 24 * 14, 
    path: '/'
  })

  return c.json({
    success: true,
    message: 'Connexion réussie',
    data: user
  }, 200)
})

authRoutes.get('/me', authMiddleware, async (c) => {
  const payload = c.get('user');
    const user = await service.getMe(payload.id); 
    return c.json({ success: true, data: user }, 200); 
});

authRoutes.post('/logout', async (c) => {
  setCookie(c, 'token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 0, 
    path: '/',
  });

  return c.json({ success: true, message: "Déconnexion réussie" }, 200);
});

export default authRoutes