const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
  const { data, error } = await supabase.from('settings').select('*').limit(1);
  if (error) console.error('settings error:', error);
  else console.log('settings keys:', data && data.length ? Object.keys(data[0]) : 'no data');
  
  const p = await supabase.from('projects').select('*').limit(1);
  console.log('projects keys:', p.data && p.data.length ? Object.keys(p.data[0]) : 'no data');
}
test();
