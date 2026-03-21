require('dotenv').config(); // جلب المتغيرات من ملف .env
const express = require('express');
const path = require('path'); // للتعامل مع مسارات الملفات
const cors = require('cors');
const db = require('./config/db'); // هنا نستدعي الجسر الذي صنعناه في الخطوة السابقة!

const fs = require('fs');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// 🚨 الإضافة الجديدة 1: استدعاء مكتبات الويب سوكيت
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const port = process.env.PORT || 3000;

// ==========================================
// 1. إعدادات الترجمة والحماية (Middlewares)
// ==========================================
app.use(cors()); // السماح لواجهات التطبيق بالتواصل مع الخادم
app.use(express.json()); // السماح للخادم بفهم البيانات المكتوبة بصيغة JSON
// السماح للمتصفح بقراءة الملفات المرفوعة داخل مجلد uploads
// ==========================================
// مسار تحميل ومعاينة الملفات (مضاد لفقدان الذاكرة السحابي)
// ==========================================
const fs = require('fs');
const os = require('os');

app.get('/uploads/:filename', (req, res) => {
    const fileName = req.params.filename;
    const filePath = path.join(os.tmpdir(), fileName);

    // التحقق هل الملف لا يزال موجوداً أم تبخر في السحابة؟
    if (fs.existsSync(filePath)) {
        // إذا كان موجوداً، نرسله فوراً للواجهة
        res.sendFile(filePath);
    } else {
        // إذا تبخر، نرسل رسالة واضحة للمبرمجة!
        console.error(`❌ الملف مفقود: ${filePath}`);
        res.status(404).send(`
            <div style="text-align:center; padding:50px; font-family:tahoma;">
                <h2 style="color:red;">عذراً، الملف غير موجود!</h2>
                <p>يبدو أن سيرفر Google Cloud قام بمسح الذاكرة المؤقتة (Stateless Container).</p>
                <p>اسم الملف المفقود: <b>${fileName}</b></p>
            </div>
        `);
    }
});
// السماح للخادم بعرض ملفات واجهة المستخدم (HTML والصور للزوار)
app.use(express.static(__dirname));

// ==========================================
// 2. الروابط (Routes) - توجيه الطلبات لمساراتها
// ==========================================
const citoyenRoutes = require('./routes/citoyenRoutes'); 
const ecoRoutes = require('./routes/ecoRoutes'); 
const urbanismeRoutes = require('./routes/urbanismeRoutes');
const licenceRoutes = require('./routes/licenceRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

// توجيه المسارات
app.use('/api/citoyen', citoyenRoutes); 
app.use('/api/eco', ecoRoutes); 
app.use('/api/urbanisme', urbanismeRoutes);
app.use('/api/licence', licenceRoutes);
app.use('/api/auth', authRoutes);   
app.use('/api/admin', adminRoutes);

// مسار تجريبي مؤقت للتأكد من عمل السيرفر
app.get('/', (req, res) => {
    res.send('🚀 خادم نظام شغل الملك العمومي يعمل بنجاح!');
});

// ==========================================
// 3. تهيئة القلب النابض والإشعارات اللحظية (Socket.io)
// ==========================================
// 🚨 الإضافة الجديدة 2: تغليف تطبيق Express بخادم HTTP الأساسي
const server = http.createServer(app);

// 🚨 الإضافة الجديدة 3: تشغيل رادار Socket.io على هذا الخادم
const io = new Server(server, {
    cors: { origin: "*" } // السماح لجميع الواجهات بالاتصال
});

// 🚨 الإضافة الجديدة 4: جعل الرادار متاحاً لجميع المتحكمات لكي يرسلوا الإشعارات
app.set('io', io);

// ==========================================
// 4. تشغيل الخادم (Server Start)
// ==========================================
// 🚨 الإضافة الجديدة 5: استخدام server.listen بدلاً من app.listen
server.listen(port, () => {
    console.log(`🚀 السيرفر شغال ومستعد لاستقبال الطلبات على المنفذ: ${port}`);
    console.log(`📡 رادار الإشعارات اللحظية (Socket.io) قيد العمل...`);
});