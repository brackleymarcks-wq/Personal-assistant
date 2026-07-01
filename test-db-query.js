const url = 'https://spvnpwirojnrpgwrsch.supabase.co';
const key = 'sb_publishable_72JuYzuHM67bNaiDcFrUTg_57MJstwC';
const fs = require('fs');

async function test() {
  const res = await fetch(`${url}/rest/v1/finances?select=*&order=date.desc&limit=5`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const data = await res.json();
  fs.writeFileSync('C:/Users/igor.pavlovskij/.gemini/antigravity-ide/brain/095ead86-5ae2-4757-aab3-267d37a34031/scratch/db_test.json', JSON.stringify(data, null, 2));
  console.log("Done");
}
test();
