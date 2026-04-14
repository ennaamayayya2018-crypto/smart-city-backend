const db = require('../config/db'); 
const cloudinary = require('cloudinary').v2;

// ☁️ إعدادات Cloudinary (خاصة برفع وصولات الأداء الجديدة)
cloudinary.config({ 
  cloud_name: 'dswrytidw', 
  api_key: '511245475377128', 
  api_secret: 'wGyeC6HjBxP4BxZItqp96kMpcXU' 
});

// دالة مساعدة للرفع السحابي
const uploadToCloudinary = (fileBuffer, originalName) => {
    return new Promise((resolve, reject) => {
        const isPdf = originalName.toLowerCase().endsWith('.pdf');
        const stream = cloudinary.uploader.upload_stream(
            { 
                folder: "smart_city_permits", 
                resource_type: "image", 
                format: isPdf ? "pdf" : undefined
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result.secure_url);
            }
        );
        stream.end(fileBuffer);
    });
};

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
// 3. دالة: محرك اتخاذ القرار - تحديث مسار الملف (PUT)
// ==========================================
const traiterDemande = async (req, res) => {
    try {
        const { code_suivi, nouveau_statut, observations } = req.body;

        if (!code_suivi || !nouveau_statut) {
            return res.status(400).json({ message: 'خطأ: المرجو تحديد رقم الطلب والقرار المتخذ.' });
        }

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

// ==========================================
// 4. 💰 دالة: تسجيل استخلاص مالي جديد للمتأخرات (POST)
// ==========================================
const enregistrerPaiement = async (req, res) => {
    try {
        const { code_suivi, num_quittance, montant_unitaire, montant_total_paye, periodes_payees } = req.body;

        // 1. جدار الحماية للبيانات
        if (!code_suivi || !num_quittance || !periodes_payees) {
            return res.status(400).json({ message: 'المرجو إدخال جميع البيانات المالية.' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'وصل الأداء المالي (PDF/صورة) إجباري.' });
        }

        // 2. التأكد أن الملف حاصل على الرخصة النهائية (autorise)
        const checkQuery = `SELECT id FROM demandes WHERE code_suivi = $1 AND statut = 'autorise'`;
        const checkResult = await db.query(checkQuery, [code_suivi]);
        if (checkResult.rowCount === 0) {
            return res.status(403).json({ message: 'لا يمكن تسجيل استخلاص لملف غير مرخص نهائياً.' });
        }

        // 3. رفع الوصل للسحابة
        const doc_paiement_url = await uploadToCloudinary(req.file.buffer, req.file.originalname);

        // 4. حفظ الدفعة في جدول الاستخلاصات
        const insertQuery = `
            INSERT INTO recouvrements 
            (code_suivi, periodes_payees, montant_unitaire, montant_total_paye, num_quittance, doc_paiement_pdf)
            VALUES ($1, $2::jsonb, $3, $4, $5, $6)
            RETURNING *;
        `;
        
        await db.query(insertQuery, [
            code_suivi,
            periodes_payees, // يحفظ كمصفوفة JSON
            montant_unitaire,
            montant_total_paye,
            num_quittance,
            doc_paiement_url
        ]);

        res.status(200).json({ message: 'تم تسجيل الاستخلاص المالي وأرشفة الوصل بنجاح! 💰' });

    } catch (error) {
        console.error('❌ خطأ أثناء تسجيل الاستخلاص المستمر:', error);
        res.status(500).json({ message: 'حدث خطأ في الخادم أثناء تسجيل الدفعة.' });
    }
};

// تصدير جميع الدوال
module.exports = {
    getDemandesEco,
    rechercherDemande,
    traiterDemande,
    enregistrerPaiement
};