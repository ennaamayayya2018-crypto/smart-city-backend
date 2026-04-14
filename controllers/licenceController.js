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

// 🚀 دالة الإصدار المتكاملة (الاستخلاص المالي + الإصدار الإداري)
const delivrerLicence = async (req, res) => {
    try {
        // 1. استلام جميع البيانات من الواجهة
        const { 
            code_suivi, adresse, type_activite, surface_totale, 
            num_quittance, montant_unitaire, montant_total_paye, periodes_payees 
        } = req.body;

        if (!code_suivi) return res.status(400).json({ message: 'المرجو تحديد رقم الطلب.' });

        const files = req.files || {};
        
        // جدار الحماية: التأكد من وجود وصل الأداء
        if (!files['document_paiement'] || !files['document_paiement'][0]) {
            return res.status(400).json({ message: 'وصل الأداء المالي (PDF/صورة) إجباري لإتمام العملية.' });
        }

        // 2. الرفع السحابي للملفات
        // أ. رفع وصل الأداء (إجباري)
        const filePaiement = files['document_paiement'][0];
        const doc_paiement_url = await uploadToCloudinary(filePaiement.buffer, filePaiement.originalname);

        // ب. رفع الرخصة (اختياري)
        let document_autorisation_url = null;
        if (files['document_autorisation'] && files['document_autorisation'][0]) {
            const fileAuto = files['document_autorisation'][0];
            document_autorisation_url = await uploadToCloudinary(fileAuto.buffer, fileAuto.originalname);
        }

        // 3. تحديث جدول الطلبات (demandes)
        const updateDemandesQuery = `
            UPDATE demandes 
            SET statut = 'autorise', 
                adresse = COALESCE($1, adresse),
                type_activite = COALESCE($2, type_activite),
                surface_totale = COALESCE($3, surface_totale),
                document_autorisation = COALESCE($4, document_autorisation)
            WHERE code_suivi = $5 AND statut = 'en_attente_licence'
            RETURNING *;
        `;
        
        const resultDemande = await db.query(updateDemandesQuery, [
            adresse || null, 
            type_activite || null, 
            surface_totale || null, 
            document_autorisation_url, 
            code_suivi
        ]);

        if (resultDemande.rowCount === 0) {
            return res.status(404).json({ message: 'الملف غير متاح أو تم ترخيصه مسبقاً.' });
        }

        // 4. إدخال العملية المالية في جدول الاستخلاصات (recouvrements)
        const insertRecouvrementQuery = `
            INSERT INTO recouvrements 
            (code_suivi, periodes_payees, montant_unitaire, montant_total_paye, num_quittance, doc_paiement_pdf)
            VALUES ($1, $2::jsonb, $3, $4, $5, $6)
        `;
        
        await db.query(insertRecouvrementQuery, [
            code_suivi,
            periodes_payees, // يتم إرساله من الواجهة كـ JSON String
            montant_unitaire,
            montant_total_paye,
            num_quittance,
            doc_paiement_url
        ]);

        // 5. إرسال الرد بالنجاح
        res.status(200).json({
            message: 'تم تسجيل الاستخلاص وإصدار الرخصة بنجاح!',
            statut_actuel: resultDemande.rows[0].statut
        });

    } catch (error) {
        console.error('❌ خطأ أثناء تسليم الرخصة والاستخلاص:', error);
        res.status(500).json({ message: 'حدث خطأ في الخادم أثناء حفظ البيانات.' });
    }
};

module.exports = { getDemandesLicence, rechercherDemande, delivrerLicence };