const dotenv = require('dotenv');
dotenv.config(); // Load .env from root

const { pool } = require('./backend/config/db');
const fs = require('fs');

async function dumpData() {
  try {
    console.log('Querying users...');
    const users = await pool.query('SELECT * FROM users');
    console.log('Querying parts...');
    const parts = await pool.query('SELECT * FROM parts');
    
    const output = {
      users: users.rows,
      parts: parts.rows
    };
    
    fs.writeFileSync('db_dump.json', JSON.stringify(output, null, 2));
    console.log('Dumped to db_dump.json');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

dumpData();
