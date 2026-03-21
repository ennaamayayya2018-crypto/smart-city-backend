const { Pool } = require('pg');
require('dotenv').config(); // لضمان قراءة المتغيرات

// إعدادات الاتصال بقاعدة البيانات (النسخة السحابية الذكية)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // 🛡️ هذا السطر إجباري جداً لكي تقبل Neon الاتصال
    }
});

// اختبار الاتصال //
pool.connect()
    .then(() => console.log('✅ تم الاتصال بقاعدة البيانات السحابية بنجاح!'))
    .catch((err) => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err.message));

// تصدير الجسر //
module.exports = pool;