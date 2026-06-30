const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'bot/.env' });

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function main() {
  const { data, error } = await db.from('tasks').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    return;
  }
  console.log('Total tasks:', data.length);
  data.slice(0, 10).forEach(t => {
    console.log(`- ID: ${t.id}\n  Title: "${t.title}"\n  Status: "${t.status}"\n  Priority: "${t.priority}"\n  Deadline: "${t.deadline}"\n  Linked Notes:`, t.linked_notes);
  });
}

main();
