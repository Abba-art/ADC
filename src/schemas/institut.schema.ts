import { z } from 'zod'

export const institutSchema = z.object({
  nom: z.string().min(3, 'Nom trop court').max(100).trim(), 
  adresse: z.string().max(200).optional(),
})