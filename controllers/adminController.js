const db = require('../config/db');

// ==========================================
// 1. جلب الإحصائيات الشاملة للوحة القيادة
// ==========================================
const getStatistiques = async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total_demandes,
                SUM(CASE WHEN statut = 'autorise' THEN 1 ELSE 0 END) as total_autorise,
                SUM(CASE WHEN statut = 'rejete' THEN 1 ELSE 0 END) as total_rejete,
                SUM(CASE WHEN statut LIKE 'en_attente%' OR statut LIKE 'retour_%' THEN 1 ELSE 0 END) as total_en_cours
            FROM demandes;
        `;
        const result = await db.query(query);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ أثناء جلب الإحصائيات.' });
    }
};

// ==========================================
// 2. جلب جميع الملفات في النظام (للرؤية البانورامية)
// ==========================================
const getAllDemandes = async (req, res) => {
    try {
        const query = `SELECT * FROM demandes ORDER BY date_creation DESC;`;
        const result = await db.query(query);
        res.status(200).json({ demandes: result.rows });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ أثناء جلب الملفات.' });
    }
};

// ==========================================
// 3. جلب سجل الموظفين (إدارة الموارد البشرية)
// ==========================================
const getAllUsers = async (req, res) => {
    try {
        // لا نجلب كلمات السر لأسباب أمنية
        const query = `SELECT id, nom_complet, email, role, date_creation FROM utilisateurs ORDER BY date_creation DESC;`;
        const result = await db.query(query);
        res.status(200).json({ utilisateurs: result.rows });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ أثناء جلب قائمة الموظفين.' });
    }
};

// ==========================================
// 4. جلب الصندوق الأسود (سجل الحركات من historique_actions)
// ==========================================
const getAuditTrail = async (req, res) => {
    try {
        // نربط الجداول (JOIN) لنجلب اسم الموظف ورقم تتبع الملف
        const query = `
            SELECT h.id, h.action_prise, h.remarques, h.date_action, 
                   u.nom_complet as nom_employe, d.code_suivi
            FROM historique_actions h
            LEFT JOIN utilisateurs u ON h.utilisateur_id = u.id
            LEFT JOIN demandes d ON h.demande_id = d.id
            ORDER BY h.date_action DESC
            LIMIT 100;
        `;
        const result = await db.query(query);
        res.status(200).json({ historique: result.rows });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ أثناء جلب سجل الحركات.' });
    }
};

// ==========================================
// 5. جلب بيانات الرسوم البيانية (Charts Data)
// ==========================================
const getChartData = async (req, res) => {
    try {
        // 1. بيانات المبيان الدائري (تجميع حسب نوع الطلب)
        const queryTypes = `SELECT type_demande, COUNT(*) as count FROM demandes GROUP BY type_demande;`;
        const resultTypes = await db.query(queryTypes);

        // 2. بيانات المبيان بالأعمدة (الطلبات حسب الأشهر للعام الحالي)
        const queryMonths = `
            SELECT 
                EXTRACT(MONTH FROM date_creation) as mois, 
                COUNT(*) as count 
            FROM demandes 
            WHERE EXTRACT(YEAR FROM date_creation) = EXTRACT(YEAR FROM CURRENT_DATE)
            GROUP BY mois 
            ORDER BY mois;
        `;
        const resultMonths = await db.query(queryMonths);

        res.status(200).json({
            repartition_types: resultTypes.rows,
            evolution_mensuelle: resultMonths.rows
        });
    } catch (error) {
        console.error('Chart Data Error:', error);
        res.status(500).json({ message: 'حدث خطأ أثناء جلب بيانات الرسوم البيانية.' });
    }
};

// ==========================================
// 6. محرك تتبع التأخير (SLA & Bottleneck Tracker)
// ==========================================
const getFichiersEnRetard = async (req, res) => {
    try {
        // نبحث عن الملفات التي لم تنتهِ (ليست autorise وليست rejete)
        // ونحسب عدد الأيام التي مرت منذ تاريخ وضع الطلب (date_creation)
        const query = `
            SELECT 
                code_suivi, 
                nom_complet, 
                type_demande, 
                statut,
                date_creation,
                EXTRACT(DAY FROM CURRENT_TIMESTAMP - date_creation) as jours_retard
            FROM demandes
            WHERE statut NOT IN ('autorise', 'rejete')
            AND EXTRACT(DAY FROM CURRENT_TIMESTAMP - date_creation) >= 3
            ORDER BY jours_retard DESC;
        `;
        
        const result = await db.query(query);
        res.status(200).json({ 
            message: 'تم جلب الملفات المتأخرة بنجاح',
            total_retards: result.rowCount,
            retards: result.rows 
        });
    } catch (error) {
        console.error('Error in SLA Tracker:', error);
        res.status(500).json({ message: 'حدث خطأ أثناء فحص الملفات المتأخرة.' });
    }
};

// ==========================================
// 7. جلب الأرشيف النهائي (مرخص ومرفوض فقط)
// ==========================================
const getArchiveDefinitif = async (req, res) => {
    try {
        const query = `
            SELECT * FROM demandes 
            WHERE statut IN ('autorise', 'rejete') 
            ORDER BY date_creation DESC;
        `;
        const result = await db.query(query);
        res.status(200).json({ archive: result.rows });
    } catch (error) {
        console.error('Error fetching archive:', error);
        res.status(500).json({ message: 'حدث خطأ أثناء جلب الأرشيف النهائي.' });
    }
};

// 🛑 لا تنسي إضافتها لقائمة التصدير:
// module.exports = { ..., getArchiveDefinitif };

// 🛑 تذكري إضافة اسم الدالة الجديدة إلى قائمة التصدير في نهاية الملف:
// module.exports = { getStatistiques, getAllDemandes, getAllUsers, getAuditTrail, getChartData, getFichiersEnRetard };

module.exports = {
    getStatistiques,
    getAllDemandes,
    getAllUsers,
    getAuditTrail,
    getChartData,
    getFichiersEnRetard,
    getArchiveDefinitif
};