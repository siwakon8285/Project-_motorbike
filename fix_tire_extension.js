const fs = require('fs');
const path = require('path');
const { pool } = require('./backend/config/db');

async function fixTire() {
    try {
        const publicDir = path.join(__dirname, 'frontend', 'public', 'parts');
        const oldPath = path.join(publicDir, 'tire.jpg');
        const newPath = path.join(publicDir, 'tire.svg');

        if (fs.existsSync(oldPath)) {
            // Check if it's actually SVG content
            const content = fs.readFileSync(oldPath, 'utf8');
            if (content.startsWith('<svg')) {
                console.log('Renaming tire.jpg to tire.svg because it contains SVG content');
                fs.renameSync(oldPath, newPath);
                
                console.log('Updating DB for tire...');
                await pool.query("UPDATE parts SET image_url = '/parts/tire.svg' WHERE sku = 'TIRE-7090-17'");
            }
        }
        console.log('Fix complete');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fixTire();
