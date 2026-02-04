const { pool } = require('./backend/config/db');

async function updateSchema() {
  try {
    console.log('Updating parts data...');

    // Clear existing test data based on SKUs to avoid duplicates
    await pool.query("DELETE FROM parts WHERE sku IN ('SP-NGK-001', 'BP-F-001', 'OIL-08L', 'TIRE-7090-17', 'BATT-12V5A', 'AIR-FIL-001')");

    const parts = [
      {
        name: 'หัวเทียน NGK (Spark Plug)',
        category: 'Engine',
        description: 'หัวเทียนคุณภาพสูงสำหรับรถจักรยานยนต์ 4 จังหวะ',
        sku: 'SP-NGK-001',
        quantity: 50,
        min_stock: 10,
        cost_price: 45.00,
        selling_price: 80.00,
        supplier: 'NGK Thailand',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Spark_plug.svg/640px-Spark_plug.svg.png',
        compatible_models: 'All, Wave 110i, Wave 125i, Scoopy-i'
      },
      {
        name: 'ผ้าเบรกหน้า (Front Brake Pads)',
        category: 'Brake',
        description: 'ผ้าเบรกดิสก์หน้า ทนทาน เบรคหนึบ',
        sku: 'BP-F-001',
        quantity: 30,
        min_stock: 5,
        cost_price: 120.00,
        selling_price: 250.00,
        supplier: 'Honda Genuine Parts',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Disc_brake_pads.JPG/640px-Disc_brake_pads.JPG',
        compatible_models: 'Wave 110i, PCX 150, Click 125i'
      },
      {
        name: 'น้ำมันเครื่อง 0.8L (Engine Oil)',
        category: 'Engine',
        description: 'น้ำมันเครื่องเกรดรวม สำหรับรถมอเตอร์ไซค์ 4 จังหวะ',
        sku: 'OIL-08L',
        quantity: 100,
        min_stock: 20,
        cost_price: 90.00,
        selling_price: 160.00,
        supplier: 'Shell',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Castrol_Oil_%2814457682559%29.jpg/640px-Castrol_Oil_%2814457682559%29.jpg',
        compatible_models: 'All'
      },
      {
        name: 'ยางนอก 70/90-17 (Tire)',
        category: 'Wheels',
        description: 'ยางนอกขอบ 17 นิ้ว ลายสวย เกาะถนนดีเยี่ยม',
        sku: 'TIRE-7090-17',
        quantity: 20,
        min_stock: 4,
        cost_price: 350.00,
        selling_price: 550.00,
        supplier: 'IRC',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Motorcycle_tire.jpg/640px-Motorcycle_tire.jpg',
        compatible_models: 'Wave 110i, Wave 125i, Dream'
      },
      {
        name: 'แบตเตอรี่ 12V 5Ah (Battery)',
        category: 'Electrical',
        description: 'แบตเตอรี่แห้ง พร้อมใช้งาน ไฟแรง สตาร์ทติดง่าย',
        sku: 'BATT-12V5A',
        quantity: 15,
        min_stock: 3,
        cost_price: 400.00,
        selling_price: 650.00,
        supplier: 'FB Battery',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Battery-12V.svg/640px-Battery-12V.svg.png',
        compatible_models: 'Click 125i, PCX 150, Zoomer-X'
      },
      {
        name: 'ไส้กรองอากาศ (Air Filter)',
        category: 'Engine',
        description: 'ไส้กรองอากาศ ช่วยให้เครื่องยนต์สะอาด ประหยัดน้ำมัน',
        sku: 'AIR-FIL-001',
        quantity: 25,
        min_stock: 5,
        cost_price: 80.00,
        selling_price: 180.00,
        supplier: 'Honda Genuine Parts',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Oil_can.svg/640px-Oil_can.svg.png',
        compatible_models: 'Click 125i, PCX 150'
      }
    ];

    for (const part of parts) {
      await pool.query(
        `INSERT INTO parts (name, category, description, sku, quantity, min_stock, cost_price, selling_price, supplier, image_url, compatible_models) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [part.name, part.category, part.description, part.sku, part.quantity, part.min_stock, part.cost_price, part.selling_price, part.supplier, part.image_url, part.compatible_models]
      );
    }
    
    console.log('Parts data re-seeded with Thai names.');
    process.exit(0);
  } catch (err) {
    console.error('Error updating parts:', err);
    process.exit(1);
  }
}

updateSchema();
