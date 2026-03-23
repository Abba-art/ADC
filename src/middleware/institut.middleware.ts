import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import prisma from '../lib/prisma.js'

export const institutGuard = async (c: Context, next: Next) => {
  const user = c.get('user')
  if (!user) throw new HTTPException(401, { message: 'Non authentifié' })

  const role = typeof user.role === 'object' ? user.role.libelle : user.role

  // 1. ADMIN → Accès global, on laisse passer
  if (role === 'ADMIN') {
    await next()
    return
  }

  // 2. CHEF_DEPARTEMENT & CHEF_ETABLISSEMENT → Accès restreint à leurs instituts
  if (role === 'CHEF_DEPARTEMENT' || role === 'CHEF_ETABLISSEMENT') {
    const dbUser = await prisma.utilisateur.findUnique({
      where: { id: user.id },
      include: { instituts: { select: { id: true } } },
    })

    const institutIds = dbUser?.instituts.map(i => i.id) || []

    if (institutIds.length === 0) {
      throw new HTTPException(403, { 
        message: `Accès refusé : Aucun institut n'est associé à votre compte ${role}` 
      })
    }

    // On stocke les IDs pour filtrer les requêtes Prisma dans les services
    c.set('institutIds', institutIds)   
    await next()
    return
  }

  // 3. PROFESSEUR → On laisse passer (le filtrage se fera sur leurs propres cours)
  await next()
}