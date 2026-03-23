import bcrypt from 'bcrypt'
import prisma from '../lib/prisma.js'
import { type RegisterInput, type LoginInput } from '../schemas/auth.schema.js'
import { HTTPException } from 'hono/http-exception'

export class AuthService {
  async register(data: RegisterInput) {
    const existing = await prisma.utilisateur.findUnique({
      where: { email: data.email }
    })

    if (existing) {
      throw new HTTPException(409, { message: 'Cet email est déjà utilisé' })
    }

    // Rôle par défaut → PROFESSEUR
    let roleId = data.idRole
    if (!roleId) {
      const defaultRole = await prisma.role.findUnique({
        where: { libelle: 'PROFESSEUR' }
      })
      if (!defaultRole) {
        throw new HTTPException(500, { message: 'Rôle par défaut PROFESSEUR introuvable' })
      }
      roleId = defaultRole.id
    }

    // Statut par défaut → VACATAIRE
    let statutId = data.idStatut
    if (!statutId) {
      const defaultStatut = await prisma.statut.findUnique({
        where: { libelle: 'VACATAIRE' }
      })
      if (!defaultStatut) {
        throw new HTTPException(500, { message: 'Statut par défaut VACATAIRE introuvable' })
      }
      statutId = defaultStatut.id
    }

    const hashedPassword = await bcrypt.hash(data.mdp, 10)

    const user = await prisma.utilisateur.create({
      data: {
        nom: data.nom.trim(),
        prenom: data.prenom.trim(),
        email: data.email.trim().toLowerCase(),
        mdp: hashedPassword,
        idRole: roleId,
        idStatut: statutId
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        role: { select: { libelle: true } },
        statut: { select: { libelle: true } }
      }
    })

    return user
  }

  async login(data: LoginInput) {
    const user = await prisma.utilisateur.findUnique({
      where: { email: data.email.trim().toLowerCase() },
      include: {
        role: { select: { libelle: true } }
      }
    })

    if (!user) {
      throw new HTTPException(401, { message: 'Identifiants incorrects' })
    }

    const passwordValid = await bcrypt.compare(data.mdp, user.mdp)
    if (!passwordValid) {
      throw new HTTPException(401, { message: 'Identifiants incorrects' })
    }

    // On ne renvoie **jamais** le mot de passe
    return {
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role: user.role.libelle
    }
  }
}