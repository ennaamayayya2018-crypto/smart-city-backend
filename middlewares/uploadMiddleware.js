const multer = require('multer');

// 💡 هذا هو التعديل السحري: نستخدم الذاكرة بدلاً من القرص الصلب
const storage = multer.memoryStorage();

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 ميجا
}).fields([
    { name: 'document_1', maxCount: 1 },
    { name: 'document_2', maxCount: 1 },
    { name: 'document_3', maxCount: 1 },
    { name: 'document_4', maxCount: 1 }
]);

const uploadMiddleware = (req, res, next) => {
    upload(req, res, function (err) {
        if (err) return res.status(400).json({ message: "خطأ في المرفقات: " + err.message });
        next();
    });
};

module.exports = uploadMiddleware;