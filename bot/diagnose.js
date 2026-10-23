require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function runDiagnosis() {
  console.log("=== 1. ПРОВЕРКА TELEGRAM BOT TOKEN ===");
  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/getMe`);
    const tgData = await tgRes.json();
    if (tgData.ok) {
      console.log(`✅ Telegram бот подключен: @${tgData.result.username} (${tgData.result.first_name})`);
    } else {
      console.log(`❌ Ошибка Telegram токена:`, tgData.description);
    }
  } catch (err) {
    console.log(`❌ Ошибка запроса к Telegram API:`, err.message);
  }

  console.log("\n=== 2. ПРОВЕРКА SUPABASE ===");
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  console.log(`URL: ${supabaseUrl}`);
  try {
    const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    const { data, error } = await client.from('settings').select('*').limit(1);
    if (error) {
      console.log("❌ Ошибка Supabase запроса:", error.message || error);
    } else {
      console.log("✅ Supabase база данных успешно ответила! Записи получены:", data.length);
    }
  } catch (err) {
    console.log("❌ Ошибка соединения с Supabase:", err.message);
  }

  console.log("\n=== 3. ПРОВЕРКА ОСНОВНОЙ ИИ-МОДЕЛИ (AI_MODEL) ===");
  const aiUrl = process.env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
  const aiKey = process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY;
  const aiModel = process.env.AI_MODEL || 'google/gemma-4-26b-a4b-it:free';
  console.log(`Провайдер: ${aiUrl}`);
  console.log(`Модель: ${aiModel}`);
  try {
    const res = await fetch(aiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiKey}`
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [{ role: 'user', content: 'Привет! Ответь коротко: Система в норме!' }],
        max_tokens: 30
      })
    });
    const data = await res.json();
    if (data.choices && data.choices[0]) {
      console.log(`✅ ИИ-модель работает! Ответ: "${data.choices[0].message.content.trim()}"`);
    } else {
      console.log("❌ Ошибка ИИ ответа:", JSON.stringify(data));
    }
  } catch (err) {
    console.log("❌ Ошибка запроса к ИИ:", err.message);
  }
}

runDiagnosis();
