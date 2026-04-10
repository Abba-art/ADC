import PDFDocument from 'pdfkit-table';
import prisma from '../lib/prisma.js';

export class ReportService {
  
  // Ratio Légale IUG : 1 Crédit = 15 Heures
  private readonly RATIO_HEURES = 15;

  // Code couleurs aligné avec ton Frontend (Tailwind/Shadcn)
  private readonly COLOR_PRIMARY = '#2E7D32'; // Vert IUG
  private readonly COLOR_SECONDARY = '#F58220'; // Orange ISTA
  private readonly COLOR_TEXT = '#333333'; // Gris très foncé
  private readonly COLOR_MUTED = '#6B7280'; // Gris secondaire

  // ============================================================================
  // 1. MÉTHODE : Le Bilan Global (Département ou Établissement)
  // ============================================================================
  async generateBilanPdf(institutIds: number[] = [], role: string, departementId?: number): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const where: any = { estActif: true };
        const classeFilter: any = {};

        if (departementId) classeFilter.departementId = departementId;
        if (role !== 'ADMIN' && institutIds.length > 0) {
          classeFilter.departement = { ...(classeFilter.departement || {}), institutId: { in: institutIds } };
        }
        if (Object.keys(classeFilter).length > 0) where.classe = classeFilter;

        const attributions = await prisma.attribution.findMany({
          where,
          include: {
            utilisateur: { select: { nom: true, prenom: true } },
            matiere: { select: { nom: true, code: true, credits: true } },
            classe: { select: { code: true, departement: { select: { nom: true } } } }
          },
          orderBy: [{ classe: { code: 'asc' } }]
        });

        // Calcul du Volume Horaire Total
        const totalCredits = attributions.reduce((sum, a) => sum + a.matiere.credits, 0);
        const volumeHoraireTotal = totalCredits * this.RATIO_HEURES;

        // --- EN-TÊTE DESIGN ---
        doc.rect(0, 0, doc.page.width, 90).fill(this.COLOR_PRIMARY);
        doc.fillColor('white').fontSize(20).font('Helvetica-Bold').text('INSTITUT UNIVERSITAIRE DU GOLFE', 0, 25, { align: 'center' });
        doc.fillColor(this.COLOR_SECONDARY).fontSize(12).font('Helvetica-Oblique').text('Système de Gestion Pédagogique (ADC)', 0, 52, { align: 'center' });
        
        doc.moveDown(4);
        
        // --- TITRE DU DOCUMENT ---
        const titrePdf = departementId && attributions.length > 0 
          ? `Bilan des Attributions - Dép. ${attributions[0].classe.departement?.nom}` 
          : 'Bilan Global des Attributions de Cours';

