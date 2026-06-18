require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
  const { data, error } = await db.from('tasks').select('*');
  console.log('All tasks error:', error);
  console.log('All tasks data length:', data ? data.length : 0);

  const { data: tData, error: tError } = await db.from('tasks').select('*').neq('status', 'Готово').neq('status', 'Отменена');
  console.log('Neq tasks error:', tError);
  console.log('Neq tasks data length:', tData ? tData.length : 0);
  
  // Try exactly what bot.js does
  function getMinskDateString(daysOffset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    const ms = date.toLocaleString('en-US', { timeZone: 'Europe/Minsk' });
    const minskDate = new Date(ms);
    const y = minskDate.getFullYear();
    const m = String(minskDate.getMonth() + 1).padStart(2, '0');
    const d = String(minskDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const today = getMinskDateString(0);
  const { data: dData, error: dError } = await db.from('tasks').select('*').eq('deadline', today).neq('status', 'Готово').neq('status', 'Отменена');
  console.log('Due today error:', dError);
  console.log('Due today data length:', dData ? dData.length : 0);
}
test().catch(console.error);
