const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// استدعاء الحراس
const { verifierToken, verifierRole } = require('../middlewares/authMiddleware');

// تطبيق الحراس على جميع مسارات المدير
// الشرط الأول: يجب أن يكون مسجلاً للدخول (verifierToken)
// الشرط الثاني: يجب أن يكون دوره admin تحديداً (verifierRole)
router.use(verifierToken, verifierRole(['admin']));

// المسارات المحمية
router.get('/statistiques', adminController.getStatistiques);
router.get('/demandes', adminController.getAllDemandes);
router.get('/utilisateurs', adminController.getAllUsers);
router.get('/historique', adminController.getAuditTrail);
router.get('/charts', adminController.getChartData);// مسار كشف الاختناقات والملفات المتأخرة
router.get('/retards', adminController.getFichiersEnRetard);
router.get('/retards', adminController.getFichiersEnRetard);
router.get('/archive', adminController.getArchiveDefinitif);
module.exports = router;