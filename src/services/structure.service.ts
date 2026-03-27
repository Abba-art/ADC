import prisma from '../lib/prisma.js'
import { HTTPException } from 'hono/http-exception'
import type { courseSchema, matiereSchema } from '../schemas/structure.schema.js'
import type z from 'zod'

export class StructureService {
  // ───────────── Filières ─────────────
  async createFiliere(nom: string, institutId: number) {
    const normalized = nom.trim().toUpperCase()
    const existing = await prisma.filiere.findFirst({ where: { nom: normalized } })
    if (existing) throw new HTTPException(409, { message: `La filière "${normalized}" existe déjà` })

    return prisma.filiere.create({
      data: {
        nom: normalized,
        instituts: { connect: { id: institutId } }
      },
    })
  }
  async getAllFilieres() {
    return prisma.filiere.findMany({
      include: {
        instituts: { select: { id: true, nom: true } },
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
  async createClasse(code: string, filiereId: number, niveauId: number) {
    const normalizedCode = code.trim().toUpperCase()

    // Vérification existence filière & niveau
    const filiere = await prisma.filiere.findUnique({ where: { id: filiereId } })
    if (!filiere) throw new HTTPException(404, { message: 'Filière introuvable' })

    const niveau = await prisma.niveau.findUnique({ where: { id: niveauId } })
    if (!niveau) throw new HTTPException(404, { message: 'Niveau introuvable' })

    const existing = await prisma.classe.findFirst({
      where: { code: normalizedCode, filiereId, niveauId },
    })
    if (existing) {
      throw new HTTPException(409, { message: `Cette classe existe déjà dans cette filière/niveau` })
    }

    return prisma.classe.create({
      data: { code: normalizedCode, filiereId, niveauId },
      include: { filiere: { select: { nom: true } }, niveau: true },
    })
  }

  async getAllClasses(role: string, institutIds: number[] = [], filiereId?: number) {
    const where: any = { deletedAt: null }

    if ((role === 'CHEF_DEPARTEMENT' || role === 'CHEF_ETABLISSEMENT') && institutIds.length > 0) {
      where.filiere = { instituts: { some: { id: { in: institutIds } } } }
    }

    if (filiereId) where.filiereId = filiereId; // NOUVEAU FILTRE DYNAMIQUE

    return prisma.classe.findMany({
      where,
      include: {
        filiere: { select: { nom: true } },
        niveau: { select: { libelle: true } },
        _count: { select: { courses: true } },
      },
      orderBy: [{ filiere: { nom: 'asc' } }, { code: 'asc' }],
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

  // ───────────── Matières ─────────────
  async createMatiere(data: z.infer<typeof matiereSchema>) {
    const { code, nom, credits, semestre, filiereId } = data

    const filiere = await prisma.filiere.findUnique({ where: { id: filiereId } })
    if (!filiere) throw new HTTPException(404, { message: 'Filière introuvable' })

    const existing = await prisma.matiere.findFirst({
      where: { code, filiereId },
    })
    if (existing) {
      throw new HTTPException(409, { message: `Matière avec code ${code} existe déjà dans cette filière` })
    }

    return prisma.matiere.create({
      data: { code, nom, credits, semestre, filiereId },
      include: { filiere: { select: { nom: true } } },
    })
  }

  async getAllMatieres(role: string, institutIds: number[] = [], filiereId?: number) {
    const where: any = {}

    if ((role === 'CHEF_DEPARTEMENT' || role === 'CHEF_ETABLISSEMENT') && institutIds.length > 0) {
      where.filiere = { instituts: { some: { id: { in: institutIds } } } }
    }

    if (filiereId) where.filiereId = filiereId;

    return prisma.matiere.findMany({
      where,
      include: { filiere: { select: { nom: true } } },
      orderBy: [{ filiere: { nom: 'asc' } }, { semestre: 'asc' }, { code: 'asc' }],
    })
  }
  // ───────────── Courses (Cours = Matière + Classe + Année) ─────────────
  async createCourse(data: z.infer<typeof courseSchema>) {
    const { matiereId, classeId, anneeId } = data

    // Vérifications existence
    const matiere = await prisma.matiere.findUnique({ where: { id: matiereId } })
    if (!matiere) throw new HTTPException(404, { message: 'Matière introuvable' })

    const classe = await prisma.classe.findUnique({ where: { id: classeId } })
    if (!classe) throw new HTTPException(404, { message: 'Classe introuvable' })

    const annee = await prisma.anneeAcademique.findUnique({ where: { id: anneeId } })
    if (!annee) throw new HTTPException(404, { message: 'Année académique introuvable' })

    // Unicité déjà gérée par @@unique dans Prisma → on laisse Prisma lever l'erreur si doublon
    return prisma.course.create({
      data: { matiereId, classeId, anneeId },
      include: {
        matiere: { select: { code: true, nom: true, semestre: true } },
        classe: { select: { code: true } },
        annee: { select: { libelle: true } },
      },
    })
  }

  async getAllCourses(role: string, institutIds: number[] = [], classeId?: number, anneeId?: number, nonAssigne?: boolean) {
    const where: any = { deletedAt: null }

    if ((role === 'CHEF_DEPARTEMENT' || role === 'CHEF_ETABLISSEMENT') && institutIds.length > 0) {
      where.classe = { filiere: { instituts: { some: { id: { in: institutIds } } } } }
    }

    if (classeId) where.classeId = classeId;
    if (anneeId) where.anneeId = anneeId;

    // NOUVEAU : On filtre pour n'avoir que les cours sans enseignant actif
    if (nonAssigne) {
      where.enseignements = {
        none: { estActif: true }
      }
    }

    return prisma.course.findMany({
      where,
      include: {
        matiere: { select: { code: true, nom: true, semestre: true, credits: true } }, // Ajout des crédits utiles pour le front
        classe: { select: { code: true } },
        annee: { select: { libelle: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

  }
  // --- MÉTHODES DE MISE À JOUR (PATCH) ---
  async updateFiliere(id: number, nom: string, institutId?: number) {
    const dataToUpdate: any = { nom: nom.trim().toUpperCase() };
    if (institutId) {
      // "set" remplace les anciens instituts par le nouveau (simule du One-To-Many)
      dataToUpdate.instituts = { set: [{ id: institutId }] };
    }
    return prisma.filiere.update({ where: { id }, data: dataToUpdate });
  }

  async updateNiveau(id: number, libelle: string) {
    return prisma.niveau.update({ where: { id }, data: { libelle: libelle.trim() } });
  }

  async updateClasse(id: number, data: { code?: string, filiereId?: number, niveauId?: number }) {
    if (data.code) data.code = data.code.trim().toUpperCase();
    return prisma.classe.update({ where: { id }, data });
  }

  async updateMatiere(id: number, data: any) {
    return prisma.matiere.update({ where: { id }, data });
  }

  async deleteNiveau(id: number) {
    return prisma.niveau.delete({ where: { id } });
  }

  async deleteMatiere(id: number) {
    return prisma.matiere.delete({ where: { id } });
  }
}