const { pool } = require('./backend/config/db');

pool.query('SELECT * FROM users', (err, res) => {
  if (err) {
    console.error(err);
  } else {
    console.log('Users:', res.rows);
  }
});
