const cloudinary = require('cloudinary').v2;
const db = require('../config/db');

// 🔑 إعدادات الربط مع سحابة Cloudinary (تم استخراجها من حسابك)
cloudinary.config({ 
  cloud_name: 'dswrytidw', 
  api_key: '511245475377128', 
  api_secret: 'wGyeC6HjBxP4BxZItqp96kMpcXU' // ⚠️ استبدلي هذا النص بالسر الحقيقي الذي ظهر لكِ
});

// ==========================================
// دالة: تسجيل طلب جديد من طرف المواطن (الرفع للسحابة)
// ==========================================
const soumettreDemande = async (req, res) => {
    try {
        const { type_demande, nom_complet, cin, numero_whatsapp } = req.body;
        const files = req.files || {};

        // التحقق من وجود وثيقتين على الأقل
        if (Object.keys(files).length < 2) {
            return res.status(400).json({ message: 'تنبيه: يجب إرفاق وثيقتين على الأقل.' });
        }

        // دالة الرفع للسحابة (تحويل Buffer إلى رابط سحابي دائم)
        const uploadFile = (file) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "smart_city_permits", resource_type: "auto" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result.secure_url);
                    }
                );
                stream.end(file[0].buffer);
            });
        };

        // رفع الملفات بالتوازي لضمان السرعة
        const uploadPromises = [];
        for (let i = 1; i <= 4; i++) {
            if (files[`document_${i}`]) {
                uploadPromises.push(uploadFile(files[`document_${i}`]));
            } else {
                uploadPromises.push(Promise.resolve(null));
            }
        }

        const [url1, url2, url3, url4] = await Promise.all(uploadPromises);

        const code_suivi = 'TRK-' + Date.now();
        const query = `
            INSERT INTO demandes 
            (code_suivi, type_demande, nom_complet, cin, numero_whatsapp, document_1, document_2, document_3, document_4, statut)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'en_attente_eco')
            RETURNING code_suivi;
        `;
        
        const values = [code_suivi, type_demande, nom_complet, cin, numero_whatsapp, url1, url2, url3, url4];
        const result = await db.query(query, values);

        res.status(201).json({
            message: 'تم تسجيل طلبك بنجاح في السحابة الدائمة!',
            code_suivi: result.rows[0].code_suivi
        });

    } catch (error) {
        console.error('❌ خطأ في الرفع السحابي:', error);
        res.status(500).json({ message: 'فشل الرفع السحابي، يرجى التحقق من الإعدادات.' });
    }
};

// ==========================================
// دالة تتبع الملف للمواطن
// ==========================================
const suivreDemande = async (req, res) => {
    try {
        const { code } = req.params;

        const query = `SELECT nom_complet, type_demande, statut, observations FROM demandes WHERE code_suivi = $1`;
        const result = await db.query(query, [code]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'عذراً، رقم التتبع هذا غير صحيح أو غير موجود في سجلاتنا.' });
        }

        const info = result.rows[0];
        let statusMessage = "";
        let progressPercent = 0;

        switch (info.statut) {
            case 'en_attente_eco':
                statusMessage = "ملفك في طور المراجعة الأولية لدى المكتب الاقتصادي.";
                progressPercent = 25;
                break;
            case 'en_attente_urbanisme':
                statusMessage = "ملفك قيد الدراسة التقنية والهندسية لدى مصلحة التعمير.";
                progressPercent = 50;
                break;
            case 'retour_urb_favorable':
            case 'retour_urb_defavorable':
                statusMessage = "انتهت الدراسة التقنية، والملف الآن في طور القرار النهائي لدى المكتب الاقتصادي.";
                progressPercent = 75;
                break;
            case 'en_attente_licence':
                statusMessage = "مبروك! تمت الموافقة النهائية، ملفك الآن لدى مصلحة الرخص لإعداد الوثيقة النهائية.";
                progressPercent = 90;
                break;
            case 'autorise':
                statusMessage = "رخصتك جاهزة! المرجو الحضور لمقر الجماعة (مصلحة الرخص) لاستلامها شخصياً.";
                progressPercent = 100;
                break;
            case 'rejete':
                statusMessage = `للأسف تم رفض الطلب. السبب: ${info.observations || 'غير محدد'}`;
                progressPercent = 100;
                break;
            default:
                statusMessage = "الملف قيد المعالجة.";
                progressPercent = 10;
        }

        res.status(200).json({
            nom: info.nom_complet,
            type: info.type_demande,
            etat: statusMessage,
            progression: progressPercent
        });

    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ أثناء محاولة تتبع الملف.' });
    }
};

// التصدير
module.exports = {
    soumettreDemande,
    suivreDemande 
};