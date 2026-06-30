const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xpvnpelrojnrpgwrezh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_72JuYzuHM67bNaiDcFrUTg_57MJstwC';

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkTransactions() {
  console.log('Checking recent transactions in production Supabase...');
  try {
    const { data, error } = await db.from('transactions').select('*').order('created_at', { ascending: false }).limit(5);
    if (error) {
      console.error('Error fetching transactions:', error);
    } else {
      console.log('Recent transactions:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

checkTransactions();
