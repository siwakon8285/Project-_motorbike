const { pool } = require('./backend/config/db');
const fs = require('fs');
const path = require('path');

async function initDb() {
  try {
    const schemaPath = path.join(__dirname, 'backend', 'config', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing schema...');
    await pool.query(schema);
    console.log('Schema executed successfully');
    
    process.exit(0);
  } catch (err) {
    console.error('Error executing schema:', err);
    process.exit(1);
  }
}

initDb();
