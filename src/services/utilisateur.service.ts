import prisma from '../lib/prisma.js'
import { HTTPException } from 'hono/http-exception'

export class UtilisateurService {

  // 🔥 CORRECTION : Le Chef ne doit recevoir QUE les cours validés pour calculer la jauge exacte
  async getProfesseursActifs(anneeId?: number) {
    return prisma.utilisateur.findMany({
      where: {
        role: { libelle: { in: ['PROFESSEUR', 'CHEF_DEPARTEMENT', 'CHEF_ETABLISSEMENT'] } },
        deletedAt: null // Un prof désactivé ne doit pas être assignable
      },
      select: {
        id: true, nom: true, prenom: true, email: true,
        deletedAt: true,
        statut: { select: { libelle: true, quotaHeureMax: true, quotaPeriode: true } },
        instituts: { select: { id: true, nom: true } },
        role: { select: { libelle: true } },
        attributions: {
          where: { 
            estActif: true,
            statutValidation: 'VALIDE', // <-- STRICTEMENT VALIDE ICI
            ...(anneeId ? { anneeId: anneeId } : {}) 
          },
          select: { matiere: { select: { credits: true } } }
        }
      },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    })
  }

  async restoreUser(id: string) {
    return prisma.utilisateur.update({
      where: { id },
      data: { deletedAt: null }, 
    })
  }

  async getAllUtilisateurs(currentUserRole: string, currentUserInstitutIds: number[] = []) {
    const where: any = { deletedAt: null }

    if (
      (currentUserRole === 'CHEF_DEPARTEMENT' || currentUserRole === 'CHEF_ETABLISSEMENT') 
      && currentUserInstitutIds.length > 0
    ) {
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

  // 🔥 CORRECTION : Le profil complet ramène TOUTES les attributions actives (Validées, Rejetées, En attente)
  async getUtilisateurById(id: string, withCharge = false, anneeId?: number) {
    const user = await prisma.utilisateur.findUnique({
      where: { id },
      include: {
        role: true,
        statut: true,
        instituts: true,
        ...(withCharge && {
          attributions: {
            where: { 
              estActif: true, 
              ...(anneeId ? { anneeId: anneeId } : {}) 
            },
            include: {
              matiere: true,
              annee: true,
              classe: true
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
    const userExists = await prisma.utilisateur.findUnique({ where: { id } });
    if (!userExists) throw new HTTPException(404, { message: "L'utilisateur n'existe pas." });

    return prisma.utilisateur.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getDeletedUsers() {
    return prisma.utilisateur.findMany({
      where: { NOT: { deletedAt: null } },
      include: { role: true, statut: true }
    })
  }
}