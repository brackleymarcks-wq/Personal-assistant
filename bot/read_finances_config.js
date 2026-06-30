const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://spvnpwirojnrpgwrsch.supabase.co';
const SUPABASE_KEY = 'sb_publishable_72JuYzuHM67bNaiDcFrUTg_57MJstwC';

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getConfig() {
  try {
    const { data, error } = await db.from('notes').select('*').eq('title', 'SYSTEM_CONFIG_FINANCES');
    if (error) {
      console.error(error);
    } else {
      console.log('Finance Config Notes:', JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error(e);
  }
}

getConfig();
