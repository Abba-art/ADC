import { z } from 'zod'

export const assignationSchema = z.object({
  utilisateurId: z.uuid('ID professeur invalide'),
  courseId: z.uuid('ID du cours invalide'),
  motif: z.string().max(200).optional(),
})

export const clotureSchema = z.object({
  enseignementId: z.uuid('ID enseignement invalide'),
  motif: z.string().max(200).optional(),
})

export type AssignationInput = z.infer<typeof assignationSchema>
export type ClotureInput = z.infer<typeof clotureSchema>
export const reconductionSchema = z.object({
  anneeSourceId: z.number().int("L'ID de l'année source est requis"),
  anneeCibleId: z.number().int("L'ID de l'année cible est requis")
});