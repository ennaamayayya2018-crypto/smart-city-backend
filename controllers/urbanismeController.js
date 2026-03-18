const db = require('../config/db'); 

// 1. جلب الملفات المحالة للدراسة (GET)
const getDemandesUrbanisme = async (req, res) => {
    try {
        const query = `SELECT * FROM demandes WHERE statut = 'en_attente_urbanisme' ORDER BY date_creation ASC;`;
        const result = await db.query(query);
        res.status(200).json({
            message: 'تم جلب ملفات مصلحة التعمير بنجاح',
            nombre_demandes: result.rowCount,
            demandes: result.rows
        });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ في الخادم.' });
    }
};

// ==========================================
// 2. دالة: البحث عن طلب محدد (GET) - الميزة الجديدة 🚨
// ==========================================
const rechercherDemande = async (req, res) => {
    try {
        const termeRecherche = req.query.q;
        if (!termeRecherche) return res.status(400).json({ message: 'المرجو إدخال رقم التتبع أو رقم البطاقة للبحث.' });

        // جدار حماية: المهندس يبحث فقط في الملفات الموجودة حالياً في مصلحته
        const query = `
            SELECT * FROM demandes 
            WHERE (code_suivi = $1 OR cin = $1) 
            AND statut = 'en_attente_urbanisme';
        `;
        const result = await db.query(query, [termeRecherche]);

        if (result.rowCount === 0) return res.status(404).json({ message: 'لم يتم العثور على طلب بهذا الرقم في قسم التعمير.' });
        res.status(200).json({ message: 'تم العثور على الطلب بنجاح', demande: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ في الخادم أثناء البحث.' });
    }
};

// 3. إبداء الرأي التقني (PUT)
const emettreAvis = async (req, res) => {
    try {
        const { code_suivi, avis_technique, observations } = req.body;
        if (!code_suivi || !avis_technique) return res.status(400).json({ message: 'المرجو تحديد رقم الطلب والرأي التقني.' });

        const query = `
            UPDATE demandes 
            SET statut = $1, observations = $2 
            WHERE code_suivi = $3 AND statut = 'en_attente_urbanisme'
            RETURNING *;
        `;
        const values = [avis_technique, observations || null, code_suivi];
        const result = await db.query(query, values);

        if (result.rowCount === 0) return res.status(404).json({ message: 'الملف غير متاح للدراسة.' });
          
            req.app.get('io').emit('alerte_eco', { 
             message: `تم إرجاع الملف ${code_suivi} من التعمير بعد الدراسة.` 
             });

        res.status(200).json({
            message: 'تم تسجيل الرأي التقني وإعادة الملف للمكتب الاقتصادي بنجاح!',
            statut_actuel: result.rows[0].statut
        });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ أثناء معالجة الملف هندسياً.' });
    }
};

module.exports = { getDemandesUrbanisme, rechercherDemande, emettreAvis };