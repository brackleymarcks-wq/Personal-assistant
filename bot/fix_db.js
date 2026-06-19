import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config(); // Because this is in bot/ folder, it will load bot/.env

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function removeDuplicates() {
  const today = new Date().toISOString().split('T')[0];
  const { data: finances, error } = await db.from('finances')
    .select('*')
    .gte('date', today)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching finances:', error);
    return;
  }

  if (!finances) {
    console.log('No data found.');
    return;
  }

  console.log(`Found ${finances.length} transactions today.`);
  
  const seen = new Set();
  const toDelete = [];

  for (const t of finances) {
    const sig = `${t.amount}_${t.category}_${t.type}_${t.comment || ''}`;
    if (seen.has(sig)) {
      toDelete.push(t.id);
    } else {
      seen.add(sig);
    }
  }

  if (toDelete.length > 0) {
    console.log(`Deleting ${toDelete.length} duplicates...`);
    for (const id of toDelete) {
      await db.from('finances').delete().eq('id', id);
      console.log(`Deleted ${id}`);
    }
    console.log('Done!');
  } else {
    console.log('No duplicates found.');
  }
}

removeDuplicates();
