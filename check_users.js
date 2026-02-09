const { pool } = require('./backend/config/db');

async function checkUsers() {
  try {
    const res = await pool.query('SELECT id, email, role FROM users');
    console.log('Users:', res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUsers();