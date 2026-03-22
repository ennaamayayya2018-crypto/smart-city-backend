const db = require('../config/db');
const cloudinary = require('cloudinary').v2;

// إعدادات Cloudinary
cloudinary.config({ 
  cloud_name: 'dswrytidw', 
  api_key: '511245475377128', 
  api_secret: 'wGyeC6HjBxP4BxZItqp96kMpcXU' 
});

// دالة الرفع السحابي
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

const getDemandesLicence = async (req, res) => {
    try {
        const query = `SELECT * FROM demandes WHERE statut = 'en_attente_licence' ORDER BY date_creation ASC;`;
        const result = await db.query(query);
        res.status(200).json({ message: 'تم الجلب', nombre_demandes: result.rowCount, demandes: result.rows });
    } catch (error) { res.status(500).json({ message: 'حدث خطأ في الخادم.' }); }
};

const rechercherDemande = async (req, res) => {
    try {
        const termeRecherche = req.query.q;
        if (!termeRecherche) return res.status(400).json({ message: 'المرجو إدخال رقم التتبع.' });
        const query = `SELECT * FROM demandes WHERE (code_suivi = $1 OR cin = $1) AND statut = 'en_attente_licence';`;
        const result = await db.query(query, [termeRecherche]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'لم يتم العثور على الطلب.' });
        res.status(200).json({ message: 'تم العثور', demande: result.rows[0] });
    } catch (error) { res.status(500).json({ message: 'خطأ أثناء البحث.' }); }
};

// 🚀 دالة الإصدار النهائية مع الرفع السحابي
const delivrerLicence = async (req, res) => {
    try {
        const { code_suivi } = req.body;
        if (!code_suivi) return res.status(400).json({ message: 'المرجو تحديد رقم الطلب.' });

        let document_autorisation = null;

        // التحقق مما إذا قام الموظف برفع ملف الرخصة
        const files = req.files || {};
        if (files['document_autorisation'] && files['document_autorisation'][0]) {
            const file = files['document_autorisation'][0];
            // رفع الملف للسحابة
            document_autorisation = await uploadToCloudinary(file.buffer, file.originalname);
        }

        // تحديث قاعدة البيانات
        const query = `
            UPDATE demandes 
            SET statut = 'autorise', 
                document_autorisation = COALESCE($1, document_autorisation)
            WHERE code_suivi = $2 AND statut = 'en_attente_licence'
            RETURNING *;
        `;
        
        const result = await db.query(query, [document_autorisation, code_suivi]);

        if (result.rowCount === 0) return res.status(404).json({ message: 'الملف غير متاح.' });

        res.status(200).json({
            message: 'تم الإصدار وحفظ الرخصة في الأرشيف بنجاح!',
            statut_actuel: result.rows[0].statut
        });

    } catch (error) {
        console.error('❌ خطأ أثناء تسليم الرخصة:', error);
        res.status(500).json({ message: 'حدث خطأ في الخادم.' });
    }
};

module.exports = { getDemandesLicence, rechercherDemande, delivrerLicence };