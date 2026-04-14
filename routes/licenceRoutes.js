const express = require('express');
const router = express.Router();
const licenceController = require('../controllers/licenceController');
const multer = require('multer');

// 🛡️ تجهيز حارس الرفع لاستقبال الطرد المزدوج (الرخصة + وصل الأداء)
const uploadLicence = multer({ storage: multer.memoryStorage() }).fields([
    { name: 'document_autorisation', maxCount: 1 }, // ملف الرخصة (اختياري)
    { name: 'document_paiement', maxCount: 1 }      // ملف وصل الأداء (إجباري)
]);

// مسار جلب الملفات
router.get('/demandes', licenceController.getDemandesLicence);

// مسار البحث
router.get('/recherche', licenceController.rechercherDemande);

// 🚀 تطبيق الحارس المزدوج على مسار الإصدار
router.put('/delivrer', uploadLicence, licenceController.delivrerLicence);

module.exports = router;