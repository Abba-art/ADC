import prisma from '../lib/prisma.js'
import { HTTPException } from 'hono/http-exception'

export class UtilisateurService {
  async getProfesseursActifs() {
    return prisma.utilisateur.findMany({
      where: {
        role: { libelle: { in: ['PROFESSEUR', 'CHEF_DEPARTEMENT'] } },
        deletedAt: null,
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        statut: {
          select: {
            libelle: true,
            quotaHeureMax: true,
            quotaPeriode: true,
          },
        },
        instituts: { select: { id: true, nom: true } },
      },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    })
  }

  async getAllUtilisateurs(currentUserRole: string, currentUserInstitutIds: number[] = []) {
    const where: any = { deletedAt: null }

    // Filtrage automatique pour le CHEF_DEPARTEMENT
    if (currentUserRole === 'CHEF_DEPARTEMENT' && currentUserInstitutIds.length > 0) {
      where.instituts = { some: { id: { in: currentUserInstitutIds } } }
    }

    return prisma.utilisateur.findMany({
      where,
      include: {
        role: { select: { libelle: true } },
        statut: true,
        instituts: { select: { id: true, nom: true } },
      },
      orderBy: { nom: 'asc' },
    })
  }

  async getUtilisateurById(id: string, withCharge = false) {
    const user = await prisma.utilisateur.findUnique({
      where: { id },
      include: {
        role: true,
        statut: true,
        instituts: true,
        ...(withCharge && {
          enseignements: {
            where: { estActif: true },
            include: {
              course: { include: { matiere: true, classe: true, annee: true } },
            },
          },
        }),
      },
    })

    if (!user) throw new HTTPException(404, { message: 'Utilisateur non trouvé' })
    if (user.deletedAt) throw new HTTPException(410, { message: 'Compte désactivé' })

    return user
  }

  async updateUser(id: string, data: any) {
    return prisma.utilisateur.update({
      where: { id },
      data,
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        role: { select: { libelle: true } },
        statut: true,
      },
    })
  }

  async softDelete(id: string) {
    return prisma.utilisateur.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }
}