const express = require('express');
const router = express.Router();
const ecoController = require('../controllers/ecoController');

// 1. استدعاء حارس الأمان (Middleware)
const authMiddleware = require('../middlewares/authMiddleware');

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

// 2. مسار البحث عن طلب (محمي) - أضفناها لأنها موجودة في الكنترولر الخاص بك
router.get(
    '/recherche', // أو '/recherche/:code' حسب ما برمجته داخل الدالة
    authMiddleware.verifierToken, 
    authMiddleware.verifierRole(['eco', 'admin']), 
    ecoController.rechercherDemande
);

// 3. مسار معالجة/تحويل الطلب (محمي) - 🚨 تم تصحيح الاسم هنا ليتطابق مع traiterDemande
router.put(
    '/demandes/:id/traiter', 
    authMiddleware.verifierToken, 
    authMiddleware.verifierRole(['eco', 'admin']), 
    ecoController.traiterDemande
);

module.exports = router;