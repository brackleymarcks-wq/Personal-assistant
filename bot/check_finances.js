import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function main() {
  const { data, error } = await db.from('finances')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) console.error(error);
  else {
    let cardSum = 0;
    let cashSum = 0;
    data.forEach(t => {
      let amt = parseFloat(t.amount);
      if (t.type === 'expense') amt = -amt;
      if (t.account === 'card' || !t.account) cardSum += amt;
      else if (t.account === 'cash') cashSum += amt;
    });
    console.log('Total Card:', cardSum);
    console.log('Total Cash:', cashSum);
    console.log('Transactions > 1000:');
    console.log(data.filter(t => parseFloat(t.amount) > 1000));
  }
  process.exit(0);
}
main();
