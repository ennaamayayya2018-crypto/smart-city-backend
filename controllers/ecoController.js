const db = require('../config/db'); 

// ==========================================
// 1. دالة: جلب الطلبات المعلقة (GET)
// ==========================================
const getDemandesEco = async (req, res) => {
    try {
        const query =`
            SELECT * FROM demandes 
            WHERE statut IN ('en_attente_eco', 'retour_urb_favorable', 'retour_urb_defavorable') 
            ORDER BY date_creation DESC;
        `;
        const result = await db.query(query);
        res.status(200).json({
            message: 'تم جلب الطلبات بنجاح',
            nombre_demandes: result.rowCount,
            demandes: result.rows
        });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ في الخادم.' });
    }
};

// ==========================================
// 2. دالة: البحث عن طلب محدد (GET)
// ==========================================
const rechercherDemande = async (req, res) => {
    try {
        const termeRecherche = req.query.q;
        if (!termeRecherche) return res.status(400).json({ message: 'المرجو إدخال رقم التتبع أو رقم البطاقة للبحث.' });

        const query = `SELECT * FROM demandes WHERE code_suivi = $1 OR cin = $1;`;
        const result = await db.query(query, [termeRecherche]);

        if (result.rowCount === 0) return res.status(404).json({ message: 'لم يتم العثور على أي طلب بهذا الرقم.' });
        res.status(200).json({ message: 'تم العثور على الطلب بنجاح', demande: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ في الخادم أثناء البحث.' });
    }
};

// ==========================================
// 3. دالة: محرك اتخاذ القرار - تحديث مسار الملف (PUT) 🚨
// ==========================================
const traiterDemande = async (req, res) => {
    try {
        const { code_suivi, nouveau_statut, observations } = req.body;

        if (!code_suivi || !nouveau_statut) {
            return res.status(400).json({ message: 'خطأ: المرجو تحديد رقم الطلب والقرار المتخذ.' });
        }

        // 1. تحديث قاعدة البيانات
        const query = `
            UPDATE demandes 
            SET statut = $1, observations = $2 
            WHERE code_suivi = $3 
            RETURNING *;
        `;
        const values = [nouveau_statut, observations || null, code_suivi];
        const result = await db.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'الملف غير موجود في قاعدة البيانات.' });
        }

        // 2. إرسال الإشعارات اللحظية (بأمان - لا ينهار السيرفر إذا فشل السوكيت)
        try {
            const io = req.app.get('io');
            if (io) {
                if (nouveau_statut === 'en_attente_urbanisme') {
                    io.emit('alerte_urb', { message: `ملف جديد أُحيل للدراسة التقنية: ${code_suivi}` });
                } else if (nouveau_statut === 'en_attente_licence') {
                    io.emit('alerte_licence', { message: `ملف جاهز لإصدار الرخصة النهائية: ${code_suivi}` });
                }
            }
        } catch (socketErr) {
            console.error('⚠️ فشل إرسال إشعار Socket.io ولكن سيستمر العمل:', socketErr);
        }

        // 3. الرد بنجاح
        return res.status(200).json({
            message: 'تم تحديث المسار الإداري للملف بنجاح!',
            statut_actuel: result.rows[0].statut,
            demande: result.rows[0]
        });

    } catch (error) {
        console.error('❌ خطأ في محرك القرار:', error);
        return res.status(500).json({ 
            message: 'حدث خطأ في الخادم أثناء تحديث الملف.',
            error: error.message 
        });
    }
};

// تصدير الدوال الثلاث
module.exports = {
    getDemandesEco,
    rechercherDemande,
    traiterDemande
};