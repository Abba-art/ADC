import prisma from '../lib/prisma.js'
import { HTTPException } from 'hono/http-exception'
import type { AssignationInput } from '../schemas/attribution.schema.js'

export class AttributionService {
  
  // Ratio légal: 1 Crédit = 15 Heures de charge horaire
  private readonly RATIO_HEURES = 15;

  // 1. Vérification automatique du Quota PAR ANNÉE
  private async verifierQuota(utilisateurId: string, nouveauxCredits: number, anneeId: number) {
    const prof = await prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      include: { 
        statut: true, 
        // 🔥 CORRECTION : On ne récupère que les attributions de l'année sélectionnée !
        attributions: { 
          where: { estActif: true, statutValidation: 'VALIDE', anneeId: anneeId }, 
          include: { matiere: true } 
        } 
      }
    });

    if (!prof || !prof.statut) throw new HTTPException(404, { message: "Profil enseignant incomplet (Statut manquant)" });

    // Calcul de la charge en HEURES (Crédits * 15)
    const totalCreditsActuels = prof.attributions.reduce((sum, a) => sum + a.matiere.credits, 0);
    const chargeActuelleHeures = totalCreditsActuels * this.RATIO_HEURES;
    const heuresProjetees = nouveauxCredits * this.RATIO_HEURES;
    const limite = prof.statut.quotaHeureMax;

    if (chargeActuelleHeures + heuresProjetees > limite) {
      throw new HTTPException(409, { 
        message: `Quota dépassé pour cette année ! Charge actuelle: ${chargeActuelleHeures}h, Limite: ${limite}h. Impossible d'ajouter ces ${heuresProjetees}h.` 
      });
    }
  }

  async assignerProfesseur(data: AssignationInput, currentUserRole: string) {
    const [matiere, classe] = await Promise.all([
      prisma.matiere.findUnique({ where: { id: data.matiereId }, include: { departements: true } }),
      prisma.classe.findUnique({ where: { id: data.classeId } })
    ]);

    if (!matiere || !classe) throw new HTTPException(404, { message: 'Matière ou Classe introuvable' });

    // 🔥 CORRECTION : On passe l'année pour le calcul du quota
    await this.verifierQuota(data.utilisateurId, matiere.credits, data.anneeId);

    if (!matiere.departements.some(d => d.id === classe.departementId)) {
      throw new HTTPException(403, { message: "Action refusée : Matière hors département." });
    }

    await prisma.attribution.updateMany({
      where: { matiereId: data.matiereId, classeId: data.classeId, anneeId: data.anneeId, estActif: true },
      data: { estActif: false, dateFin: new Date(), motif: "Réattribution / Remplacement" }
    });

    return prisma.attribution.create({
      data: {
        ...data,
        estActif: true,
        // Workflow : Le Chef de Dép propose, l'Admin/Directeur valide direct
        statutValidation: currentUserRole === 'CHEF_DEPARTEMENT' ? 'PROPOSITION' : 'VALIDE',
      }
    });
  }

  // 2. Méthode de Validation pour la Direction
  async traiterProposition(id: string, decision: 'VALIDE' | 'REJETE') {
    return prisma.attribution.update({
      where: { id },
      data: { statutValidation: decision }
    });
  }

  // 3. Reconduction (Année X -> Année X+1)
  async reconduireAnnee(anneeSourceId: number, anneeCibleId: number) {
    // Récupérer toutes les attributions VALIDÉES de l'année source
    const sourceAttributions = await prisma.attribution.findMany({
      where: { anneeId: anneeSourceId, statutValidation: 'VALIDE', estActif: true }
    });

    if (sourceAttributions.length === 0) {
      throw new HTTPException(400, { message: "Aucune attribution valide trouvée pour l'année source." });
    }

    let count = 0;
    for (const attr of sourceAttributions) {
      const exists = await prisma.attribution.findFirst({
        where: {
          utilisateurId: attr.utilisateurId,
          matiereId: attr.matiereId,
          classeId: attr.classeId,
          anneeId: anneeCibleId
        }
      });

      if (!exists) {
        await prisma.attribution.create({
          data: {
            utilisateurId: attr.utilisateurId,
            matiereId: attr.matiereId,
            classeId: attr.classeId,
            anneeId: anneeCibleId,
            // 🔥 CORRECTION : La reconduction passe directement en VALIDE
            statutValidation: 'VALIDE', 
            estActif: true,
            motif: "Reconduction automatique"
          }
        });
        count++;
      }
    }
    return { count };
  }

  // 4. 🔥 NOUVEAU : Suivi des reconductions
  async getSuiviReconduction(anneeCibleId: number) {
    // On récupère toutes les attributions de l'année cible qui ont le motif "Reconduction automatique"
    return prisma.attribution.findMany({
      where: { 
        anneeId: anneeCibleId, 
        motif: "Reconduction automatique",
        estActif: true
      },
      include: {
        utilisateur: { select: { nom: true, prenom: true, email: true } },
        matiere: { select: { nom: true, code: true, credits: true } },
        classe: { select: { code: true } }
      },
      orderBy: { utilisateur: { nom: 'asc' } }
    });
  }
}