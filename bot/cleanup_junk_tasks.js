const { createClient } = require('@supabase/supabase-js');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config({ path: '.env' });

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Список "мусорных" названий — это direction-названия, попавшие в title
const JUNK_TITLES = [
  'ТТ AI-Connect', 'TT AiConnect', 'ТТ АИ-Коннект',
  'Ai-Connect', 'AI-Connect', 'АИ-Коннект',
  'Личное', 'Операционная задача', 'Учись и применяй',
  'Митап AI-Connect', 'ИИ Дайджест', 'Банк промтов',
  'Smart-запрос/ответ', 'Английский', 'Задача от руководителя'
];

async function cleanupJunkTasks() {
  console.log('Fetching all tasks...');
  const { data: tasks, error } = await db.from('tasks').select('*');
  if (error) {
    console.error('Error fetching tasks:', error);
    return;
  }
  
  console.log(`Total tasks in DB: ${tasks.length}`);
  
  const junkTasks = tasks.filter(t => 
    JUNK_TITLES.some(junk => t.title && t.title.trim() === junk.trim())
  );
  
  console.log(`Found ${junkTasks.length} junk tasks to delete:`);
  junkTasks.forEach(t => {
    console.log(`  - [${t.id}] "${t.title}" (Dir: "${t.direction}", Status: "${t.status}")`);
  });
  
  if (junkTasks.length === 0) {
    console.log('Nothing to clean up!');
    return;
  }
  
  const ids = junkTasks.map(t => t.id);
  const { error: delError } = await db.from('tasks').delete().in('id', ids);
  if (delError) {
    console.error('Error deleting tasks:', delError);
  } else {
    console.log(`✅ Successfully deleted ${junkTasks.length} junk tasks.`);
  }
}

cleanupJunkTasks();
