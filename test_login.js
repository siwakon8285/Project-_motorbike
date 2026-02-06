const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing Login...');
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'password123'
    });
    console.log('Login Successful!');
    console.log('Token:', res.data.token);
    console.log('User:', res.data.user);
  } catch (err) {
    console.error('Login Failed!');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

testLogin();
