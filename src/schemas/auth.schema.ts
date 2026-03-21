import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email("Email invalide"),
  mdp: z.string().min(6, "Minimum 6 caractères")
});

export const registerSchema = z.object({
  nom: z.string().min(2, "Nom trop court"),
  prenom: z.string().min(2, "Prénom trop court"),
  email: z.email("Email invalide"),
  mdp: z.string().min(6, "Le mot de passe doit faire au moins 6 caractères"),
  idRole: z.number().int().optional(),
  idStatut: z.number().int().optional()
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>