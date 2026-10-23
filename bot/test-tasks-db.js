const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Extract config from config.js or env
const env = process.env;
let SUPABASE_URL = env.SUPABASE_URL;
let SUPABASE_KEY = env.SUPABASE_KEY;

if (!SUPABASE_URL) {
  const content = fs.readFileSync('js/config.js', 'utf8');
  const matchUrl = content.match(/SUPABASE_URL:\s*'([^']+)'/);
  const matchKey = content.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/);
  if (matchUrl) SUPABASE_URL = matchUrl[1];
  if (matchKey) SUPABASE_KEY = matchKey[1];
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkTasks() {
  const { data, error } = await db.from('tasks').select('*').limit(20);
  console.log(data);
}
checkTasks();
