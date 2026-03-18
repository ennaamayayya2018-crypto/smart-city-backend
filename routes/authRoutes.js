const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// مسار إنشاء حساب موظف
router.post('/register', authController.creerCompte);

// مسار تسجيل الدخول
router.post('/login', authController.login);

module.exports = router;