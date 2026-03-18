const multer = require('multer');
const path = require('path');

// ==========================================
// 1. إعدادات مكان الحفظ وتسمية الملفات
// ==========================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // نأمر الحارس بوضع الملفات المقبولة في مجلد uploads
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        // نغير اسم الملف ليصبح فريداً (تاريخ اللحظة + الاسم الأصلي)
        // مثال: 16987654321-cin.pdf
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// ==========================================
// 2. القيود: نوع الملفات المسموح بها (PDF فقط بقرار إداري)
// ==========================================
const fileFilter = (req, file, cb) => {
    // نتحقق إذا كان نوع الملف هو PDF
    if (file.mimetype === 'application/pdf') {
        return cb(null, true); // ملف سليم، تفضل بالمرور
    } else {
        // إذا رفع صورة أو أي ملف آخر، نرفضه فوراً برسالة واضحة
        cb(new Error('مرفوض: النظام يقبل الوثائق الممسوحة ضوئياً بصيغة PDF فقط لضمان جودة ووضوح الملف.'));
    }
};

// ==========================================
// 3. القيود: حجم الملف وتجميع الحقول
// ==========================================
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // الحد الأقصى: 5 ميجابايت للملف الواحد
    fileFilter: fileFilter
}).fields([
    // هنا نخبر الحارس بأسماء الحقول الأربعة التي سيرسلها المواطن من الواجهة
    { name: 'document_1', maxCount: 1 },
    { name: 'document_2', maxCount: 1 },
    { name: 'document_3', maxCount: 1 },
    { name: 'document_4', maxCount: 1 },
    { name: 'document_autorisation', maxCount: 1 }
]);

// تصدير الحارس لاستخدامه لاحقاً
module.exports = upload;