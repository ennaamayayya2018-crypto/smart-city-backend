const cloudinary = require('cloudinary').v2;
const db = require('../config/db');

// إعدادات Cloudinary
cloudinary.config({ 
  cloud_name: 'dswrytidw', 
  api_key: '511245475377128', 
  api_secret: 'wGyeC6HjBxP4BxZItqp96kMpcXU' 
});

// 🚀 التعديل الذهبي: الاحتفاظ بصيغة الملف (PDF) لكي يقرأه المتصفح
// 🚀 الهندسة الجديدة للرفع: إجبار السحابة على فتح الملف للعرض المباشر
const uploadToCloudinary = (fileBuffer, originalName) => {
    return new Promise((resolve, reject) => {
        const isPdf = originalName.toLowerCase().endsWith('.pdf');
        
        const stream = cloudinary.uploader.upload_stream(
            { 
                folder: "smart_city_permits", 
                // 💡 السر الأول: استخدام "image" حتى مع الـ PDF يجعل Cloudinary يعرضه مباشرة داخل المتصفحات
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
            if (files[fieldName] && files[fieldName][0]) {
                // 💡 هنا نمرر الـ buffer واسم الملف الأصلي معاً
                uploadPromises.push(uploadToCloudinary(files[fieldName][0].buffer, files[fieldName][0].originalname));
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


         // 🚀 التعديل السحري 1: إطلاق رادار Socket.io لتحديث اللوحة فوراً بدون Refresh
        const io = req.app.get('io');
        if (io) {
            io.emit('alerte_eco', { message: `ملف جديد من المواطن: ${nom_complet} (${type_demande})` });
        }

        res.status(201).json({
            message: 'تم تسجيل طلبك بنجاح في السحابة الدائمة!',
            code_suivi: result.rows[0].code_suivi
        });

    } catch (error) {
        console.error('❌ خطأ في الرفع السحابي:', error);
        res.status(500).json({ message: 'فشل الرفع السحابي: ' + error.message });
    }
};

const suivreDemande = async (req, res) => {
    try {
        const { code } = req.params;
        const query = `SELECT nom_complet, type_demande, statut, observations FROM demandes WHERE code_suivi = $1`;
        const result = await db.query(query, [code]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'رقم التتبع غير موجود.' });
        
        const info = result.rows[0];
        let statusMessage = "";
        let progressPercent = 0;

        switch (info.statut) {
            case 'en_attente_eco': statusMessage = "ملفك في طور المراجعة الأولية لدى المكتب الاقتصادي."; progressPercent = 25; break;
            case 'en_attente_urbanisme': statusMessage = "ملفك قيد الدراسة التقنية والهندسية لدى مصلحة التعمير."; progressPercent = 50; break;
            case 'retour_urb_favorable':
            case 'retour_urb_defavorable': statusMessage = "انتهت الدراسة التقنية، والملف الآن في طور القرار النهائي لدى المكتب الاقتصادي."; progressPercent = 75; break;
            case 'en_attente_licence': statusMessage = "مبروك! تمت الموافقة النهائية، ملفك الآن لدى مصلحة الرخص لإعداد الوثيقة النهائية."; progressPercent = 90; break;
            case 'autorise': statusMessage = "رخصتك جاهزة! المرجو الحضور لمقر الجماعة (مصلحة الرخص) لاستلامها شخصياً."; progressPercent = 100; break;
            case 'rejete': statusMessage = `للأسف تم رفض الطلب. السبب: ${info.observations || 'غير محدد'}`; progressPercent = 100; break;
            default: statusMessage = "الملف قيد المعالجة."; progressPercent = 10;
        }

        res.status(200).json({ nom: info.nom_complet, type: info.type_demande, etat: statusMessage, progression: progressPercent });
    } catch (error) { res.status(500).json({ message: 'خطأ في التتبع.' }); }
};

module.exports = { soumettreDemande, suivreDemande };