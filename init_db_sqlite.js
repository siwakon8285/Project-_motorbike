const { pool } = require('./backend/config/db');
const fs = require('fs');
const path = require('path');

async function initDb() {
  try {
    const schemaPath = path.join(__dirname, 'backend', 'config', 'schema_sqlite.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing schema...');
    
    // Split by semicolon to execute one by one (SQLite sometimes prefers this)
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const stmt of statements) {
        await pool.query(stmt);
    }
    
    console.log('Schema executed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error executing schema:', err);
    process.exit(1);
  }
}

initDb();
