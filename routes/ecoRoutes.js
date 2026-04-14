const express = require('express');
const router = express.Router();
const ecoController = require('../controllers/ecoController');
const multer = require('multer'); // 💡 استدعاء مكتبة الرفع

// 1. استدعاء حارس الأمان (Middleware)
const authMiddleware = require('../middlewares/authMiddleware');

// 🛡️ تجهيز حارس الرفع لاستقبال وصل الأداء للاستخلاصات المستمرة
const uploadPaiement = multer({ storage: multer.memoryStorage() }).single('document_paiement');

// ==========================================
// 2. تطبيق الحارس على الروابط (التشفير)
// ==========================================

// 1. مسار جلب الطلبات (محمي)
router.get(
    '/demandes', 
    authMiddleware.verifierToken, 
    authMiddleware.verifierRole(['eco', 'admin']), 
    ecoController.getDemandesEco
);

// 2. مسار البحث عن طلب (محمي)
router.get(
    '/recherche', 
    authMiddleware.verifierToken, 
    authMiddleware.verifierRole(['eco', 'admin']), 
    ecoController.rechercherDemande
);

// 3. مسار معالجة/تحويل الطلب (محمي)
router.put(
    '/demandes/:id/traiter', 
    authMiddleware.verifierToken, 
    authMiddleware.verifierRole(['eco', 'admin']), 
    ecoController.traiterDemande
);

// 4. 💰 مسار تسجيل استخلاص مالي جديد للملفات المرخصة (الجديد)
router.post(
    '/paiement',
    authMiddleware.verifierToken,
    authMiddleware.verifierRole(['eco', 'admin']),
    uploadPaiement,
    ecoController.enregistrerPaiement
);

module.exports = router;