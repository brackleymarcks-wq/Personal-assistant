require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
  const { data, error } = await db.from('students').select('*').limit(1);
  console.log('Students:', data, error);
}
test();