        doc.fillColor(this.COLOR_PRIMARY).fontSize(16).font('Helvetica-Bold').text(titrePdf.toUpperCase(), { align: 'center' });
        doc.moveDown(0.5);
        doc.fillColor(this.COLOR_MUTED).fontSize(10).font('Helvetica').text(`Date d'édition : ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
        
        doc.moveDown(2);

        // --- ENCADRÉ STATISTIQUE ---
        doc.rect(40, doc.y, doc.page.width - 80, 40).fillAndStroke('#F9FAFB', this.COLOR_SECONDARY);
        doc.fillColor(this.COLOR_SECONDARY).fontSize(12).font('Helvetica-Bold').text(`Volume Horaire Global Assigné : ${volumeHoraireTotal} Heures`, 40, doc.y - 28, { align: 'center' });
        
        doc.moveDown(3);

        // --- TABLEAU ---
        const tableData = {
          headers: [
            { label: "CLASSE", property: 'classe', width: 70 },
            { label: "MATIÈRE", property: 'matiere', width: 200 },
            { label: "VOLUME (H)", property: 'volume', width: 80 },
            { label: "ENSEIGNANT", property: 'prof', width: 160 }
          ],
          rows: attributions.map(a => [
            a.classe.code,
            `${a.matiere.code} - ${a.matiere.nom}`,
            `${a.matiere.credits * this.RATIO_HEURES} H`,
            `${a.utilisateur.nom} ${a.utilisateur.prenom}`
          ])
        };

        await doc.table(tableData, {
          prepareHeader: () => {
            doc.font('Helvetica-Bold').fontSize(9).fillColor(this.COLOR_PRIMARY);
            return doc;
          },
          prepareRow: (row, indexColumn, indexRow, rectRow) => {
            doc.font('Helvetica').fontSize(9).fillColor(this.COLOR_TEXT);
            return doc;
          },
        });

        // --- PIED DE PAGE ---
        doc.moveDown(3);
        doc.fillColor(this.COLOR_MUTED).fontSize(8).text('Document généré automatiquement par la plateforme ADC - Institut Universitaire du Golfe de Guinée.', { align: 'center' });

        doc.end();

      } catch (err) {
        reject(err);
      }
    });
  }

  // ============================================================================
  // 2. MÉTHODE : La Fiche de Charge individuelle d'un Enseignant
  // ============================================================================
  async generateFicheEnseignantPdf(utilisateurId: string): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const user = await prisma.utilisateur.findUnique({
          where: { id: utilisateurId },
          include: {
            role: true,
            statut: true,
            instituts: true,
            attributions: {
              where: { estActif: true,},
              include: { matiere: true, classe: true, annee: true },
              orderBy: { annee: { libelle: 'desc' } }
            }
          }
        });

        if (!user) throw new Error("Utilisateur introuvable");

        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // --- EN-TÊTE DESIGN ---
        doc.rect(0, 0, doc.page.width, 90).fill(this.COLOR_PRIMARY);
        doc.fillColor('white').fontSize(20).font('Helvetica-Bold').text('FICHE DE CHARGE HORAIRE', 0, 25, { align: 'center' });
        doc.fillColor(this.COLOR_SECONDARY).fontSize(12).font('Helvetica-Oblique').text('Direction des Affaires Académiques', 0, 52, { align: 'center' });
        doc.moveDown(4);

        // --- INFORMATIONS ENSEIGNANT (Présentation élégante) ---
        doc.rect(40, doc.y, doc.page.width - 80, 70).fill('#F9FAFB');
        
        let startY = doc.y - 60;
        doc.fillColor(this.COLOR_TEXT).fontSize(11).font('Helvetica-Bold').text(`Enseignant : `, 55, startY, { continued: true }).font('Helvetica').text(`${user.nom} ${user.prenom}`);
        doc.font('Helvetica-Bold').text(`Email : `, 55, startY + 18, { continued: true }).font('Helvetica').text(`${user.email}`);
        doc.font('Helvetica-Bold').text(`Statut : `, 55, startY + 36, { continued: true }).font('Helvetica').text(`${user.statut.libelle} `);
        
        // --- CALCUL DE LA CHARGE ---
        const totalCredits = user.attributions.reduce((sum, att) => sum + att.matiere.credits, 0);
        const chargeTotale = totalCredits * this.RATIO_HEURES;
        const quota = user.statut.quotaHeureMax;
        
        // --- JAUGE DE CHARGE (Texte coloré) ---
        doc.moveDown(4);
        doc.font('Helvetica-Bold').fontSize(12).fillColor(this.COLOR_PRIMARY).text(`Bilan de la Charge Horaire`);
        
        let colorCharge = '#10B981'; // Green
        if (chargeTotale >= quota) colorCharge = '#EF4444'; // Red
        else if (chargeTotale > quota * 0.8) colorCharge = this.COLOR_SECONDARY; // Orange

        doc.moveDown(0.5);
        doc.font('Helvetica').fontSize(11).fillColor(this.COLOR_TEXT).text(`Volume Consommé : `, { continued: true })
           .font('Helvetica-Bold').fillColor(colorCharge).text(`${chargeTotale} Heures `, { continued: true })
           .font('Helvetica').fillColor(this.COLOR_TEXT).text(` / ${quota} Heures (Plafond ${user.statut.quotaPeriode.toLowerCase()})`);
        
        doc.moveDown(2);

        // --- TABLEAU DES COURS ---
        if (user.attributions.length === 0) {
            doc.font('Helvetica-Oblique').fillColor(this.COLOR_MUTED).text("Aucun enseignement n'a encore été validé pour ce professeur.");
        } else {
            doc.font('Helvetica-Bold').fontSize(12).fillColor(this.COLOR_PRIMARY).text('Détail des Enseignements Validés');
            doc.moveDown(1);

            const tableData = {
              headers: [
                { label: "CODE", property: 'code', width: 60 },
                { label: "MATIÈRE", property: 'matiere', width: 190 },
                { label: "CLASSE", property: 'classe', width: 80 },
                { label: "VOLUME (H)", property: 'volume', width: 80 },
                { label: "ANNÉE", property: 'annee', width: 80 }
              ],
              rows: user.attributions.map(a => [
                a.matiere.code,
                a.matiere.nom,
                a.classe.code,
                `${a.matiere.credits * this.RATIO_HEURES} H`,
                a.annee.libelle
              ])
            };

            await doc.table(tableData, {
              prepareHeader: () => {
                doc.font('Helvetica-Bold').fontSize(9).fillColor(this.COLOR_PRIMARY);
                return doc;
              },
              prepareRow: () => {
                doc.font('Helvetica').fontSize(9).fillColor(this.COLOR_TEXT);
                return doc;
              },
            });
        }

        // --- SIGNATURES ---
        doc.moveDown(4);
        const signatureY = doc.y;
        doc.font('Helvetica-Bold').fontSize(10).fillColor(this.COLOR_PRIMARY).text("Le Chef de Département", 60, signatureY);
        doc.text("L'Enseignant", 400, signatureY);

        doc.end();

      } catch (err) {
        reject(err);
      }
    });
  }
}