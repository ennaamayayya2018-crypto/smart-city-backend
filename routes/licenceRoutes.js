const express = require('express');
const router = express.Router();
const licenceController = require('../controllers/licenceController');
const multer = require('multer'); // 💡 استدعاء مكتبة الرفع مباشرة

// 🛡️ تجهيز حارس خاص بمصلحة الرخص فقط (مبرمج لقبول ملف الرخصة حصرياً)
const uploadLicence = multer({ storage: multer.memoryStorage() }).fields([
    { name: 'document_autorisation', maxCount: 1 }
]);

// مسار جلب الملفات
router.get('/demandes', licenceController.getDemandesLicence);

// مسار البحث
router.get('/recherche', licenceController.rechercherDemande);

// 🚀 تطبيق الحارس المخصص على مسار الإصدار
router.put('/delivrer', uploadLicence, licenceController.delivrerLicence);

module.exports = router;