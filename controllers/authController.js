const db = require('../config/db');
const bcrypt = require('bcryptjs'); // مكتبة تشفير كلمات السر
const jwt = require('jsonwebtoken'); // مكتبة صناعة التذاكر الرقمية

// ==========================================
// 1. دالة إنشاء حساب موظف جديد (سنحميها لاحقاً لكي لا يستخدمها إلا المدير)
// ==========================================
const creerCompte = async (req, res) => {
    try {
        const { nom_complet, email, mot_de_passe, role } = req.body;

        // التحقق من إدخال جميع البيانات
        if (!nom_complet || !email || !mot_de_passe || !role) {
            return res.status(400).json({ message: 'المرجو إدخال جميع البيانات.' });
        }

        // 🚨 عملية التشفير (Hashing): لا نحفظ كلمة السر كما هي أبداً!
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(mot_de_passe, salt);

        // إدخال الموظف في قاعدة البيانات
        const query = `
            INSERT INTO utilisateurs (nom_complet, email, mot_de_passe, role) 
            VALUES ($1, $2, $3, $4) RETURNING id, nom_complet, role;
        `;
        const result = await db.query(query, [nom_complet, email, hashedPassword, role]);

        res.status(201).json({ 
            message: 'تم إنشاء حساب الموظف بنجاح!', 
            user: result.rows[0] 
        });

    } catch (error) {
        // إذا كان الإيميل موجوداً مسبقاً (لأننا جعلناه UNIQUE في قاعدة البيانات)
        if (error.code === '23505') {
            return res.status(400).json({ message: 'هذا البريد الإلكتروني مسجل مسبقاً.' });
        }
        console.error('❌ خطأ في إنشاء الحساب:', error);
        res.status(500).json({ message: 'حدث خطأ في الخادم.' });
    }
};

// ==========================================
// 2. دالة تسجيل الدخول (Login) ومنح التذكرة (Token)
// ==========================================
const login = async (req, res) => {
    try {
        const { email, mot_de_passe } = req.body;

        // 1. هل البريد الإلكتروني موجود في النظام؟
        const query = `SELECT * FROM utilisateurs WHERE email = $1`;
        const result = await db.query(query, [email]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'البريد الإلكتروني أو كلمة السر غير صحيحة.' });
        }

        const user = result.rows[0];

        // 2. هل كلمة السر مطابقة للكلمة المشفرة؟
        const isMatch = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
        if (!isMatch) {
            return res.status(400).json({ message: 'البريد الإلكتروني أو كلمة السر غير صحيحة.' });
        }

        // 3. النجاح! نصنع التذكرة الرقمية (Token)
        // التذكرة ستحمل رقم الموظف ودوره (admin, eco, urbanisme...)
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET, // نستخدم المفتاح السري من ملف .env
             // صلاحية التذكرة 8 ساعات (مدة دوام العمل)
        );

        // 4. تسليم التذكرة للموظف
        res.status(200).json({
            message: 'تم تسجيل الدخول بنجاح!',
            token: token,
            user: { nom: user.nom_complet, role: user.role }
        });

    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        res.status(500).json({ message: 'حدث خطأ في الخادم أثناء تسجيل الدخول.' });
    }
};

module.exports = {
    creerCompte,
    login
};