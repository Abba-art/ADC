import { PrismaClient, QuotaPeriode } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Début du seeding des données de référence...')

  // ───────────────────────────────────────────────
  // 1. RÔLES SYSTÈME
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
  // 2. STATUTS ET QUOTAS
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
  // 3. NIVEAUX D'ÉTUDE
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
  // 4. INSTITUTS DE BASE
  // ───────────────────────────────────────────────
  const instituts = [
    { nom: 'ISTA', adresse: 'Douala, Bonanjo' },
    { nom: 'ISA', adresse: 'Yaoundé, Bastos' },
    { nom: 'ESG', adresse: 'Douala, Bassa' },
  ]
  for (const inst of instituts) {
    await prisma.institut.upsert({
      where: { nom: inst.nom },
      update: {},
      create: inst,
    })
  }

  // ───────────────────────────────────────────────
  // 5. COMPTE ADMINISTRATEUR PRINCIPAL
  // ───────────────────────────────────────────────
  const adminRole = await prisma.role.findUnique({ where: { libelle: 'ADMIN' } })
  const permanentStatut = await prisma.statut.findUnique({ where: { libelle: 'PERMANENT' } })

  if (adminRole && permanentStatut) {
    const adminEmail = 'iabba1374@gmail.com'
    const existingAdmin = await prisma.utilisateur.findUnique({ where: { email: adminEmail } })

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('Abba2006', 10)
      await prisma.utilisateur.create({
        data: {
          nom: 'Djibril',
          prenom: 'Abba',
          email: adminEmail,
          mdp: hashedPassword,
          idRole: adminRole.id,
          idStatut: permanentStatut.id,
        }
      })
      console.log(`✅ Administrateur créé avec succès : ${adminEmail}`)
    } else {
      console.log(`ℹ️ L'Administrateur ${adminEmail} existe déjà.`)
    }
  }

  console.log('✅ Base de données initialisée ! Le terrain est prêt pour tes tests Frontend.')
}

main()
  .catch(e => {
    console.error('❌ Erreur lors du seeding :', e)
    process.exit(1)
  })
  .finally(async () => await prisma.$disconnect())