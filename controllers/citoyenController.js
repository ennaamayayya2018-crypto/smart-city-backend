const cloudinary = require('cloudinary').v2;
const db = require('../config/db');

// إعدادات Cloudinary
cloudinary.config({ 
  cloud_name: 'dswrytidw', 
  api_key: '511245475377128', 
  api_secret: 'wGyeC6HjBxP4BxZItqp96kMpcXU' 
});

// دالة الرفع: تأخذ الـ buffer مباشرة وترسله للسحابة
const uploadToCloudinary = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: "smart_city_permits", resource_type: "auto" },
            (error, result) => {
                if (error) reject(error);
                else resolve(result.secure_url);
            }
        );
        // 🚀 هنا نمرر الـ buffer الفعلي للملف
        stream.end(fileBuffer);
    });
};

const soumettreDemande = async (req, res) => {
    try {
        const { type_demande, nom_complet, cin, numero_whatsapp } = req.body;
        const files = req.files || {};

        if (Object.keys(files).length < 2) {
            return res.status(400).json({ message: 'تنبيه: يجب إرفاق وثيقتين على الأقل.' });
        }

        const uploadPromises = [];
        for (let i = 1; i <= 4; i++) {
            const fieldName = `document_${i}`;
            // التأكد من أن الحقل موجود ويحتوي على ملف
            if (files[fieldName] && files[fieldName][0]) {
                // نمرر الـ buffer الموجود في الذاكرة
                uploadPromises.push(uploadToCloudinary(files[fieldName][0].buffer));
            } else {
                uploadPromises.push(Promise.resolve(null));
            }
        }

        const urls = await Promise.all(uploadPromises);

        const code_suivi = 'TRK-' + Date.now();
        const query = `
            INSERT INTO demandes 
            (code_suivi, type_demande, nom_complet, cin, numero_whatsapp, document_1, document_2, document_3, document_4, statut)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'en_attente_eco')
            RETURNING code_suivi;
        `;
        
        const values = [code_suivi, type_demande, nom_complet, cin, numero_whatsapp, ...urls];
        const result = await db.query(query, values);

        res.status(201).json({
            message: 'تم تسجيل طلبك بنجاح في السحابة الدائمة!',
            code_suivi: result.rows[0].code_suivi
        });

    } catch (error) {
        console.error('❌ خطأ في الرفع السحابي:', error);
        res.status(500).json({ message: 'فشل الرفع السحابي: ' + error.message });
    }
};

// ... دالة suivreDemande تبقى كما هي لديكِ ...
const suivreDemande = async (req, res) => {
    try {
        const { code } = req.params;
        const query = `SELECT nom_complet, type_demande, statut, observations FROM demandes WHERE code_suivi = $1`;
        const result = await db.query(query, [code]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'رقم التتبع غير موجود.' });
        
        const info = result.rows[0];
        // ... منطق الحالات كما هو ...
        res.status(200).json({ nom: info.nom_complet, type: info.type_demande, etat: "قيد المعالجة", progression: 50 });
    } catch (error) { res.status(500).json({ message: 'خطأ في التتبع.' }); }
};

module.exports = { soumettreDemande, suivreDemande };