const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
  const { data, error } = await supabase.from('finances').select('*').limit(1);
  if (error) console.error(error);
  console.log('finances data:', data);
  if (data && data.length > 0) {
    console.log('keys:', Object.keys(data[0]));
  }
}
test();
