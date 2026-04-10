import { PrismaClient, QuotaPeriode, Semestre, StatutValidation } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Démarrage du Super-Seeder pour la démo de M. Sonna...')

  // 1. RÔLES & STATUTS
  const roles = ['ADMIN', 'CHEF_ETABLISSEMENT', 'CHEF_DEPARTEMENT', 'PROFESSEUR']
  for (const libelle of roles) {
    await prisma.role.upsert({ where: { libelle }, update: {}, create: { libelle } })
  }

  const statuts = [
    { libelle: 'PERMANENT', quotaHeureMax: 360, quotaPeriode: QuotaPeriode.ANNEE },
    { libelle: 'VACATAIRE', quotaHeureMax: 96, quotaPeriode: QuotaPeriode.ANNEE },
  ]
  for (const s of statuts) {
    await prisma.statut.upsert({ where: { libelle: s.libelle }, update: {}, create: s })
  }

  // 2. ANNÉES, INSTITUT, DÉPARTEMENT & NIVEAU
  const anneePrecedente = await prisma.anneeAcademique.upsert({ where: { libelle: '2024-2025' }, update: {}, create: { libelle: '2024-2025' } })
  const anneeCourante = await prisma.anneeAcademique.upsert({ where: { libelle: '2025-2026' }, update: {}, create: { libelle: '2025-2026' } })

  const ista = await prisma.institut.upsert({ where: { nom: 'ISTA' }, update: {}, create: { nom: 'ISTA', adresse: 'Douala, IUG' } })
  const bts1 = await prisma.niveau.upsert({ where: { id: 1 }, update: { libelle: 'BTS 1' }, create: { libelle: 'BTS 1' } })
  
  const depInfo = await prisma.departement.upsert({ 
    where: { nom: 'INFORMATIQUE' }, 
    update: {}, 
    create: { nom: 'INFORMATIQUE', institutId: ista.id } 
  })

  // 3. CLASSES & MATIÈRES
  const classeGL = await prisma.classe.upsert({
    where: { code: 'GL1AJ' },
    update: {},
    create: { code: 'GL1AJ', departementId: depInfo.id, niveauId: bts1.id }
  })

  const algo = await prisma.matiere.upsert({
    where: { code: 'ALG101' },
    update: {},
    create: { code: 'ALG101', nom: 'ALGORITHMIQUE', credits: 4, semestre: Semestre.S1, departements: { connect: [{ id: depInfo.id }] } }
  })

  const bdd = await prisma.matiere.upsert({
    where: { code: 'BDD101' },
    update: {},
    create: { code: 'BDD101', nom: 'BASES DE DONNÉES', credits: 4, semestre: Semestre.S1, departements: { connect: [{ id: depInfo.id }] } }
  })

  // 4. CRÉATION DES COMPTES DE DÉMO (Mdp: Abba2006)
  const password = await bcrypt.hash('Abba2006', 10)
  const roleAdmin = await prisma.role.findUnique({ where: { libelle: 'ADMIN' } })
  const roleDir = await prisma.role.findUnique({ where: { libelle: 'CHEF_ETABLISSEMENT' } })
  const roleChef = await prisma.role.findUnique({ where: { libelle: 'CHEF_DEPARTEMENT' } })
  const roleProf = await prisma.role.findUnique({ where: { libelle: 'PROFESSEUR' } })
  const stPerm = await prisma.statut.findUnique({ where: { libelle: 'PERMANENT' } })

  // Comptes tests
  await prisma.utilisateur.upsert({ where: { email: 'iabba1374@gmail.com' }, update: {}, create: { nom: 'Djibril', prenom: 'Abba', email: 'iabba1374@gmail.com', mdp: password, idRole: roleAdmin!.id, idStatut: stPerm!.id } })
  await prisma.utilisateur.upsert({ where: { email: 'directeur@iug.com' }, update: {}, create: { nom: 'Sonna', prenom: 'Directeur', email: 'directeur@iug.com', mdp: password, idRole: roleDir!.id, idStatut: stPerm!.id, instituts: { connect: [{ id: ista.id }] } } })
  await prisma.utilisateur.upsert({ where: { email: 'chefdep@iug.com' }, update: {}, create: { nom: 'Chef', prenom: 'Info', email: 'chefdep@iug.com', mdp: password, idRole: roleChef!.id, idStatut: stPerm!.id, departements: { connect: [{ id: depInfo.id }] } } }) // Chef de département lié au département info
  
  const prof1 = await prisma.utilisateur.upsert({ where: { email: 'dongmo@iug.com' }, update: {}, create: { nom: 'Dongmo', prenom: 'Professeur', email: 'dongmo@iug.com', mdp: password, idRole: roleProf!.id, idStatut: stPerm!.id } })

  // 5. HISTORIQUE : ATTRIBUTIONS DIRECTES
  await prisma.attribution.createMany({
    data: [
      { utilisateurId: prof1.id, matiereId: algo.id, classeId: classeGL.id, anneeId: anneePrecedente.id, statutValidation: StatutValidation.VALIDE, estActif: true },
      { utilisateurId: prof1.id, matiereId: bdd.id, classeId: classeGL.id, anneeId: anneePrecedente.id, statutValidation: StatutValidation.VALIDE, estActif: true }
    ]
  })

  console.log('✅ Base de données initialisée ! Prêt pour la soutenance.')
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => await prisma.$disconnect())