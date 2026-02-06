
const axios = require('axios');

async function testChat() {
  try {
    console.log('Sending test message to chat API...');
    const response = await axios.post('http://127.0.0.1:5000/api/chat', {
      message: 'Hello AI from test script',
      userId: 'test-user',
      username: 'Tester'
    });
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

testChat();
