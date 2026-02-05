const { pool } = require('./config/db');

async function listUsers() {
  try {
    const res = await pool.query('SELECT id, username, email, role FROM users ORDER BY id');
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listUsers();
