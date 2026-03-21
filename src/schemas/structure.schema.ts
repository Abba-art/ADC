import { z } from 'zod';

export const filiereSchema = z.object({
  nom: z.string()
    .min(2, "Le nom est trop court")
    .max(50, "Le nom est trop long")
    .regex(/^[a-zA-Z0-9 ]+$/, "Le nom contient des caractères non autorisés")
});

export const niveauSchema = z.object({
  libelle: z.string().min(2, "Le libelle est trop court")
});
// Ajoute ceci à la fin de ton fichier structure.schema.ts
export const classeSchema = z.object({
  code: z.string().min(2).max(10).regex(/^[a-zA-Z0-9-]+$/, "Code invalide"),
  filiereId: z.number().int(),
  niveauId: z.number().int()
});