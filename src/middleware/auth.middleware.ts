import { verify } from 'hono/jwt'
import { getCookie } from 'hono/cookie'
import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'

export const authMiddleware = async (c: Context, next: Next) => {
  const token = getCookie(c, 'token')

  if (!token) {
    throw new HTTPException(401, { message: 'Accès refusé : aucun jeton fourni' })
  }

  try {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new HTTPException(500, { message: 'Configuration serveur invalide (JWT_SECRET manquant)' })
    }

    const payload = await verify(token, secret , 'HS256')

    // On stocke l'utilisateur décodé dans le context
    c.set('user', payload)

    await next()
  } catch (err) {
    throw new HTTPException(401, { message: 'Session invalide ou expirée' })
    return await next();
  }
}