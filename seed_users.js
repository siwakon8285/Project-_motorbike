const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./database.sqlite');

const users = [
  {
    username: 'admin',
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin',
    first_name: 'Admin',
    last_name: 'System'
  },
  {
    username: 'testuser',
    email: 'user@example.com',
    password: 'password123',
    role: 'customer',
    first_name: 'Test',
    last_name: 'User'
  }
];

async function seedUsers() {
  const salt = await bcrypt.genSalt(10);
  
  db.serialize(() => {
    users.forEach(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, salt);
      // Try insert, ignore if username/email exists
      db.run(
        `INSERT OR IGNORE INTO users (username, email, password, role, first_name, last_name, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [user.username, user.email, hashedPassword, user.role, user.first_name, user.last_name],
        (err) => {
          if (err) console.error(`Error seeding ${user.username}:`, err.message);
          else console.log(`Seeded user: ${user.username} (${user.email})`);
        }
      );
    });
  });
}

seedUsers();
