const { pool } = require('./backend/config/db');

// ==========================================
// ส่วนที่ 1: กำหนด URL รูปภาพที่คุณต้องการที่นี่
// ==========================================
const customImages = {
    'SP-NGK-001': 'https://img.lazcdn.com/g/p/cc431efba44b5e4c445ff9e25a87d4f2.png_720x720q80.png',   // ใส่ URL รูปหัวเทียน ที่นี่
    'BP-F-001': 'https://www.taradfilter.com/wp-content/uploads/2017/04/R15MSLAZR3-BrakePadF_A.jpg',     // ใส่ URL รูปผ้าเบรกหน้า ที่นี่
    'OIL-08L': 'https://inwfile.com/s-dy/nj2y3v.jpg',      // ใส่ URL รูปน้ำมันเครื่อง ที่นี่
    'TIRE-7090-17': 'https://www.raidenforce.com/cdn/shop/products/NF45_NR55_508c8cf8-8d28-453a-ad11-348ae3999b56.jpg?v=1637567917', // ใส่ URL รูปยางนอก ที่นี่
    'BATT-12V5A': 'https://h.lnwfile.com/_/h/_raw/s5/6a/ct.jpg',   // ใส่ URL รูปแบตเตอรี่ ที่นี่
    'AIR-FIL-001': 'https://www.hinkarnchang.com/images/editor/%E0%B9%84%E0%B8%AA%E0%B9%89%E0%B8%81%E0%B8%A3%E0%B8%AD%E0%B8%87%E0%B8%AD%E0%B8%B2%E0%B8%81%E0%B8%B2%E0%B8%A8%E0%B9%81%E0%B8%97%E0%B9%89.JPG'   // ใส่ URL รูปไส้กรองอากาศ ที่นี่
};

// ==========================================
// ส่วนที่ 2: ระบบอัปเดตฐานข้อมูล (ไม่ต้องแก้ไข)
// ==========================================
async function updateImages() {
    try {
        console.log('Starting custom image update...');
        
        for (const [sku, url] of Object.entries(customImages)) {
            if (url && url.trim() !== '') {
                console.log(`Updating ${sku} with image: ${url}`);
                await pool.query('UPDATE parts SET image_url = $1 WHERE sku = $2', [url, sku]);
            } else {
                console.log(`Skipping ${sku} (no URL provided)`);
            }
        }
        
        console.log('Update completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error updating images:', err);
        process.exit(1);
    }
}

updateImages();
