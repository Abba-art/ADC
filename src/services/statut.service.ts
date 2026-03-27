import prisma from '../lib/prisma.js';
import { QuotaPeriode } from '@prisma/client';

export class StatutService {
  async getAll() {
    return await prisma.statut.findMany({
      include: {
        _count: {
          select: { utilisateurs: true }
        }
      }
    });
  }

  // 🔥 REMPLACEMENT DE string PAR QuotaPeriode
  async update(id: number, data: { quotaHeureMax?: number; quotaPeriode?: QuotaPeriode }) {
    return await prisma.statut.update({
      where: { id },
      data: data
    });
  }
}