const jwt = require('jsonwebtoken');

// ==========================================
// 1. حارس التحقق من التذكرة (هل الموظف مسجل الدخول؟)
// ==========================================
const verifierToken = (req, res, next) => {
    // 1. جلب التذكرة من ترويسة الطلب (Headers)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // استخراج التذكرة من صيغة "Bearer TOKEN"

    // 2. إذا لم يرسل الموظف تذكرة
    if (!token) {
        return res.status(401).json({ message: 'غير مصرح لك بالدخول، يرجى تسجيل الدخول أولاً.' });
    }

    // 3. التحقق من صحة التذكرة باستخدام المفتاح السري
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // حفظ بيانات الموظف (id, role) مؤقتاً في الطلب لاستخدامها لاحقاً
        next(); // التذكرة سليمة، اسمح له بالمرور للمحطة التالية
    } catch (error) {
        return res.status(403).json({ message: 'التذكرة غير صالحة أو انتهت صلاحيتها.' });
    }
};

// ==========================================
// 2. حارس الصلاحيات (هل يملك صلاحية دخول هذه المصلحة؟)
// ==========================================
const verifierRole = (rolesAutorises) => {
    return (req, res, next) => {
        // نتحقق مما إذا كان دور الموظف (الموجود في التذكرة) مسموحاً له بالمرور
        if (!req.user || !rolesAutorises.includes(req.user.role)) {
            return res.status(403).json({ message: 'تنبيه إداري: ليس لديك الصلاحية لدخول هذه المصلحة .' });
        }
        next(); // الصلاحية مطابقة، اسمح له بالمرور
    };
};

module.exports = {
    verifierToken,
    verifierRole
};