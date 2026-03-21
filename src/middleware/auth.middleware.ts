import { verify } from 'hono/jwt';
import { getCookie } from 'hono/cookie';
import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception'; 

export const authMiddleware = async (c: Context, next: Next) => {
  const token = getCookie(c, 'token');

  if (!token) {
    throw new HTTPException(401, { message: "Accès refusé : Aucun jeton trouvé" });
  }

  try {
    const secret = process.env.JWT_SECRET!;
    const payload = await verify(token, secret, 'HS256');
    
    c.set('user', payload);
    
    await next();
  } catch (err) {
    throw new HTTPException(401, { message: "Session expirée ou invalide" });
  }
};