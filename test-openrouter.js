const GROQ_KEY = 'YOUR_KEY_HERE';
const fs = require('fs');

async function run() {
  console.log('Reading local image...');
  try {
    const imgPath = 'C:/Users/igor.pavlovskij/.gemini/antigravity-ide/brain/095ead86-5ae2-4757-aab3-267d37a34031/corporate_tech_aesthetic_1781521967714.png';
    const buffer = fs.readFileSync(imgPath);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;
    console.log('Image size (base64):', dataUrl.length);

    async function testGroqModel(model) {
      console.log(`Testing Groq model ${model}...`);
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Describe what you see in this image. Answer in 1 short sentence.' },
                { type: 'image_url', image_url: { url: dataUrl } }
              ]
            }
          ],
          max_tokens: 100
        })
      });
      const data = await res.json();
      console.log(`Status ${model}:`, res.status);
      console.log(`Response ${model}:`, JSON.stringify(data, null, 2));
    }

    await testGroqModel('meta-llama/llama-4-scout-17b-16e-instruct');
    await testGroqModel('qwen/qwen3.6-27b');
  } catch (e) {
    console.error('Error:', e.message);
  }
}

run();
