require('dotenv').config();
const axios = require('axios');

// Production URL from .env
const webhookUrl = process.env.N8N_SHEETS_WEBHOOK_URL;

const testBooking = {
  "id": 999,
  "booking_date": new Date().toISOString(),
  "booking_time": "12:00",
  "status": "confirmed",
  "first_name": "ทดสอบ",
  "last_name": "ระบบ",
  "phone": "0812345678",
  "vehicle_brand": "Honda",
  "vehicle_model": "Click 125i",
  "vehicle_license_plate": "1กข-1234",
  "services": [
    { "name": "เปลี่ยนยาง", "price": 500 },
    { "name": "ถ่ายน้ำมันเครื่อง", "price": 150 }
  ]
};

console.log(`\n🚀 Sending test data to: ${webhookUrl}`);
console.log('📦 Payload:', JSON.stringify(testBooking, null, 2));

axios.post(webhookUrl, testBooking)
  .then(response => {
    console.log('\n✅ Success! n8n responded with status:', response.status);
    console.log('Response data:', response.data);
  })
  .catch(error => {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
    } else {
        console.error('Make sure n8n is active or the URL is correct.');
    }
  });
