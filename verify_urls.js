const crypto = require('crypto');
const https = require('https');

const filenames = [
    'Motor_oil.JPG',
    'Engine_oil.JPG',
    'Motorcycle_tyre.jpg',
    'Tire.jpg',
    'Tyre.jpg',
    'Wheel.jpg'
];

function getWikimediaUrl(filename) {
    const safeFilename = filename.replace(/ /g, '_');
    const md5 = crypto.createHash('md5').update(safeFilename).digest('hex');
    const path = `${md5[0]}/${md5.slice(0, 2)}/${safeFilename}`;
    return `https://upload.wikimedia.org/wikipedia/commons/${path}`;
}

function checkUrl(url) {
    return new Promise((resolve) => {
        const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            resolve({ url, status: res.statusCode });
        });
        req.on('error', () => resolve({ url, status: 'Error' }));
        req.end();
    });
}

async function main() {
    for (const filename of filenames) {
        const url = getWikimediaUrl(filename);
        console.log(`Checking ${url}...`);
        const result = await checkUrl(url);
        console.log(`Result: ${result.status}`);
    }
}

main();
