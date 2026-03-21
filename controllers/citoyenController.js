const db = require('../config/db'); 

// ==========================================
// دالة: تسجيل طلب جديد من طرف المواطن (مرونة الوثائق)
// ==========================================
const soumettreDemande = async (req, res) => {
    try {
        // 1. استلام البيانات النصية
        const { type_demande, nom_complet, cin, numero_whatsapp } = req.body;

        // 2. التحقق من النصوص
        if (!type_demande || !nom_complet || !cin || !numero_whatsapp) {
            return res.status(400).json({ message: 'تنبيه: المرجو ملء جميع الحقول النصية.' });
        }

        // 3. 🚨 التعديل الجديد: التحقق من عدد الوثائق المرفوعة 🚨
        const files = req.files || {}; // استلام الملفات من الحارس
        const nombreDeDocuments = Object.keys(files).length; // حساب عدد الوثائق المرفوعة

        // إذا كان عدد الوثائق أقل من 2، نوقف العملية
        if (nombreDeDocuments < 2) {
            return res.status(400).json({ 
                message: 'تنبيه: يجب إرفاق وثيقتين على الأقل (بصيغة PDF) لإتمام تسجيل الطلب.' 
            });
        }

        // 4. استخراج المسارات بأمان (إذا لم يرفع الوثيقة، نضع مكانها null لكي لا يغضب الخادم)
        // استخراج اسم الملف فقط لكي لا نُفسد الروابط
          const doc1_path = files.document_1 ? files.document_1[0].filename : null;
          const doc2_path = files.document_2 ? files.document_2[0].filename : null;
          const doc3_path = files.document_3 ? files.document_3[0].filename : null;
          const doc4_path = files.document_4 ? files.document_4[0].filename : null;

        // 5. توليد رقم تتبع فريد
        const code_suivi = 'TRK-' + Date.now();

        // 6. أمر SQL الشامل
        const query = `
            INSERT INTO demandes 
            (code_suivi, type_demande, nom_complet, cin, numero_whatsapp, document_1, document_2, document_3, document_4)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING code_suivi;
        `;
        
        // 7. القيم التي ستُرسل لقاعدة البيانات
        const values = [
            code_suivi, type_demande, nom_complet, cin, numero_whatsapp, 
            doc1_path, doc2_path, doc3_path, doc4_path
        ];

        // 8. التنفيذ
        const result = await db.query(query, values);

        // إطلاق إشعار لحظي للمكتب الاقتصادي
         req.app.get('io').emit('alerte_eco', { 
         message: `طلب جديد من المواطن: ${nom_complet}`, 
           code: code_suivi 
        });

        // 9. إرسال استجابة النجاح
        res.status(201).json({
            message: 'تم تسجيل الطلب بنجاح! احتفظ برقم التتبع الخاص بك.',
            code_suivi: result.rows[0].code_suivi
        });

    } catch (error) {
        console.error('❌ خطأ أثناء تسجيل طلب المواطن:', error);
        res.status(500).json({ message: 'حدث خطأ في الخادم أثناء معالجة الطلب.' });
    }
};



// دالة تتبع الملف للمواطن
const suivreDemande = async (req, res) => {
    try {
        const { code } = req.params; // سنمرر الكود عبر الرابط

        // نجلب فقط البيانات التي يحق للمواطن رؤيتها
        const query = `SELECT nom_complet, type_demande, statut, observations FROM demandes WHERE code_suivi = $1`;
        const result = await db.query(query, [code]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'عذراً، رقم التتبع هذا غير صحيح أو غير موجود في سجلاتنا.' });
        }

        const info = result.rows[0];
        let statusMessage = "";
        let progressPercent = 0;

        // محرك ترجمة الحالات (Status Engine)
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

// أضفها هنا
// التصدير المصحح
module.exports = {
    soumettreDemande, // غيرنا الاسم هنا ليتطابق مع اسم الدالة في الأعلى
    suivreDemande 
};