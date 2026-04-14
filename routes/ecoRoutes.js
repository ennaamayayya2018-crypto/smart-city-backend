const express = require('express');
const router = express.Router();
const ecoController = require('../controllers/ecoController');
const multer = require('multer');

const authMiddleware = require('../middlewares/authMiddleware');

// 🛡️ حارس رفع وصل الأداء (الاستخلاصات المستمرة)
const uploadPaiement = multer({ storage: multer.memoryStorage() }).single('document_paiement');

// 🛡️ حارس جديد لرفع محاضر المعاينة والاستخلاص أثناء المعالجة
const uploadTraiter = multer({ storage: multer.memoryStorage() }).fields([
    { name: 'doc_pv_constat', maxCount: 1 },
    { name: 'doc_pv_recouvrement', maxCount: 1 }
]);

router.get('/demandes', authMiddleware.verifierToken, authMiddleware.verifierRole(['eco', 'admin']), ecoController.getDemandesEco);
router.get('/recherche', authMiddleware.verifierToken, authMiddleware.verifierRole(['eco', 'admin']), ecoController.rechercherDemande);

// 🚀 تحديث مسار المعالجة ليستخدم الحارس المزدوج
router.put(
    '/demandes/:id/traiter', 
    authMiddleware.verifierToken, 
    authMiddleware.verifierRole(['eco', 'admin']), 
    uploadTraiter, // <--- الحارس الجديد تم حقنه هنا
    ecoController.traiterDemande
);

router.post('/paiement', authMiddleware.verifierToken, authMiddleware.verifierRole(['eco', 'admin']), uploadPaiement, ecoController.enregistrerPaiement);

module.exports = router;