  import type { Context, Next } from 'hono'
  import { HTTPException } from 'hono/http-exception'

  export const requireRole = (allowedRoles: string[]) => {
    return async (c: Context, next: Next) => {
      const user = c.get('user')

      if (!user) {
        throw new HTTPException(401, { message: 'Accès refusé : non authentifié' })
      }

      // Normalisation du rôle (string ou { libelle: string })
      const userRole = typeof user.role === 'object' && user.role?.libelle
        ? user.role.libelle
        : user.role

      if (!userRole || !allowedRoles.includes(userRole)) {
        throw new HTTPException(403, {
          message: `Accès interdit. Rôle requis : ${allowedRoles.join(' ou ')}`
        })
      }

      await next()
    }
  }