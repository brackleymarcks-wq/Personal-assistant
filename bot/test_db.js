require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Minsk' });
  console.log('Today:', today);
  const { data: todayTasks } = await db.from('tasks').select('*').eq('deadline', today).not('status', 'in', '("Готово","Отменена")');
  console.log('Tasks due today:', todayTasks);
  
  const { data: inProgressTasks } = await db.from('tasks').select('*').eq('status', 'В работе').not('status', 'in', '("Готово","Отменена")');
  console.log('In progress tasks:', inProgressTasks);
}
test();
