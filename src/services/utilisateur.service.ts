import prisma from '../lib/prisma.js'
import { HTTPException } from 'hono/http-exception'

export class UtilisateurService {
// 1. Modifie cette méthode pour enlever la condition "deletedAt: null"
async getProfesseursActifs() {
    return prisma.utilisateur.findMany({
      where: {
        role: { libelle: { in: ['PROFESSEUR', 'CHEF_DEPARTEMENT', 'CHEF_ETABLISSEMENT'] } },
      },
      select: {
        id: true, nom: true, prenom: true, email: true,
        deletedAt: true,
        statut: { select: { libelle: true, quotaHeureMax: true, quotaPeriode: true } },
        instituts: { select: { id: true, nom: true } },
        role: { select: { libelle: true } },
        // 🔥 AJOUT CRUCIAL : On récupère les cours validés pour calculer la charge !
        enseignements: {
          where: { OR: [{ statutValidation: 'VALIDE' }, { estActif: true }] },
          select: { course: { select: { matiere: { select: { credits: true } } } } }
        }
      },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    })
  }
  // 2. Ajoute cette petite méthode tout en bas de ta classe
  async restoreUser(id: string) {
    return prisma.utilisateur.update({
      where: { id },
      data: { deletedAt: null }, // On enlève la date de suppression
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

    // Un Admin voit tout le monde
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
            include: {
              course: { 
                include: { 
                  matiere: true, 
                  annee: true,
                  classe: {
                    include: {
                      filiere: {
                        include: { instituts: true } 
                      }
                    }
                  }
                } 
              },
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