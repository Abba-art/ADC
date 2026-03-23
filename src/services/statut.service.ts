  import prisma from '../lib/prisma.js';

  export class StatutService {
    async getAll() {
      return await prisma.statut.findMany();
    }

    async updateQuota(id: number, newQuota: number) {
      return await prisma.statut.update({
        where: { id },
        data: { quotaHeureMax: newQuota }
      });
    }
  }