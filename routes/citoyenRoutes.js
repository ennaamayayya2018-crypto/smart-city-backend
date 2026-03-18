const express = require('express');
const router = express.Router();

// 1. استدعاء "المتحكم" (العقل الذي برمجناه للمواطن)
const citoyenController = require('../controllers/citoyenController');

// 2. استدعاء "الحارس" (الذي برمجناه لفحص وثائق الـ PDF)
const uploadMiddleware = require('../middlewares/uploadMiddleware');

// ==========================================
// مسار تسجيل طلب جديد (POST Request)
// ==========================================
// عندما يرسل المواطن بياناته إلى هذا الرابط ('/nouvelle-demande')، 
// نمررها أولاً للحارس (uploadMiddleware)، وإذا نجحت تمر للمتحكم (soumettreDemande)
router.post(
    '/nouvelle-demande', 
    uploadMiddleware, 
    citoyenController.soumettreDemande
);

// مسار التتبع (مفتوح للعموم كما اتفقنا)
router.get('/suivi/:code', citoyenController.suivreDemande);

// تصدير هذه الروابط ليتعرف عليها الخادم الرئيسي (server.js)
module.exports = router;