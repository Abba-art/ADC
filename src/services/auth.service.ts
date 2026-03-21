import bcrypt from 'bcrypt';
import prisma from '../lib/prisma.js';
import { type RegisterInput, type LoginInput } from '../schemas/auth.schema.js';
import { HTTPException } from 'hono/http-exception'; // NOUVEAU

export class AuthService {
  async register(data: RegisterInput) {
    const existingUser = await prisma.utilisateur.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new HTTPException(409, { message: "Cet email est déjà utilisé" }); // 409 Conflict
    }

    let finalRoleId = data.idRole;
    if (!finalRoleId) {
      const defaultRole = await prisma.role.findUnique({
        where: { libelle: "PROFESSEUR" }
      });
      if (!defaultRole) throw new HTTPException(500, { message: "Erreur système : Rôle PROFESSEUR introuvable" });
      finalRoleId = defaultRole.id;
    }

    let finalStatutId = data.idStatut;
    if (!finalStatutId) {
      const defaultStatut = await prisma.statut.findUnique({
        where: { libelle: "VACATAIRE" }
      });
      if (!defaultStatut) throw new HTTPException(500, { message: "Erreur système : Statut VACATAIRE introuvable" });
      finalStatutId = defaultStatut.id;
    }

    const hashedMdp = await bcrypt.hash(data.mdp, 10);

    return await prisma.utilisateur.create({
      data: {
        nom: data.nom,
        prenom: data.prenom,
        email: data.email,
        mdp: hashedMdp,
        idRole: finalRoleId,
        idStatut: finalStatutId
      },
      select: {
        id: true,
        nom: true,
        email: true,
        role: { select: { libelle: true } },
        statut: { select: { libelle: true } }
      }
    });
  }

  async login(data: LoginInput) {
    const user = await prisma.utilisateur.findUnique({
      where: { email: data.email },
      include: { role: true }
    });

    if (!user) {
      throw new HTTPException(401, { message: "Identifiants incorrects" }); // 401 Unauthorized
    }

    const isValidPassword = await bcrypt.compare(data.mdp, user.mdp);
    
    if (!isValidPassword) {
      throw new HTTPException(401, { message: "Identifiants incorrects" }); // 401 Unauthorized
    }

    return {
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role.libelle
    };
  }
}