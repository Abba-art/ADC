import { PrismaClient, QuotaPeriode } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Début du seeding...')

  // ───────────────────────────────────────────────
  // Rôles (Ajout de CHEF_ETABLISSEMENT)
  // ───────────────────────────────────────────────
  const roles = ['ADMIN', 'CHEF_ETABLISSEMENT', 'CHEF_DEPARTEMENT', 'PROFESSEUR']

  for (const libelle of roles) {
    await prisma.role.upsert({
      where: { libelle },
      update: {},
      create: { libelle },
    })
  }

  // ───────────────────────────────────────────────
  // Statuts (avec enum QuotaPeriode typé correctement)
  // ───────────────────────────────────────────────
  const statuts = [
    { libelle: 'PERMANENT', quotaHeureMax: 360, quotaPeriode: QuotaPeriode.ANNEE },
    { libelle: 'VACATAIRE', quotaHeureMax: 96, quotaPeriode: QuotaPeriode.ANNEE },
    { libelle: 'VACATAIRE_SEMESTRE', quotaHeureMax: 48, quotaPeriode: QuotaPeriode.SEMESTRE },
  ]

  for (const s of statuts) {
    await prisma.statut.upsert({
      where: { libelle: s.libelle },
      update: {},
      create: s,
    })
  }

  // ───────────────────────────────────────────────
  // Niveaux (pas de @unique sur libelle → findFirst + create)
  // ───────────────────────────────────────────────
  const niveauxLibelles = [
    'BTS 1', 'BTS 2',
    'Licence 1', 'Licence 2', 'Licence 3',
    'Master 1', 'Master 2'
  ]

  for (const libelle of niveauxLibelles) {
    const existing = await prisma.niveau.findFirst({ where: { libelle } })
    if (!existing) {
      await prisma.niveau.create({ data: { libelle } })
    }
  }

  // ───────────────────────────────────────────────
  // Instituts de démonstration
  // ───────────────────────────────────────────────
  const instituts = [
    { nom: 'ISTA Douala', adresse: 'Douala, Bonanjo' },
    { nom: 'ISA Yaoundé', adresse: 'Yaoundé, Bastos' },
    { nom: 'Institut Universitaire du Golfe', adresse: 'Douala, Bassa' },
  ]

  for (const inst of instituts) {
    await prisma.institut.upsert({
      where: { nom: inst.nom },
      update: {},
      create: inst,
    })
  }

  // ───────────────────────────────────────────────
  // Création d'un Admin par défaut (Optionnel mais recommandé)
  // ───────────────────────────────────────────────
  const adminRole = await prisma.role.findUnique({ where: { libelle: 'ADMIN' } })
  const permanentStatut = await prisma.statut.findUnique({ where: { libelle: 'PERMANENT' } })

  if (adminRole && permanentStatut) {
    const adminEmail = 'admin@mootiv.africa' // À adapter selon ton projet
    const existingAdmin = await prisma.utilisateur.findUnique({ where: { email: adminEmail } })

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10)
      await prisma.utilisateur.create({
        data: {
          nom: 'Admin',
          prenom: 'Système',
          email: adminEmail,
          mdp: hashedPassword,
          idRole: adminRole.id,
          idStatut: permanentStatut.id,
        }
      })
      console.log(`✅ Utilisateur Admin créé: ${adminEmail} (mdp: admin123)`)
    }
  }

  console.log('✅ Seeding terminé avec succès !')
}

main()
  .catch(e => {
    console.error('Erreur seeding :', e)
    process.exit(1)
  })
  .finally(async () => await prisma.$disconnect())