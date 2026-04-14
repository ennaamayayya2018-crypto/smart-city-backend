const db = require('../config/db'); 
const cloudinary = require('cloudinary').v2;

cloudinary.config({ 
  cloud_name: 'dswrytidw', 
  api_key: '511245475377128', 
  api_secret: 'wGyeC6HjBxP4BxZItqp96kMpcXU' 
});

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

const getDemandesEco = async (req, res) => {
    try {
        const query = `SELECT * FROM demandes WHERE statut IN ('en_attente_eco', 'retour_urb_favorable', 'retour_urb_defavorable') ORDER BY date_creation DESC;`;
        const result = await db.query(query);
        res.status(200).json({ message: 'تم جلب الطلبات', nombre_demandes: result.rowCount, demandes: result.rows });
    } catch (error) { res.status(500).json({ message: 'حدث خطأ في الخادم.' }); }
};

const rechercherDemande = async (req, res) => {
    try {
        const termeRecherche = req.query.q;
        if (!termeRecherche) return res.status(400).json({ message: 'المرجو إدخال رقم التتبع أو رقم البطاقة.' });
        const query = `SELECT * FROM demandes WHERE code_suivi = $1 OR cin = $1;`;
        const result = await db.query(query, [termeRecherche]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'لم يتم العثور على أي طلب.' });
        res.status(200).json({ message: 'تم العثور', demande: result.rows[0] });
    } catch (error) { res.status(500).json({ message: 'حدث خطأ.' }); }
};

// ==========================================
// 3. تحديث دالة معالجة الطلب (دعم الرفع السحابي للمحاضر)
// ==========================================
const traiterDemande = async (req, res) => {
    try {
        // بما أننا نرسل FormData الآن، نستخرج البيانات هكذا
        const { code_suivi, nouveau_statut, observations } = req.body;

        if (!code_suivi || !nouveau_statut) {
            return res.status(400).json({ message: 'المرجو تحديد رقم الطلب والقرار المتخذ.' });
        }

        let doc_pv_constat_url = null;
        let doc_pv_recouvrement_url = null;
        const files = req.files || {};

        // 1. رفع محضر المعاينة (اختياري)
        if (files['doc_pv_constat'] && files['doc_pv_constat'][0]) {
            const fileC = files['doc_pv_constat'][0];
            doc_pv_constat_url = await uploadToCloudinary(fileC.buffer, fileC.originalname);
        }

        // 2. رفع محضر الاستخلاص (اختياري)
        if (files['doc_pv_recouvrement'] && files['doc_pv_recouvrement'][0]) {
            const fileR = files['doc_pv_recouvrement'][0];
            doc_pv_recouvrement_url = await uploadToCloudinary(fileR.buffer, fileR.originalname);
        }

        // 3. تحديث مسار الملف والمحاضر المرفقة
        const query = `
            UPDATE demandes 
            SET statut = $1, 
                observations = COALESCE($2, observations),
                doc_pv_constat = COALESCE($3, doc_pv_constat),
                doc_pv_recouvrement = COALESCE($4, doc_pv_recouvrement)
            WHERE code_suivi = $5 
            RETURNING *;
        `;
        const values = [nouveau_statut, observations || null, doc_pv_constat_url, doc_pv_recouvrement_url, code_suivi];
        const result = await db.query(query, values);

        if (result.rowCount === 0) return res.status(404).json({ message: 'الملف غير موجود.' });

        try {
            const io = req.app.get('io');
            if (io) {
                if (nouveau_statut === 'en_attente_urbanisme') io.emit('alerte_urb', { message: `ملف للتقييم التقني: ${code_suivi}` });
                else if (nouveau_statut === 'en_attente_licence') io.emit('alerte_licence', { message: `ملف للإصدار: ${code_suivi}` });
            }
        } catch (err) { console.error('Socket Error', err); }

        return res.status(200).json({ message: 'تم التحديث بنجاح!', statut_actuel: result.rows[0].statut, demande: result.rows[0] });

    } catch (error) {
        console.error('❌ Error Traiter:', error);
        return res.status(500).json({ message: 'خطأ أثناء المعالجة وحفظ الملفات.', error: error.message });
    }
};

const enregistrerPaiement = async (req, res) => {
    try {
        const { code_suivi, num_quittance, montant_unitaire, montant_total_paye, periodes_payees } = req.body;
        if (!code_suivi || !num_quittance || !periodes_payees) return res.status(400).json({ message: 'بيانات غير مكتملة.' });
        if (!req.file) return res.status(400).json({ message: 'وصل الأداء المالي إجباري.' });

        const checkQuery = `SELECT id FROM demandes WHERE code_suivi = $1 AND statut = 'autorise'`;
        const checkResult = await db.query(checkQuery, [code_suivi]);
        if (checkResult.rowCount === 0) return res.status(403).json({ message: 'غير مرخص نهائياً.' });

        const doc_url = await uploadToCloudinary(req.file.buffer, req.file.originalname);
        const insertQuery = `INSERT INTO recouvrements (code_suivi, periodes_payees, montant_unitaire, montant_total_paye, num_quittance, doc_paiement_pdf) VALUES ($1, $2::jsonb, $3, $4, $5, $6)`;
        await db.query(insertQuery, [code_suivi, periodes_payees, montant_unitaire, montant_total_paye, num_quittance, doc_url]);
        res.status(200).json({ message: 'تم التسجيل بنجاح! 💰' });
    } catch (error) { res.status(500).json({ message: 'خطأ في الخادم.' }); }
};

module.exports = { getDemandesEco, rechercherDemande, traiterDemande, enregistrerPaiement };