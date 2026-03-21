import prisma from '../lib/prisma.js';

export class StructureService {
  async createFiliere(nom: string) {
    return await prisma.filiere.create({ data: { nom: nom.toUpperCase() } });
  }
  async getAllFilieres() {
    return await prisma.filiere.findMany({ include: { _count: { select: { classes: true } } } });
  }

  async createNiveau(libelle: string) {
    return await prisma.niveau.create({ data: { libelle } });
  }

  async getAllNiveaux() {
    return await prisma.niveau.findMany();
  }
  async createClasse(code: string, filiereId: number, niveauId: number) {
  return await prisma.classe.create({
    data: {
      code: code.toUpperCase(),
      filiereId,
      niveauId
    },
    include: {
      filiere: true,
      niveau: true
    }
  });
}

async getAllClasses() {
  return await prisma.classe.findMany({
    include: {
      filiere: { select: { nom: true } },
      niveau: { select: { libelle: true } }
    }
  });
}
}
