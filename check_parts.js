const { pool } = require('./backend/config/db');

async function checkParts() {
  try {
    const res = await pool.query('SELECT * FROM parts');
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkParts();
