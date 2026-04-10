import prisma from '../lib/prisma.js'

export class DashboardService {
  async getStats() {
    const [totalProfs, totalAttributions, attentes, horsQuota] = await Promise.all([
      prisma.utilisateur.count({ where: { role: { libelle: 'PROFESSEUR' }, deletedAt: null } }),
      prisma.attribution.count({ where: { estActif: true } }),
      // Propositions en attente de M. Sonna
      prisma.attribution.count({ where: { statutValidation: 'PROPOSITION', estActif: true } }),
      // Optionnel : Profs qui ont atteint plus de 90% de leur quota
      prisma.utilisateur.count({
        where: { 
            role: { libelle: 'PROFESSEUR' },
            // Logique complexe à faire en SQL brut ou filtrage, restons simple pour le BTS
        }
      })
    ])

    return {
      totalProfesseurs: totalProfs,
      totalAttributions,
      propositionsEnAttente: attentes,
      message: 'Données de synthèse IUG chargées',
    }
  }
}