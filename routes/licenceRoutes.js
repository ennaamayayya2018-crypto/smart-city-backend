const express = require('express');
const router = express.Router();
const licenceController = require('../controllers/licenceController');

// استدعاء الحارس لفحص وثيقة الرخصة
const uploadMiddleware = require('../middlewares/uploadMiddleware');

// مسار جلب الملفات
router.get('/demandes', licenceController.getDemandesLicence);

// مسار البحث
router.get('/recherche', licenceController.rechercherDemande);

// مسار إصدار الرخصة (هنا نستخدم الحارس) 🚨
// الحارس يبحث عن ملف واحد اسمه 'document_autorisation'
router.put('/delivrer', uploadMiddleware, licenceController.delivrerLicence);

module.exports = router;