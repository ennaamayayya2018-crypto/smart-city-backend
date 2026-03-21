const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    // ⚙️ إعدادات سحابية لمنع انقطاع الاتصال
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

// 🛡️ هذا السطر السحري يمنع السيرفر من الانهيار إذا انقطع الاتصال فجأة
pool.on('error', (err) => {
    console.error('❌ خطأ مفاجئ في اتصال قاعدة البيانات (تم التجاوز):', err.message);
});

pool.connect()
    .then(() => console.log('✅ تم الاتصال بقاعدة البيانات السحابية بنجاح!'))
    .catch((err) => console.error('❌ خطأ في الاتصال:', err.message));

module.exports = pool;