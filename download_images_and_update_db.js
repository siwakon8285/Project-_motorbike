const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pool } = require('./backend/config/db');

const images = [
    {
        sku: 'SP-NGK-001',
        filename: 'Spark_plug.svg',
        localFilename: 'spark_plug.svg'
    },
    {
        sku: 'BP-F-001',
        filename: 'Disc_brake_pads.JPG',
        localFilename: 'brake_pads.jpg'
    },
    {
        sku: 'OIL-08L',
        filename: 'Motor_oil.JPG',
        localFilename: 'engine_oil.jpg'
    },
    {
        sku: 'TIRE-7090-17',
        filename: 'Motorcycle_tire.jpg', // Might fail, will fallback
        localFilename: 'tire.jpg'
    },
    {
        sku: 'BATT-12V5A',
        filename: 'Battery-12V.svg',
        localFilename: 'battery.svg'
    },
    {
        sku: 'AIR-FIL-001',
        filename: 'Oil_can.svg', // Might fail, will fallback
        localFilename: 'air_filter.svg'
    }
];

const downloadDir = path.join(__dirname, 'frontend', 'public', 'parts');

if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
}

function getWikimediaUrl(filename) {
    const safeFilename = filename.replace(/ /g, '_');
    const md5 = crypto.createHash('md5').update(safeFilename).digest('hex');
    const path = `${md5[0]}/${md5.slice(0, 2)}/${safeFilename}`;
    return `https://upload.wikimedia.org/wikipedia/commons/${path}`;
}

const createPlaceholder = (filepath, text) => {
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="50%" font-family="Arial" font-size="24" text-anchor="middle" fill="#9ca3af">${text}</text>
    </svg>`;
    fs.writeFileSync(filepath, svgContent);
    console.log(`Created placeholder for ${filepath}`);
};

const downloadImage = (url, filepath, textFallback) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
            if (response.statusCode !== 200) {
                console.warn(`Failed to download ${url}: Status Code ${response.statusCode}`);
                file.close();
                fs.unlinkSync(filepath); // Remove partial file
                createPlaceholder(filepath, textFallback); // Create fallback
                resolve(); // Resolve anyway to continue
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        });
        
        req.on('error', (err) => {
            console.error(`Error downloading ${url}:`, err.message);
            file.close();
            if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
            createPlaceholder(filepath, textFallback);
            resolve();
        });
    });
};

async function main() {
    try {
        console.log('Starting image download and database update...');

        for (const img of images) {
            const url = getWikimediaUrl(img.filename);
            const filepath = path.join(downloadDir, img.localFilename);
            const dbPath = `/parts/${img.localFilename}`;
            
            console.log(`Downloading ${url} to ${filepath}...`);
            await downloadImage(url, filepath, img.localFilename);

            // Update Database
            console.log(`Updating DB for SKU ${img.sku} to use path ${dbPath}`);
            await pool.query(
                'UPDATE parts SET image_url = $1 WHERE sku = $2',
                [dbPath, img.sku]
            );
        }

        console.log('All operations completed.');
        process.exit(0);
    } catch (err) {
        console.error('Fatal error:', err);
        process.exit(1);
    }
}

main();
