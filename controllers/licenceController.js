const db = require('../config/db');

// ==========================================
// 1. جلب الملفات الجاهزة للترخيص (GET)
// ==========================================
const getDemandesLicence = async (req, res) => {
    try {
        // نجلب فقط الملفات التي حالتها 'en_attente_licence'
        const query = `SELECT * FROM demandes WHERE statut = 'en_attente_licence' ORDER BY date_creation ASC;`;
        const result = await db.query(query);
        
        res.status(200).json({
            message: 'تم جلب ملفات مصلحة الرخص بنجاح',
            nombre_demandes: result.rowCount,
            demandes: result.rows
        });
    } catch (error) {
        console.error('❌ خطأ في جلب ملفات الرخص:', error);
        res.status(500).json({ message: 'حدث خطأ في الخادم.' });
    }
};

// ==========================================
// 2. البحث عن طلب محدد داخل مصلحة الرخص (GET)
// ==========================================
const rechercherDemande = async (req, res) => {
    try {
        const termeRecherche = req.query.q;
        if (!termeRecherche) return res.status(400).json({ message: 'المرجو إدخال رقم التتبع أو رقم البطاقة للبحث.' });

        // البحث مقتصر فقط على الملفات الموجودة في المصلحة حالياً
        const query = `
            SELECT * FROM demandes 
            WHERE (code_suivi = $1 OR cin = $1) 
            AND statut = 'en_attente_licence';
        `;
        const result = await db.query(query, [termeRecherche]);

        if (result.rowCount === 0) return res.status(404).json({ message: 'لم يتم العثور على طلب بهذا الرقم في مصلحة الرخص.' });
        
        res.status(200).json({ message: 'تم العثور على الطلب بنجاح', demande: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ في الخادم أثناء البحث.' });
    }
};

// ==========================================
// 3. تسليم الرخصة النهائية (تحديث الحالة + رفع وثيقة الرخصة) (PUT) 🚨
// ==========================================
const delivrerLicence = async (req, res) => {
    try {
        // نستقبل رقم التتبع من البيانات النصية (لأننا نستخدم FormData بسبب وجود ملف)
        const { code_suivi } = req.body;

        if (!code_suivi) {
            return res.status(400).json({ message: 'المرجو تحديد رقم الطلب.' });
        }

        // نتحقق مما إذا كان الموظف قد رفع ملف الرخصة الموقعة (اختياري، يمكن أن تكون ورقية فقط)
        // إذا كان هناك ملف، نأخذ مساره، وإذا لم يكن، نعطيه قيمة null
        const document_autorisation = req.files && req.files.document_autorisation ? req.files.document_autorisation[0].path : null;

        // أمر SQL: تحديث الحالة إلى 'autorise' (مرخص)، وتحديث تاريخ الترخيص لليوم، وإضافة مسار الرخصة
        const query = `
            UPDATE demandes 
            SET statut = 'autorise', 
                date_autorisation = CURRENT_TIMESTAMP, 
                document_autorisation = COALESCE($1, document_autorisation)
            WHERE code_suivi = $2 AND statut = 'en_attente_licence'
            RETURNING *;
        `;
        
        const values = [document_autorisation, code_suivi];
        const result = await db.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'الملف غير موجود في مصلحة الرخص أو أنه مُرخص مسبقاً.' });
        }

        res.status(200).json({
            message: 'تم تسليم الرخصة بنجاح! الملف الآن في الأرشيف النهائي.',
            statut_actuel: result.rows[0].statut,
            رابط_الرخصة: result.rows[0].document_autorisation
        });

    } catch (error) {
        console.error('❌ خطأ أثناء تسليم الرخصة:', error);
        res.status(500).json({ message: 'حدث خطأ في الخادم أثناء إصدار الرخصة.' });
    }
};

module.exports = {
    getDemandesLicence,
    rechercherDemande,
    delivrerLicence
};