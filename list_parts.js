const { pool } = require('./backend/config/db');

async function listParts() {
  try {
    const res = await pool.query('SELECT sku, name, image_url FROM parts ORDER BY id');
    console.log('Current Parts:');
    res.rows.forEach(p => {
        console.log(`SKU: ${p.sku} | Name: ${p.name} | Image: ${p.image_url}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listParts();
