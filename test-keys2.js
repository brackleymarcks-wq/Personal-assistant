require('dotenv').config({ path: 'bot/.env' });
const fs = require('fs');

async function testAPIs() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  
  console.log("OpenRouter Key:", openRouterKey ? "Set" : "Not Set");
  console.log("Groq Key:", groqKey ? "Set" : "Not Set");

  const prompt = {
    model: "google/gemini-2.0-flash-exp:free",
    messages: [{ role: "user", content: "hello" }],
    max_tokens: 10
  };

  if (openRouterKey) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openRouterKey}` },
        body: JSON.stringify(prompt)
      });
      const data = await res.text();
      console.log("OpenRouter response length:", data.length);
      console.log("OpenRouter preview:", data.substring(0, 200));
    } catch(e) {
      console.error("OpenRouter error:", e);
    }
  }

  if (groqKey) {
    try {
      const res2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: "llama-3.2-90b-vision-preview",
          messages: [{ role: "user", content: "hello" }],
          max_tokens: 10
        })
      });
      const data2 = await res2.text();
      console.log("Groq response length:", data2.length);
      console.log("Groq preview:", data2.substring(0, 200));
    } catch(e) {
      console.error("Groq error:", e);
    }
  }
}

testAPIs();
