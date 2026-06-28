import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function removeDuplicates() {
  const { data: tasks, error } = await db.from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    return;
  }

  console.log(`Found ${tasks.length} tasks total.`);
  
  const seen = new Set();
  const toDelete = [];

  for (const t of tasks) {
    // Unique signature based on title, deadline, and area
    const sig = `${t.title}_${t.deadline}_${t.area}`;
    if (seen.has(sig)) {
      toDelete.push(t.id);
    } else {
      seen.add(sig);
    }
  }

  if (toDelete.length > 0) {
    console.log(`Deleting ${toDelete.length} duplicate tasks...`);
    for (const id of toDelete) {
      await db.from('tasks').delete().eq('id', id);
      console.log(`Deleted ${id}`);
    }
    console.log('Done!');
  } else {
    console.log('No duplicates found.');
  }
}

removeDuplicates();
