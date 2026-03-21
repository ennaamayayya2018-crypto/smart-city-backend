const multer = require('multer');

// 💡 التعديل الجوهري: استخدام ذاكرة الرام بدلاً من الهارد ديسك
const storage = multer.memoryStorage();

// القيود: قبول PDF والصور فقط
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true); 
    } else {
        cb(new Error('مرفوض: النظام يقبل فقط ملفات PDF أو الصور (JPG/PNG).'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // زيادة الحد لـ 10 ميجا لضمان عدم فشل الملفات الكبيرة
    fileFilter: fileFilter
}).fields([
    { name: 'document_1', maxCount: 1 },
    { name: 'document_2', maxCount: 1 },
    { name: 'document_3', maxCount: 1 },
    { name: 'document_4', maxCount: 1 },
    { name: 'document_autorisation', maxCount: 1 }
]);

const uploadMiddleware = (req, res, next) => {
    upload(req, res, function (err) {
        if (err) {
            return res.status(400).json({ message: "خطأ في المرفقات: " + err.message });
        }
        next();
    });
};

module.exports = uploadMiddleware;