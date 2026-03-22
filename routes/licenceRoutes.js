const express = require('express');
const router = express.Router();
const licenceController = require('../controllers/licenceController');
const uploadMiddleware = require('../middlewares/uploadMiddleware'); // استدعاء الحارس

// مسار جلب الملفات
router.get('/demandes', licenceController.getDemandesLicence);

// مسار البحث
router.get('/recherche', licenceController.rechercherDemande);

// 🚀 إرجاع الحارس للسماح باستقبال ملف الرخصة (FormData)
router.put('/delivrer', uploadMiddleware, licenceController.delivrerLicence);

module.exports = router;