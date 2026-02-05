const { pool } = require('./backend/config/db');

const partsData = [
  {
    name: 'Engine Oil 10W-40',
    sku: 'OIL-10W40',
    category: 'oil',
    description: 'High performance synthetic engine oil',
    quantity: 50,
    min_stock: 10,
    cost_price: 150.00,
    selling_price: 250.00,
    supplier: 'Castrol'
  },
  {
    name: 'Brake Pads (Front)',
    sku: 'BP-F-001',
    category: 'brake',
    description: 'Ceramic front brake pads',
    quantity: 20,
    min_stock: 5,
    cost_price: 300.00,
    selling_price: 550.00,
    supplier: 'Brembo'
  },
  {
    name: 'Air Filter',
    sku: 'AF-001',
    category: 'filter',
    description: 'High flow air filter',
    quantity: 15,
    min_stock: 5,
    cost_price: 120.00,
    selling_price: 280.00,
    supplier: 'K&N'
  },
  {
    name: 'Spark Plug',
    sku: 'SP-001',
    category: 'engine',
    description: 'Iridium spark plug',
    quantity: 100,
    min_stock: 20,
    cost_price: 80.00,
    selling_price: 180.00,
    supplier: 'NGK'
  },
  {
    name: 'Battery 12V',
    sku: 'BAT-12V',
    category: 'electrical',
    description: 'Maintenance free battery',
    quantity: 8,
    min_stock: 3,
    cost_price: 800.00,
    selling_price: 1500.00,
    supplier: 'Yuasa'
  }
];

async function seedParts() {
  try {
    console.log('Seeding parts...');
    
    for (const part of partsData) {
      // Check if exists
      const check = await pool.query('SELECT id FROM parts WHERE sku = $1', [part.sku]);
      if (check.rows.length === 0) {
        await pool.query(
          `INSERT INTO parts (name, sku, category, description, quantity, min_stock, cost_price, selling_price, supplier)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [part.name, part.sku, part.category, part.description, part.quantity, part.min_stock, part.cost_price, part.selling_price, part.supplier]
        );
        console.log(`Added: ${part.name}`);
      } else {
        console.log(`Skipped: ${part.name} (Already exists)`);
      }
    }
    
    console.log('Seeding completed');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding parts:', err);
    process.exit(1);
  }
}

seedParts();
