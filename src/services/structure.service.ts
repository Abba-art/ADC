import prisma from '../lib/prisma.js'
import { HTTPException } from 'hono/http-exception'
import type { matiereSchema } from '../schemas/structure.schema.js'
import type z from 'zod'

export class StructureService {

// Remplacer createDepartement
async createDepartement(nom: string, institutId: number, chefId: string) {
  const normalized = nom.trim().toUpperCase()
  const existing = await prisma.departement.findFirst({ where: { nom: normalized } })
  if (existing) throw new HTTPException(409, { message: `Le département "${normalized}" existe déjà` })

  return prisma.departement.create({
    data: {
      nom: normalized,
      institutId: institutId,
      utilisateurs: { connect: { id: chefId } } // 🔥 ON RELIE LE CHEF ICI
    },
  })
}

// Remplacer getAllDepartements
async getAllDepartements() {
    return prisma.departement.findMany({
      include: {
        institut: { select: { id: true, nom: true } },
        utilisateurs: { select: { id: true, nom: true, prenom: true } }, 
        _count: { select: { classes: true, matieres: true } }
      },
      orderBy: { nom: 'asc' },
    })
  }
  // ───────────── Niveaux ─────────────
  async createNiveau(libelle: string) {
    const normalized = libelle.trim()
    const existing = await prisma.niveau.findFirst({ where: { libelle: normalized } })
    if (existing) {
      throw new HTTPException(409, { message: `Le niveau "${normalized}" existe déjà` })
    }
    return prisma.niveau.create({ data: { libelle: normalized } })
  }

  async getAllNiveaux() {
    return prisma.niveau.findMany({ orderBy: { libelle: 'asc' } })
  }

  // ───────────── Classes ─────────────
  async createClasse(code: string, departementId: number, niveauId: number) {
    const normalizedCode = code.trim().toUpperCase()

    const dep = await prisma.departement.findUnique({ where: { id: departementId } })
    if (!dep) throw new HTTPException(404, { message: 'Département introuvable' })

    const niveau = await prisma.niveau.findUnique({ where: { id: niveauId } })
    if (!niveau) throw new HTTPException(404, { message: 'Niveau introuvable' })

    const existing = await prisma.classe.findFirst({
      where: { code: normalizedCode, departementId, niveauId },
    })
    if (existing) {
      throw new HTTPException(409, { message: `Cette classe existe déjà dans ce département/niveau` })
    }

    return prisma.classe.create({
      data: { code: normalizedCode, departementId, niveauId },
      include: { departement: { select: { nom: true } }, niveau: true },
    })
  }

  async getAllClasses(role: string, institutIds: number[] = [], departementId?: number) {
    const where: any = { deletedAt: null }

    if ((role === 'CHEF_DEPARTEMENT' || role === 'CHEF_ETABLISSEMENT') && institutIds.length > 0) {
      where.departement = { institutId: { in: institutIds } }
    }

    if (departementId) where.departementId = departementId;

    return prisma.classe.findMany({
      where,
      include: {
        departement: { select: { nom: true } },
        niveau: { select: { libelle: true } },
        _count: { select: { attributions: true } }, // On compte les attributions maintenant
      },
      orderBy: [{ departement: { nom: 'asc' } }, { code: 'asc' }],
    })
  }

  // ───────────── Années académiques ─────────────
  async createAnneeAcademique(libelle: string) {
    const normalized = libelle.trim()
    const existing = await prisma.anneeAcademique.findUnique({ where: { libelle: normalized } })
    if (existing) {
      throw new HTTPException(409, { message: `Année ${normalized} déjà enregistrée` })
    }
    return prisma.anneeAcademique.create({ data: { libelle: normalized } })
  }

  async getAllAnneesAcademiques() {
    return prisma.anneeAcademique.findMany({
      orderBy: { libelle: 'desc' },
    })
  }

  // ───────────── Matières (Avec gestion Many-to-Many) ─────────────
  async createMatiere(data: any) {
    const { code, nom, credits, semestre, departementId } = data

    const existing = await prisma.matiere.findUnique({ where: { code } })
    if (existing) {
      throw new HTTPException(409, { message: `Une matière avec le code ${code} existe déjà` })
    }

    return prisma.matiere.create({
      data: { 
        code, 
        nom, 
        credits, 
        semestre, 
        departements: { connect: { id: departementId } } // Utilise la relation Many-to-Many
      },
      include: { departements: true },
    })
  }

  async getAllMatieres(role: string, institutIds: number[] = [], departementId?: number) {
    const where: any = {}

    if ((role === 'CHEF_DEPARTEMENT' || role === 'CHEF_ETABLISSEMENT') && institutIds.length > 0) {
      where.departements = { some: { institutId: { in: institutIds } } }
    }

    if (departementId) {
        where.departements = { some: { id: departementId } }
    }

    return prisma.matiere.findMany({
      where,
      include: { departements: { select: { nom: true } } },
      orderBy: { nom: 'asc' },
    })
  }

  // ───────────── Méthodes de mise à jour ─────────────
  async updateDepartement(id: number, nom: string, institutId?: number) {
    const dataToUpdate: any = { nom: nom.trim().toUpperCase() };
    if (institutId) dataToUpdate.institutId = institutId;
    
    return prisma.departement.update({ where: { id }, data: dataToUpdate });
  }

  async updateClasse(id: number, data: { code?: string, departementId?: number, niveauId?: number }) {
    if (data.code) data.code = data.code.trim().toUpperCase();
    return prisma.classe.update({ where: { id }, data });
  }

  async updateMatiere(id: number, data: any) {
    // Si on change le département, on utilise "set" pour la relation Many-to-Many
    if (data.departementId) {
        const { departementId, ...rest } = data;
        return prisma.matiere.update({
            where: { id },
            data: {
                ...rest,
                departements: { set: [{ id: departementId }] }
            }
        });
    }
    return prisma.matiere.update({ where: { id }, data });
  }

  async deleteDepartement(id: number) {
    return prisma.departement.delete({ where: { id } });
  }

  async deleteNiveau(id: number) {
    return prisma.niveau.delete({ where: { id } });
  }

  async deleteMatiere(id: number) {
    return prisma.matiere.delete({ where: { id } });
  }
}