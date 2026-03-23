import { z } from 'zod';

export const updateUserSchema = z.object({
  idRole: z.number().int().optional(),
  idStatut: z.number().int().optional(),
  nom: z.string().min(2).optional(),
  prenom: z.string().min(2).optional()
});