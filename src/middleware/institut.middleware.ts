import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import prisma from '../lib/prisma.js'

export const institutGuard = async (c: Context, next: Next) => {
  const user = c.get('user')
  if (!user) throw new HTTPException(401, { message: 'Non authentifié' })

  const role = typeof user.role === 'object' ? user.role.libelle : user.role

  if (role === 'ADMIN') {
    await next()
    return
  }

  if (role === 'CHEF_DEPARTEMENT' || role === 'CHEF_ETABLISSEMENT') {
    const dbUser = await prisma.utilisateur.findUnique({
      where: { id: user.id },
      include: { 
        instituts: { select: { id: true } },
        // 🔥 CORRECTION : On récupère aussi l'institut via le département pour le Chef de Dép !
        departements: { select: { institutId: true } } 
      },
    })

    const directInsts = dbUser?.instituts.map(i => i.id) || []
    const depInsts = dbUser?.departements.map(d => d.institutId) || []
    // On fusionne les IDs d'instituts (Directs + Via Départements) sans doublons
    const institutIds = Array.from(new Set([...directInsts, ...depInsts]))

    if (institutIds.length === 0) {
      throw new HTTPException(403, { 
        message: `Accès refusé : Aucun institut n'est associé à votre compte ${role}` 
      })
    }

    c.set('institutIds', institutIds)   
    await next()
    return
  }

  await next()
}