const fetch = require('node-fetch');

async function test() {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer fake_key'
    },
    body: JSON.stringify({
      model: 'gemini-1.5-pro',
      messages: [{ role: 'user', content: 'hi' }]
    })
  });
  console.log(res.status);
  console.log(await res.text());
}
test();
