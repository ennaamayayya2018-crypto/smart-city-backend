const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// استدعاء الحراس
const { verifierToken, verifierRole } = require('../middlewares/authMiddleware');

// تطبيق الحراس على جميع مسارات المدير
// الشرط الأول: يجب أن يكون مسجلاً للدخول (verifierToken)
// الشرط الثاني: يجب أن يكون دوره admin تحديداً (verifierRole)
router.use(verifierToken, verifierRole(['admin']));

// المسارات المحمية
router.get('/statistiques', adminController.getStatistiques);
router.get('/demandes', adminController.getAllDemandes);
router.get('/utilisateurs', adminController.getAllUsers);
router.get('/historique', adminController.getAuditTrail);
router.get('/charts', adminController.getChartData);// مسار كشف الاختناقات والملفات المتأخرة
router.get('/retards', adminController.getFichiersEnRetard);
router.get('/archive', adminController.getArchiveDefinitif);
router.delete('/utilisateurs/:id', adminController.supprimerUtilisateur);
// ==========================================
// 8. حذف موظف (سحب الصلاحيات) 🚨
// ==========================================
const supprimerUtilisateur = async (req, res) => {
    try {
        const id = req.params.id;
        // جدار حماية إضافي: نمنع حذف حساب المدير العام الأساسي
        const query = `DELETE FROM utilisateurs WHERE id = $1 AND role != 'admin' RETURNING *;`;
        const result = await db.query(query, [id]);

        if (result.rowCount === 0) {
            return res.status(400).json({ message: 'لا يمكن حذف هذا الحساب (قد يكون حساب مدير أو غير موجود).' });
        }
        res.status(200).json({ message: 'تم سحب الصلاحيات وحذف الموظف بنجاح.' });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ أثناء محاولة حذف الموظف.' });
    }
};

// لا تنسي إضافتها هنا:
module.exports = {
    getStatistiques, getAllDemandes, getAllUsers, getAuditTrail, 
    getChartData, getFichiersEnRetard, getArchiveDefinitif, supprimerUtilisateur
};