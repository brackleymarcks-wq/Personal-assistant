const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('No GROQ_API_KEY found');
    return;
  }
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    if (!res.ok) {
      console.error('Failed to fetch models:', res.status, await res.text());
      return;
    }
    const data = await res.json();
    console.log('Available models:', data.data.map(m => m.id));
  } catch (e) {
    console.error(e);
  }
}

main();
