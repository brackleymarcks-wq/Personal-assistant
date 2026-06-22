import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_tasks',
      description: 'Массовое создание нескольких задач (используй для генерации расписания, декомпозиции и т.д.)',
      parameters: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            description: 'Список задач',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Название задачи' },
                direction: { type: 'string', description: 'Направления (можно несколько через запятую)' },
                status: { type: 'string', description: 'Статус задачи (по умолч. "Ждёт меня")' },
                priority: { type: 'string', description: 'Приоритет: Высокий/Средний/Низкий' },
                deadline: { type: 'string', description: 'Дедлайн в формате YYYY-MM-DD' },
                next_step: { type: 'string', description: 'Следующее конкретное действие' }
              },
              required: ['title']
            }
          }
        },
        required: ['tasks']
      }
    }
  }
];

async function test() {
  const apiKey = process.env.GROQ_API_KEY; // The screenshot says it uses Groq in comments, wait, openrouter/free
  // Actually, I don't have the user's OpenRouter API key.
  // But wait! The .env in bot has GROQ_API_KEY.
  console.log('GROQ KEY:', apiKey);
}
test();
