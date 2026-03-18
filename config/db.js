const { Pool } = require('pg');

// إعدادات الاتصال بقاعدة البيانات الخاصة بمشروعنا
const pool = new Pool({
    user: 'postgres',             
    host: 'localhost',            
    database: 'domaine_public_db',
    password: 'admin',            
    port: 5432,                   
});

// اختبار الاتصال
pool.connect()
    .then(() => console.log('✅ تم الاتصال بقاعدة البيانات domaine_public_db بنجاح!'))
    .catch((err) => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err.message));

// تصدير الجسر
module.exports = pool;