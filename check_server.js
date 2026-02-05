const axios = require('axios');
const fs = require('fs');

async function checkHealth() {
  const log = (msg) => {
    console.log(msg);
    fs.appendFileSync('check_log.txt', msg + '\n');
  };

  try {
    log('Checking Backend...');
    const res = await axios.get('http://localhost:5001/api/parts'); 
    log(`Backend Response: ${res.status}`);
  } catch (err) {
    log(`Error Code: ${err.code}`);
    log(`Error Message: ${err.message}`);
    if (err.response) {
      log(`Response Status: ${err.response.status}`);
    }
  }
}

checkHealth();
