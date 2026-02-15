const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function resetAdminPassword() {
  const email = 'admin@example.com';
  const newPassword = 'password123';

  try {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);

    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE LOWER(email) = LOWER($2) RETURNING id, email',
      [hashed, email]
    );

    if (result.rows.length === 0) {
      console.log('Admin user not found for email', email);
    } else {
      console.log('Admin password reset for', result.rows[0].email);
    }
    process.exit(0);
  } catch (err) {
    console.error('Error resetting admin password:', err);
    process.exit(1);
  }
}

resetAdminPassword();

