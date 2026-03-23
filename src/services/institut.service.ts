import prisma from '../lib/prisma.js'
import { HTTPException } from 'hono/http-exception'

export class InstitutService {
  async createInstitut(data: { nom: string; adresse?: string }) {
    const existing = await prisma.institut.findUnique({ where: { nom: data.nom.trim() } })
    if (existing) throw new HTTPException(409, { message: 'Cet institut existe déjà' })

    return prisma.institut.create({
      data: { nom: data.nom.trim(), adresse: data.adresse?.trim() },
    })
  }

  async getAllInstituts() {
    return prisma.institut.findMany({
      include: { _count: { select: { utilisateurs: true, filieres: true } } },
      orderBy: { nom: 'asc' },
    })
  }

  async updateInstitut(id: number, data: { nom?: string; adresse?: string }) {
    return prisma.institut.update({
      where: { id },
      data,
    })
  }

  async deleteInstitut(id: number) {
    return prisma.institut.delete({ where: { id } })
  }
}