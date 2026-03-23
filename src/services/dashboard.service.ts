import prisma from '../lib/prisma.js'

export class DashboardService {
  async getStats() {
    const [totalProfesseurs, totalCourses, totalInstituts, totalFilieres] = await Promise.all([
      prisma.utilisateur.count({ where: { role: { libelle: 'PROFESSEUR' }, deletedAt: null } }),
      prisma.course.count({ where: { deletedAt: null } }),
      prisma.institut.count(),
      prisma.filiere.count(),
    ])

    return {
      totalProfesseurs,
      totalCourses,
      totalInstituts,
      totalFilieres,
      message: 'Dashboard chargé avec succès',
    }
  }
}