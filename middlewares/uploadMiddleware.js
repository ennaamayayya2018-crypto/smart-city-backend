const multer = require('multer');
const path = require('path');

// ==========================================
// 1. إعدادات مكان الحفظ السحابي الدقيق
// ==========================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // 🛡️ استخدام المسار المطلق لتجنب ضياع المجلد في السحابة
        // __dirname تعني مجلد middlewares، لذلك نرجع خطوة للوراء (..) ثم ندخل uploads
        const uploadPath = path.join(__dirname, '../uploads');
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // اسم فريد واحترافي
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// ==========================================
// 2. القيود: توحيد القوانين مع واجهة المواطن
// ==========================================
const fileFilter = (req, file, cb) => {
    // 🛡️ السماح بملفات PDF والصور لتتطابق مع ما سمحنا به في الواجهة
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    
    if (allowedTypes.includes(file.mimetype)) {
        return cb(null, true); // ملف سليم، تفضل
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

// 🛡️ تغليف الحارس لالتقاط الأخطاء دون انهيار السيرفر
const uploadMiddleware = (req, res, next) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // خطأ من مكتبة Multer (مثل حجم الملف كبير جداً)
            return res.status(400).json({ message: "خطأ في حجم أو عدد الملفات المرفقة: " + err.message });
        } else if (err) {
            // خطأ من فلتر الملفات (نوع غير مدعوم)
            return res.status(400).json({ message: err.message });
        }
        // كل شيء سليم، مرر الطلب للمتحكم (Controller)
        next();
    });
};

module.exports = uploadMiddleware;