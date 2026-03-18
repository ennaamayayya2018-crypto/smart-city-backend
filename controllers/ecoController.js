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
        // الخادم يستلم من الواجهة: رقم التتبع، القرار الجديد، وملاحظات الموظف
        const { code_suivi, nouveau_statut, observations } = req.body;

        // جدار حماية: لا يمكن اتخاذ قرار بدون تحديد الملف ونوع القرار
        if (!code_suivi || !nouveau_statut) {
            return res.status(400).json({ message: 'خطأ: المرجو تحديد رقم الطلب والقرار الإداري المتخذ.' });
        }

        // أمر SQL: قم بتحديث الحالة والملاحظات حيث رقم التتبع يساوي كذا، ثم أرجع السطر المُحدث
        const query = `
            UPDATE demandes 
            SET statut = $1, observations = $2 
            WHERE code_suivi = $3 
            RETURNING *;
        `;
        const values = [nouveau_statut, observations || null, code_suivi];
        
        const result = await db.query(query, values);
           
        // إذا أرسلنا رقم تتبع غير موجود في قاعدة البيانات
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'الملف غير موجود في قاعدة البيانات.' });
        }
         
        const io = req.app.get('io');
            if (nouveau_statut === 'en_attente_urbanisme') {
             io.emit('alerte_urb', { message: `ملف جديد أُحيل للدراسة التقنية: ${code_suivi}` });
            } else if (nouveau_statut === 'en_attente_licence') {
           io.emit('alerte_licence', { message: `ملف جاهز لإصدار الرخصة النهائية: ${code_suivi}` });
      }

        // إرسال رسالة نجاح مع تفاصيل الملف بعد التحديث
        res.status(200).json({
            message: 'تم تحديث المسار الإداري للملف بنجاح!',
            statut_actuel: result.rows[0].statut,
            demande: result.rows[0]
        });

    } catch (error) {
        console.error('❌ خطأ في محرك القرار:', error);
        res.status(500).json({ message: 'حدث خطأ في الخادم أثناء تحديث الملف.' });
    }
};

// تصدير الدوال الثلاث
module.exports = {
    getDemandesEco,
    rechercherDemande,
    traiterDemande
};