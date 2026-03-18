const express = require('express');
const router = express.Router();
const urbanismeController = require('../controllers/urbanismeController');

// مسار جلب ملفات التعمير
router.get('/demandes', urbanismeController.getDemandesUrbanisme);

// مسار البحث في التعمير
router.get('/recherche', urbanismeController.rechercherDemande);

// مسار إبداء الرأي التقني
router.put('/avis', urbanismeController.emettreAvis);

module.exports = router;