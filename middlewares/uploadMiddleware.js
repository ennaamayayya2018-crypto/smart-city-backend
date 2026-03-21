const multer = require('multer');
const path = require('path');
const os = require('os'); // 🚨 استدعاء مكتبة نظام التشغيل للوصول لمجلد /tmp السحابي

// ==========================================
// 1. إعدادات مكان الحفظ السحابي الدقيق
// ==========================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // 🛡️ الحل السحري لخوادم جوجل: استخدام المجلد المؤقت للنظام
        cb(null, os.tmpdir());
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// ==========================================
// 2. القيود: توحيد القوانين مع واجهة المواطن
// ==========================================
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        return cb(null, true); 
    } else {
        cb(new Error('مرفوض: النظام يقبل فقط ملفات PDF أو الصور (JPG/PNG).'));
    }
};

// ==========================================
// 3. التجميع والإطلاق
// ==========================================
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 ميجابايت كحد أقصى
    fileFilter: fileFilter
}).fields([
    { name: 'document_1', maxCount: 1 },
    { name: 'document_2', maxCount: 1 },
    { name: 'document_3', maxCount: 1 },
    { name: 'document_4', maxCount: 1 },
    { name: 'document_autorisation', maxCount: 1 }
]);

// 🛡️ تغليف الحارس
const uploadMiddleware = (req, res, next) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: "خطأ في حجم أو عدد الملفات المرفقة: " + err.message });
        } else if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
};

module.exports = uploadMiddleware;