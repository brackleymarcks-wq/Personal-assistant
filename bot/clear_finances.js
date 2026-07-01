require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function wipeFinances() {
  console.log('Wiping finances table...');
  const { data, error } = await db.from('finances').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows
  if (error) {
    console.error('Error deleting finances:', error);
  } else {
    console.log('Successfully wiped finances data.');
  }
}

wipeFinances();
