-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Enseignement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utilisateurId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "dateDebut" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateFin" DATETIME,
    "motif" TEXT,
    "estActif" BOOLEAN NOT NULL DEFAULT true,
    "statutValidation" TEXT NOT NULL DEFAULT 'PROPOSITION',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Enseignement_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Enseignement_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Enseignement" ("courseId", "createdAt", "dateDebut", "dateFin", "estActif", "id", "motif", "updatedAt", "utilisateurId") SELECT "courseId", "createdAt", "dateDebut", "dateFin", "estActif", "id", "motif", "updatedAt", "utilisateurId" FROM "Enseignement";
DROP TABLE "Enseignement";
ALTER TABLE "new_Enseignement" RENAME TO "Enseignement";
CREATE INDEX "Enseignement_courseId_estActif_idx" ON "Enseignement"("courseId", "estActif");
CREATE INDEX "Enseignement_utilisateurId_idx" ON "Enseignement"("utilisateurId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
