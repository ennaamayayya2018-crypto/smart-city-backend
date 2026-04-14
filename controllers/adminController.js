const db = require('../config/db');

// 1. جلب الإحصائيات الشاملة (مع إجمالي المداخيل)
const getStatistiques = async (req, res) => {
    try {
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM demandes) as total_demandes,
                (SELECT SUM(CASE WHEN statut = 'autorise' THEN 1 ELSE 0 END) FROM demandes) as total_autorise,
                (SELECT SUM(CASE WHEN statut = 'rejete' THEN 1 ELSE 0 END) FROM demandes) as total_rejete,
                (SELECT SUM(CASE WHEN statut LIKE 'en_attente%' OR statut LIKE 'retour_%' THEN 1 ELSE 0 END) FROM demandes) as total_en_cours,
                (SELECT COALESCE(SUM(montant_total_paye), 0) FROM recouvrements) as total_revenus
        `;
        const result = await db.query(query);
        res.status(200).json(result.rows[0]);
    } catch (error) { res.status(500).json({ message: 'حدث خطأ أثناء جلب الإحصائيات.' }); }
};

const getAllDemandes = async (req, res) => {
    try {
        const query = `SELECT * FROM demandes ORDER BY date_creation DESC;`;
        const result = await db.query(query);
        res.status(200).json({ demandes: result.rows });
    } catch (error) { res.status(500).json({ message: 'حدث خطأ أثناء جلب الملفات.' }); }
};

const getAllUsers = async (req, res) => {
    try {
        const query = `SELECT id, nom_complet, email, role, date_creation FROM utilisateurs ORDER BY date_creation DESC;`;
        const result = await db.query(query);
        res.status(200).json({ utilisateurs: result.rows });
    } catch (error) { res.status(500).json({ message: 'حدث خطأ أثناء جلب الموظفين.' }); }
};

const getAuditTrail = async (req, res) => {
    try {
        const query = `SELECT * FROM historique_actions ORDER BY date_action DESC LIMIT 100;`;
        const result = await db.query(query);
        res.status(200).json({ historique: result.rows });
    } catch (error) { res.status(500).json({ message: 'حدث خطأ أثناء جلب سجل الحركات.' }); }
};

// 📈 5. جلب بيانات الرسوم البيانية الإدارية والمالية
const getChartData = async (req, res) => {
    try {
        // إحصائيات إدارية (الأنواع + التطور الشهري للطلبات)
        const resultTypes = await db.query(`SELECT type_demande, COUNT(*) as count FROM demandes GROUP BY type_demande;`);
        const resultMonthsReq = await db.query(`
            SELECT EXTRACT(MONTH FROM date_creation) as mois, COUNT(*) as count 
            FROM demandes WHERE EXTRACT(YEAR FROM date_creation) = EXTRACT(YEAR FROM CURRENT_DATE) GROUP BY mois ORDER BY mois;
        `);

        // إحصائيات مالية (المداخيل حسب النوع + التطور الشهري للمداخيل)
        const resultRevByType = await db.query(`
            SELECT d.type_demande, COALESCE(SUM(r.montant_total_paye), 0) as revenu 
            FROM demandes d JOIN recouvrements r ON d.code_suivi = r.code_suivi GROUP BY d.type_demande;
        `);
        const resultRevByMonth = await db.query(`
            SELECT EXTRACT(MONTH FROM date_paiement) as mois, COALESCE(SUM(montant_total_paye), 0) as revenu 
            FROM recouvrements WHERE EXTRACT(YEAR FROM date_paiement) = EXTRACT(YEAR FROM CURRENT_DATE) GROUP BY mois ORDER BY mois;
        `);

        res.status(200).json({
            repartition_types: resultTypes.rows,
            evolution_mensuelle: resultMonthsReq.rows,
            revenus_par_type: resultRevByType.rows,
            revenus_mensuels: resultRevByMonth.rows
        });
    } catch (error) { res.status(500).json({ message: 'حدث خطأ أثناء جلب بيانات المبيانات.' }); }
};

const getFichiersEnRetard = async (req, res) => {
    try {
        const query = `
            SELECT code_suivi, nom_complet, type_demande, statut, date_creation,
                   EXTRACT(DAY FROM CURRENT_TIMESTAMP - date_creation) as jours_retard
            FROM demandes WHERE statut NOT IN ('autorise', 'rejete') AND EXTRACT(DAY FROM CURRENT_TIMESTAMP - date_creation) >= 3
            ORDER BY jours_retard DESC;
        `;
        const result = await db.query(query);
        res.status(200).json({ total_retards: result.rowCount, retards: result.rows });
    } catch (error) { res.status(500).json({ message: 'حدث خطأ أثناء فحص التأخيرات.' }); }
};

const getArchiveDefinitif = async (req, res) => {
    try {
        const result = await db.query(`SELECT * FROM demandes WHERE statut IN ('autorise', 'rejete') ORDER BY date_creation DESC;`);
        res.status(200).json({ archive: result.rows });
    } catch (error) { res.status(500).json({ message: 'حدث خطأ أثناء جلب الأرشيف.' }); }
};

const supprimerUtilisateur = async (req, res) => {
    try {
        const result = await db.query(`DELETE FROM utilisateurs WHERE id = $1 AND role != 'admin' RETURNING *;`, [req.params.id]);
        if (result.rowCount === 0) return res.status(400).json({ message: 'لا يمكن حذف هذا الحساب.' });
        res.status(200).json({ message: 'تم الحذف.' });
    } catch (error) { res.status(500).json({ message: 'حدث خطأ.' }); }
};

// 💰 9. جلب سجل الخزينة والمداخيل (الجديد)
const getRecouvrements = async (req, res) => {
    try {
        const query = `
            SELECT r.*, d.nom_complet, d.type_demande, d.cin 
            FROM recouvrements r
            JOIN demandes d ON r.code_suivi = d.code_suivi
            ORDER BY r.created_at DESC;
        `;
        const result = await db.query(query);
        res.status(200).json({ recouvrements: result.rows });
    } catch (error) {
        console.error('Error fetching finance:', error);
        res.status(500).json({ message: 'حدث خطأ أثناء جلب السجل المالي.' });
    }
};

module.exports = { getStatistiques, getAllDemandes, getAllUsers, getAuditTrail, getChartData, getFichiersEnRetard, getArchiveDefinitif, supprimerUtilisateur, getRecouvrements };