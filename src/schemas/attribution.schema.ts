import { z } from 'zod'

export const assignationSchema = z.object({
  utilisateurId: z.string().uuid('ID professeur invalide'),
  matiereId: z.number().int().positive(),
  classeId: z.number().int().positive(),
  anneeId: z.number().int().positive(),
  motif: z.string().max(200).optional(),
})

export type AssignationInput = z.infer<typeof assignationSchema>