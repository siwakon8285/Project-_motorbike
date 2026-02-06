
const { pool } = require('./backend/config/db');

async function checkParts() {
  try {
    const res = await pool.query('SELECT id, name, image_url FROM parts LIMIT 5');
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  }
}

checkParts();
