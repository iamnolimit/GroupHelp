// Helper script to set up Telegram webhook
// Run this after deploying to Vercel: node setup-webhook.js

const https = require('https');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./config.json'));
const BOT_TOKEN = process.env.BOT_TOKEN || config.botToken;
const WEBHOOK_URL = process.env.WEBHOOK_URL || process.argv[2];

if (!WEBHOOK_URL) {
    console.error('❌ Error: WEBHOOK_URL not provided');
    console.log('Usage: node setup-webhook.js <your-vercel-url>');
    console.log('Example: node setup-webhook.js https://your-app.vercel.app/api/webhook');
    process.exit(1);
}

const options = {
    hostname: 'api.telegram.org',
    path: `/bot${BOT_TOKEN}/setWebhook`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    }
};

const data = JSON.stringify({
    url: WEBHOOK_URL,
    allowed_updates: [
        "message",
        "edited_message",
        "edited_channel_post",
        "callback_query",
        "message_reaction",
        "message_reaction_count",
        "chat_member"
    ]
});

console.log('🔧 Setting up webhook...');
console.log('📍 Webhook URL:', WEBHOOK_URL);

const req = https.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
        responseData += chunk;
    });

    res.on('end', () => {
        const response = JSON.parse(responseData);
        
        if (response.ok) {
            console.log('✅ Webhook set successfully!');
            console.log('📋 Response:', response.description);
        } else {
            console.error('❌ Failed to set webhook');
            console.error('Error:', response.description);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request error:', error);
});

req.write(data);
req.end();
