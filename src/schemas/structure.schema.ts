import { z } from 'zod'
import { Semestre } from '@prisma/client'



export const niveauSchema = z.object({
  libelle: z.string().min(3, 'Libellé trop court').max(50).trim(),
})

export const classeSchema = z.object({
  code: z.string().min(3, 'Code classe invalide').max(20).transform(val => val.trim().toUpperCase()),
  filiereId: z.number().int().positive('ID filière requis'),
  niveauId: z.number().int().positive('ID niveau requis'),
})

export const anneeAcademiqueSchema = z.object({
  libelle: z.string().min(4, 'Année académique invalide (ex: 2024-2025)').max(20).trim(),
})

export const matiereSchema = z.object({
  code: z.string().min(2).max(20).trim(),
  nom: z.string().min(3).max(150).trim(),
  credits: z.number().int().positive().max(30),
  semestre: z.enum(Semestre),
  filiereId: z.number().int().positive(),
})

