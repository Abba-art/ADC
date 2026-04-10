import { z } from 'zod'

export const loginSchema = z.object({
    email: z.email('Format d\'email invalide'),
  mdp: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères')
})

export const registerSchema = z.object({
  nom: z.string().min(2, 'Le nom est trop court'),
  prenom: z.string().min(2, 'Le prénom est trop court'),
  email: z.email('Format d\'email invalide'),
  mdp: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  idRole: z.number().int().positive().optional(),
  idStatut: z.number().int().positive().optional()
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>