const express = require('express');
const axios = require('axios');
const router = express.Router();

// Webhook URL from n8n
// You should get this from your n8n workflow (Production URL)
// Access via process.env directly inside the handler to ensure latest value
// const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'YOUR_N8N_WEBHOOK_URL_HERE'; // This was caching the value

router.post('/', async (req, res) => {
  try {
    const { message, userId, username } = req.body;
    const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL; // Get latest env var

    console.log('Using N8N Webhook URL:', N8N_WEBHOOK_URL);

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    if (!N8N_WEBHOOK_URL || N8N_WEBHOOK_URL === 'YOUR_N8N_WEBHOOK_URL_HERE') {
      console.warn('N8N Webhook URL is not configured');
      // Mock response for testing if n8n is not set up
      return res.json({ 
        reply: 'ระบบยังไม่ได้เชื่อมต่อกับ n8n กรุณาตั้งค่า N8N_WEBHOOK_URL ในไฟล์ .env ของ Backend ครับ' 
      });
    }

    // Forward to n8n
    const response = await axios.post(N8N_WEBHOOK_URL, {
      message,
      userId,
      username,
      timestamp: new Date().toISOString()
    });

    // Debug logging
    const fs = require('fs');
    const path = require('path');
    const logPath = path.join(__dirname, '../n8n_debug.log');
    fs.appendFileSync(logPath, `${new Date().toISOString()} - Response from n8n: ${JSON.stringify(response.data)}\n`);

    // Smart response extraction
    const data = response.data;
    let reply = null;

    if (data) {
        // 1. Try standard keys
        reply = data.reply || data.text || data.output || data.message || data.answer;

        // 2. If no reply found, check if it's an array with text
        if (!reply && Array.isArray(data) && data.length > 0) {
            const firstItem = data[0];
            reply = firstItem.reply || firstItem.text || firstItem.output || firstItem.message;
        }

        // 3. If still no reply, try to find the first string value in the object
        if (!reply && typeof data === 'object' && !Array.isArray(data)) {
            const values = Object.values(data);
            const stringValue = values.find(v => typeof v === 'string' && v.length > 0);
            if (stringValue) reply = stringValue;
        }
        
        // 4. Fallback: stringify the whole data if it's not too big
        if (!reply) {
            console.warn('Could not extract reply from n8n response, using raw JSON');
            reply = typeof data === 'string' ? data : JSON.stringify(data);
        }
    }

    res.json({ reply });

  } catch (error) {
    console.error('Chat Proxy Error Full:', error); // Log full error object
    console.error('Chat Proxy Error Message:', error.message);
    if (error.response) {
        console.error('N8N Response Data:', error.response.data);
        console.error('N8N Response Status:', error.response.status);
    }
    res.status(500).json({ 
      message: 'Failed to communicate with AI service',
      error: error.message 
    });
  }
});

module.exports = router;
