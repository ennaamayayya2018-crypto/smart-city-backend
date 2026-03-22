const express = require('express');
const router = express.Router();
const licenceController = require('../controllers/licenceController');

// مسار جلب الملفات
router.get('/demandes', licenceController.getDemandesLicence);

// مسار البحث
router.get('/recherche', licenceController.rechercherDemande);

// 🚀 التعديل الذهبي: إزالة حارس (uploadMiddleware) للسماح بمرور طلب الـ JSON بسلاسة
router.put('/delivrer', licenceController.delivrerLicence);

module.exports = router;