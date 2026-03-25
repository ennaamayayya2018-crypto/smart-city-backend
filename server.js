require('dotenv').config(); // جلب المتغيرات من ملف .env
const express = require('express');
const path = require('path'); // للتعامل مع مسارات الملفات
const cors = require('cors');
const db = require('./config/db'); // الجسر لقاعدة البيانات

// 🛡️ استدعاء المكتبات مرة واحدة فقط هنا في الأعلى
const fs = require('fs');
const os = require('os');

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// استدعاء مكتبات الويب سوكيت
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const port = process.env.PORT || 3000;

// ==========================================
// 1. إعدادات الترجمة والحماية (Middlewares)
// ==========================================
// 🛡️ السماح فقط لروابط مشروعك بالوصول للبيانات
app.use(cors({
  origin: [
    'https://rokhsa-laayoune.vercel.app',
    'http://localhost:3000' // للتحسينات المستقبلية في بيئة التطوير
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
})); 
app.use(express.json()); 

// ==========================================
// 🌟 مسار تحميل ومعاينة الملفات (مضاد لفقدان الذاكرة السحابي)
// ==========================================
app.get('/uploads/:filename', (req, res) => {
    const fileName = req.params.filename;
    const filePath = path.join(os.tmpdir(), fileName);

    // التحقق هل الملف لا يزال موجوداً أم تبخر في السحابة؟
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        console.error(`❌ الملف مفقود: ${filePath}`);
        res.status(404).send(`
            <div style="text-align:center; padding:50px; font-family:tahoma; background:#f8fafc;">
                <h2 style="color:#ef4444;">عذراً، الملف غير موجود!</h2>
                <p>يبدو أن سيرفر Google Cloud قام بمسح الذاكرة المؤقتة.</p>
                <p>اسم الملف المفقود: <b style="color:#1e3a8a;">${fileName}</b></p>
            </div>
        `);
    }
});

app.use(express.static(__dirname));

// ==========================================
// 2. الروابط (Routes) 
// ==========================================
const citoyenRoutes = require('./routes/citoyenRoutes'); 
const ecoRoutes = require('./routes/ecoRoutes'); 
const urbanismeRoutes = require('./routes/urbanismeRoutes');
const licenceRoutes = require('./routes/licenceRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/api/citoyen', citoyenRoutes); 
app.use('/api/eco', ecoRoutes); 
app.use('/api/urbanisme', urbanismeRoutes);
app.use('/api/licence', licenceRoutes);
app.use('/api/auth', authRoutes);   
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
    res.send('🚀 خادم نظام شغل الملك العمومي يعمل بنجاح!');
});

// ==========================================
// 3. تهيئة القلب النابض والإشعارات اللحظية (Socket.io)
// ==========================================
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } 
});
app.set('io', io);

// ==========================================
// 4. تشغيل الخادم
// ==========================================
server.listen(port, () => {
    console.log(`🚀 السيرفر شغال ومستعد لاستقبال الطلبات على المنفذ: ${port}`);
    console.log(`📡 رادار الإشعارات اللحظية (Socket.io) قيد العمل...`);
});                                                        