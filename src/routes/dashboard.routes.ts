import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { institutGuard } from '../middleware/institut.middleware.js'
import { DashboardService } from '../services/dashboard.service.js'
import { ReportService } from '../services/report.service.js'

const dashboardRoutes = new Hono<{ Variables: { user: any, institutIds: number[] } }>()

const dashboardService = new DashboardService()
const reportService = new ReportService()

dashboardRoutes.use('*', authMiddleware)
dashboardRoutes.use('*', institutGuard)

// 1. Route pour les statistiques (Cartes du Dashboard)
dashboardRoutes.get('/', async (c) => {
  const stats = await dashboardService.getStats()
  return c.json({ success: true, data: stats })
})

// 2. Route pour exporter le PDF (Avec paramètre optionnel)
dashboardRoutes.get('/export/bilan', async (c) => {
  const user = c.get('user');
  const role = typeof user.role === 'object' ? user.role.libelle : user.role;
  const institutIds = c.get('institutIds') || [];
  
  // On récupère le département depuis l'URL si le frontend l'envoie (ex: ?departementId=5)
  const queryDepId = c.req.query('departementId');
  const departementId = queryDepId ? Number(queryDepId) : undefined;

  // On appelle le service proprement
  const pdfBuffer = await reportService.generateBilanPdf(institutIds, role as string, departementId);

  // On renvoie le fichier PDF au navigateur
  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', `attachment; filename="Bilan_IUG${departementId ? '_Dep_'+departementId : ''}.pdf"`);
  
  return c.body(pdfBuffer as any);
});

export default dashboardRoutes;