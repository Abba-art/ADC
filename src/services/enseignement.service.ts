import prisma from '../lib/prisma.js'
import { HTTPException } from 'hono/http-exception'
import type { AssignationInput, ClotureInput } from '../schemas/enseignement.schema.js'
import { Semestre } from '@prisma/client'

export class EnseignementService {

  private getSemestresActifs(): Semestre[] {
    const moisActuel = new Date().getMonth() + 1; 

    if (moisActuel >= 9 || moisActuel <= 2) {
      return [Semestre.S1, Semestre.S3, Semestre.S5]
    } else {
      return [Semestre.S2, Semestre.S4, Semestre.S6]
    }
  }

  private async verifierQuota(utilisateurId: string, creditsNouveauCours: number) {
    const prof = await prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      include: {
        statut: true,
        enseignements: {
          where: { estActif: true },
          include: { course: { include: { matiere: true } } },
        },
      },
    })

    if (!prof || !prof.statut) {
      throw new HTTPException(404, { message: 'Professeur ou statut introuvable' })
    }

    const chargeActuelle = prof.enseignements.reduce((total, ens) => {
      return total + (ens.course?.matiere?.credits ?? 0)
    }, 0)

    const quotaMax = prof.statut.quotaHeureMax

    if (chargeActuelle + creditsNouveauCours > quotaMax) {
      throw new HTTPException(409, {
        message: `Quota dépassé ! Charge : ${chargeActuelle} | Nouveau : ${creditsNouveauCours} | Max : ${quotaMax}`,
      })
    }

    return { chargeActuelle, quotaMax }
  }

  // CORRECTION : On demande maintenant le currentUserRole en paramètre
  async assignerProfesseur(data: AssignationInput, currentUserRole: string) {
    const [prof, course] = await Promise.all([
      prisma.utilisateur.findUnique({
        where: { id: data.utilisateurId },
        include: { statut: true },
      }),
      prisma.course.findUnique({
        where: { id: data.courseId },
        include: {
          matiere: true,
          enseignements: { where: { estActif: true } },
        },
      }),
    ])

    if (!prof) throw new HTTPException(404, { message: 'Professeur introuvable' })
    if (!course) throw new HTTPException(404, { message: 'Cours introuvable' })

    const semestresActifs = this.getSemestresActifs()
    if (!semestresActifs.includes(course.matiere.semestre)) {
      throw new HTTPException(403, { 
        message: `Action refusée. Ce cours est du semestre ${course.matiere.semestre}. Actuellement, seuls les semestres ${semestresActifs.join(', ')} sont ouverts à l'assignation.` 
      })
    }

    if (course.enseignements.length > 0) {
      await prisma.enseignement.updateMany({
        where: { courseId: data.courseId, estActif: true },
        data: {
          estActif: false,
          dateFin: new Date(),
          motif: data.motif ? `Réassignation - ${data.motif}` : 'Réassignation automatique',
        },
      })
    }

    await this.verifierQuota(data.utilisateurId, course.matiere.credits)

    return prisma.enseignement.create({
      data: {
        utilisateurId: data.utilisateurId,
        courseId: data.courseId,
        motif: data.motif,
        estActif: true,
        // CORRECTION : Utilisation de currentUserRole passé depuis le contrôleur
        statutValidation: currentUserRole === 'CHEF_DEPARTEMENT' ? 'PROPOSITION' : 'VALIDE',
        dateDebut: new Date(),
      },
    })
  }

  async cloreEnseignement(data: ClotureInput) {
    const ens = await prisma.enseignement.findUnique({
      where: { id: data.enseignementId },
      include: { course: true },
    })

    if (!ens) throw new HTTPException(404, { message: 'Enseignement introuvable' })
    if (!ens.estActif) throw new HTTPException(400, { message: 'Enseignement déjà clôturé' })

    return prisma.enseignement.update({
      where: { id: data.enseignementId },
      data: {
        estActif: false,
        dateFin: new Date(),
        motif: data.motif || 'Clôture manuelle',
      },
    })
  }

  async getChargeProfesseur(utilisateurId: string) {
    const prof = await prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      include: {
        statut: true,
        enseignements: {
          where: { estActif: true },
          include: {
            course: {
              include: {
                matiere: { select: { nom: true, credits: true, semestre: true } },
                classe: { select: { code: true } },
                annee: { select: { libelle: true } },
              },
            },
          },
        },
      },
    })

    if (!prof) throw new HTTPException(404, { message: 'Professeur introuvable' })

    const chargeActuelle = prof.enseignements.reduce(
      (sum, e) => sum + (e.course?.matiere?.credits || 0),
      0
    )

    const quotaMax = prof.statut.quotaHeureMax

    return {
      professeur: {
        id: prof.id,
        nomComplet: `${prof.prenom} ${prof.nom}`,
        statut: prof.statut.libelle,
      },
      chargeActuelle,
      quotaMax,
      pourcentageUtilise: Math.round((chargeActuelle / quotaMax) * 100),
      enseignements: prof.enseignements,
      reste: quotaMax - chargeActuelle,
    }
  }
}