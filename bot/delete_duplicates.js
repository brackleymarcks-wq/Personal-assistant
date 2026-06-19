import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('./bot/.env') });

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function removeDuplicates() {
  const { data: finances, error } = await db.from('finances')
    .select('*')
    .gte('date', new Date().toISOString().split('T')[0])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching finances:', error);
    return;
  }

  console.log(`Found ${finances.length} transactions today.`);
  
  const seen = new Set();
  const toDelete = [];

  for (const t of finances) {
    // Unique signature based on amount, category, type and date
    const sig = `${t.amount}_${t.category}_${t.type}_${t.date.split('T')[0]}_${t.comment || ''}`;
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
