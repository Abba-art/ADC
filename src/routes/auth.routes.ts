import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { sign } from 'hono/jwt';
import { setCookie } from 'hono/cookie';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import { AuthService } from '../services/auth.service.js';

const authRoutes = new Hono();
const authService = new AuthService();

authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const data = c.req.valid('json');
  const user = await authService.register(data);
  return c.json({
    success: true,
    message: "Compte créé avec succès",
    data: user
  }, 201);
});

// NOUVELLE ROUTE : LOGIN
authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const data = c.req.valid('json');
  const user = await authService.login(data);

  const payload = {
    id: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  };

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET manquant");
  
  const token = await sign(payload, secret);

  setCookie(c, 'token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return c.json({
    success: true,
    message: "Connexion réussie",
    data: user
  }, 200);
});

export default authRoutes;