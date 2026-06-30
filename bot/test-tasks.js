const { createClient } = require('@supabase/supabase-js');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config({ path: '.env' });

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function main() {
  const { data, error } = await db.from('tasks').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    return;
  }
  console.log('Total tasks:', data.length);
  data.slice(0, 15).forEach(t => {
    console.log(`- Title: "${t.title}" | NextStep: "${t.next_step || ''}" | Dir: "${t.direction || ''}" | Desc: "${(t.description || '').substring(0, 60)}"`);
  });
}

main();
