const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifierToken, verifierRole } = require('../middlewares/authMiddleware');

router.use(verifierToken, verifierRole(['admin']));

router.get('/statistiques', adminController.getStatistiques);
router.get('/demandes', adminController.getAllDemandes);
router.get('/utilisateurs', adminController.getAllUsers);
router.get('/historique', adminController.getAuditTrail);
router.get('/charts', adminController.getChartData);
router.get('/retards', adminController.getFichiersEnRetard);
router.get('/archive', adminController.getArchiveDefinitif);
router.delete('/utilisateurs/:id', adminController.supprimerUtilisateur);

// 💰 المسار الجديد الخاص بالخزينة
router.get('/recouvrements', adminController.getRecouvrements);
// 🚨 مسار جلب الديون والإنذارات
router.get('/impayes', adminController.getImpayes);
module.exports = router;