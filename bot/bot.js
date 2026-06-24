// ============================================
// Telegram Bot — Персональный ИИ-ассистент Игоря
// ============================================
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const cheerio = require('cheerio');

// Fix for Node.js 18+ fetch failing in Docker with incomplete IPv6 stacks
dns.setDefaultResultOrder('ipv4first');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Bypass SSL issues

// ---- Config ----
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
let CHAT_ID = '521675050';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const AI_API_KEY = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || process.env.GROQ_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY; // Для транскрибации Whisper
const AI_API_URL = process.env.AI_API_URL || (process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions');
const AI_MODEL = process.env.AI_MODEL || (process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'meta-llama/llama-3.3-70b-instruct:free');

if (!BOT_TOKEN) { console.error('❌ TELEGRAM_BOT_TOKEN не задан в .env'); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ SUPABASE_URL / SUPABASE_KEY не заданы'); process.exit(1); }
if (!AI_API_KEY) { console.warn('⚠️ AI_API_KEY не задан. Бот не сможет отвечать!'); }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ SUPABASE_URL / SUPABASE_KEY не заданы'); process.exit(1); }

// ---- Init ----
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
const bot = new TelegramBot(BOT_TOKEN, { 
  polling: true, 
  baseApiUrl: 'https://weathered-fire-3323.brackleymarcks.workers.dev' 
});

// Load context files
let SYSTEM_PROMPT = '';
let USER_CONTEXT = '';
try {
  SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, '..', 'SYSTEM_PROMPT.md'), 'utf-8');
  USER_CONTEXT = fs.readFileSync(path.join(__dirname, '..', 'CONTEXT.md'), 'utf-8');
  console.log('✅ SYSTEM_PROMPT.md и CONTEXT.md загружены');
} catch(e) {
  console.warn('⚠️ Не удалось загрузить файлы контекста:', e.message);
}

console.log('🤖 Бот запущен! Ожидаю сообщения...');
if (CHAT_ID) {
  bot.sendMessage(CHAT_ID, '🤖 Я обновился на сервере и успешно перезапущен! Таймеры работают в штатном режиме.').catch(e => console.error(e));
  
  // Test proactive message 1 minute after startup
  setTimeout(() => {
    bot.sendMessage(CHAT_ID, '🚨 ПИИП-ПИИП! А вот и обещанное тестовое сообщение!\n\nЯ написал тебе сам, без твоей команды. Значит, расписание и проактивность работают на 100%! 😎').catch(e => console.error(e));
  }, 60 * 1000);
}

// ============================================
// DATABASE HELPERS
// ============================================

async function getUser() {
  const { data, error } = await db.from('users').select('*').limit(1).single();
  if (error) {
    console.error('getUser error:', error);
    throw error;
  }
  return data;
}

async function getTasks(filters = {}) {
  const user = await getUser();
  if (!user) return [];
  let q = db.from('tasks').select('*').eq('user_id', user.id).neq('status', 'Готово').neq('status', 'Отменена').order('created_at', { ascending: false });
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.direction) q = q.eq('direction', filters.direction);
  if (filters.priority) q = q.eq('priority', filters.priority);
  const { data, error } = await q;
  if (error) { console.error('getTasks error:', error); throw error; }
  return data || [];
}

function getMinskDateString(daysOffset = 0) {
  // 100% пуленепробиваемый метод для серверов (без toLocaleString, который может баговать в Linux)
  const d = new Date();
  d.setTime(d.getTime() + (3 * 60 * 60 * 1000)); // +3 часа (Минск)
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

async function getTasksDueToday() {
  const user = await getUser();
  if (!user) return [];
  const today = getMinskDateString(0);
  const { data, error } = await db.from('tasks').select('*')
    .eq('user_id', user.id)
    .eq('deadline', today)
    .neq('status', 'Готово').neq('status', 'Отменена');
  if (error) { console.error('getTasksDueToday error:', error); throw error; }
  return data || [];
}

async function getTasksCompletedToday() {
  const user = await getUser();
  if (!user) return [];
  const today = getMinskDateString(0);
  // Нам нужны задачи, которые были ОБНОВЛЕНЫ сегодня и их статус "Готово"
  // Мы проверяем updated_at: он должен быть >= начала сегодняшнего дня
  const startOfToday = new Date();
  startOfToday.setTime(startOfToday.getTime() + (3 * 60 * 60 * 1000));
  startOfToday.setUTCHours(0,0,0,0);
  // Переводим обратно в UTC для базы данных
  const startOfTodayUTC = new Date(startOfToday.getTime() - (3 * 60 * 60 * 1000)).toISOString();
  
  const { data, error } = await db.from('tasks').select('*')
    .eq('user_id', user.id)
    .eq('status', 'Готово')
    .gte('updated_at', startOfTodayUTC);
  if (error) { console.error('getTasksCompletedToday error:', error); throw error; }
  return data || [];
}

async function getOverdueTasks() {
  const user = await getUser();
  if (!user) return [];
  const today = getMinskDateString(0);
  const { data, error } = await db.from('tasks').select('*')
    .eq('user_id', user.id)
    .lt('deadline', today)
    .neq('status', 'Готово').neq('status', 'Отменена');
  if (error) { console.error('getOverdueTasks error:', error); throw error; }
  return data || [];
}

async function getUpcomingDeadlines(days = 3) {
  const user = await getUser();
  if (!user) return [];
  const today = getMinskDateString(0);
  const future = getMinskDateString(days);
  const { data, error } = await db.from('tasks').select('*')
    .eq('user_id', user.id)
    .gt('deadline', today)
    .lte('deadline', future)
    .neq('status', 'Готово').neq('status', 'Отменена');
  if (error) { console.error('getUpcomingDeadlines error:', error); throw error; }
  return data || [];
}

async function getTodayEvents() {
  const minskDateStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Minsk' });
  const start = new Date(minskDateStr + 'T00:00:00.000+03:00').toISOString();
  const end = new Date(minskDateStr + 'T23:59:59.999+03:00').toISOString();
  const { data } = await db.from('events').select('*')
    .gte('start_at', start).lte('start_at', end).order('start_at');
  return data || [];
}

async function getHabits() {
  const { data } = await db.from('habits').select('*');
  return data || [];
}

async function getHabitLogsToday() {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Minsk' });
  const { data } = await db.from('habit_logs').select('*, habits(name)')
    .eq('date', today);
  return data || [];
}

async function getWeekStats() {
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);
  const { data: completed } = await db.from('tasks').select('id')
    .eq('status', 'Готово')
    .gte('updated_at', weekAgo.toISOString());
  const { data: created } = await db.from('tasks').select('id')
    .gte('created_at', weekAgo.toISOString());
  return {
    completed: completed?.length || 0,
    created: created?.length || 0
  };
}

async function getGamificationStats() {
  const user = await getUser();
  if (!user) return { tasksDone: 0, habitsDone: 0, totalXp: 0 };
  const { count: tasksDone } = await db.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'Готово');
  const { count: habitsDone } = await db.from('habit_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'done');
  const xp = (tasksDone || 0) * 10 + (habitsDone || 0) * 15;
  return { tasksDone: tasksDone || 0, habitsDone: habitsDone || 0, totalXp: xp };
}

async function createTask(title, opts = {}) {
  const user = await getUser();
  const { data, error } = await db.from('tasks').insert({
    user_id: user?.id,
    title,
    direction: opts.direction || 'Личное',
    status: opts.status || 'Ждёт меня',
    priority: opts.priority || 'Средний',
    deadline: opts.deadline || null,
    next_step: opts.next_step || '',
    area: opts.area || 'Работа'
  }).select().single();
  if (error) throw error;
  return data;
}

async function createNote(title, content, tags = [], area = 'Работа') {
  const user = await getUser();
  const { data, error } = await db.from('notes').insert({
    user_id: user?.id,
    title,
    content,
    tags,
    area
  }).select().single();
  if (error) throw error;
  return data;
}

async function createTransaction(amount, type, category, comment = '', accountName = '') {
  const user = await getUser();
  
  let descriptionObj = { text: comment };
  let searchName = accountName || 'карта'; // По умолчанию всё пишем на карту
  
  const settings = await getSettings(); // This now returns parsed SYSTEM_CONFIG_FINANCES
  if (settings && settings.accounts) {
    const acc = settings.accounts.find(a => a.name.toLowerCase().includes(searchName.toLowerCase()));
    if (acc) {
      descriptionObj.account = acc.id;
    } else if (settings.accounts.length > 0) {
      descriptionObj.account = settings.accounts.find(a => a.name.toLowerCase().includes('карта'))?.id || settings.accounts[0].id;
    }
  }

  const { data, error } = await db.from('finances').insert({
    user_id: user?.id,
    amount,
    type,
    category,
    description: JSON.stringify(descriptionObj),
    date: new Date().toISOString()
  }).select().single();
  if (error) throw error;
  return data;
}

async function searchKnowledgeBase(query) {
  const user = await getUser();
  const { data } = await db.from('knowledge_base')
    .select('title, type, content')
    .eq('user_id', user.id)
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(3);
  return data || [];
}

async function getMonthlyFinances() {
  const user = await getUser();
  const date = new Date();
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
  
  const { data } = await db.from('finances')
    .select('amount, type, category')
    .eq('user_id', user.id)
    .gte('date', startOfMonth);
    
  if (!data) return { income: 0, expense: 0, categories: {} };

  let income = 0;
  let expense = 0;
  const categories = {};

  data.forEach(t => {
    const amt = Number(t.amount);
    if (t.type === 'income') income += amt;
    if (t.type === 'expense') {
      expense += amt;
      categories[t.category] = (categories[t.category] || 0) + amt;
    }
  });

  return { income, expense, categories };
}

async function getSettings() {
  const user = await getUser();
  const { data } = await db.from('notes').select('content').eq('user_id', user.id).eq('title', 'SYSTEM_CONFIG_FINANCES').limit(1).single();
  if (data && data.content) {
    try { return JSON.parse(data.content); } catch(e) { return {}; }
  }
  return {};
}

async function getHabits() {
  const user = await getUser();
  const { data } = await db.from('habits').select('*').eq('user_id', user.id).eq('active', true);
  return data || [];
}

async function getHabitLogs(startDate, endDate) {
  const user = await getUser();
  const { data } = await db.from('habit_logs')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate);
  return data || [];
}

async function logHabit(habitId, dateStr, status = 'done') {
  const user = await getUser();
  const { data: existing } = await db.from('habit_logs')
    .select('*').eq('habit_id', habitId).eq('date', dateStr).single();
    
  if (existing) {
    const { data } = await db.from('habit_logs').update({ status }).eq('id', existing.id).select().single();
    return data;
  } else {
    const { data } = await db.from('habit_logs').insert({
      user_id: user.id, habit_id: habitId, date: dateStr, status
    }).select().single();
    return data;
  }
}

async function updateContext(newInstruction) {
  const settings = await getSettings();
  const context = settings.context || {};
  if (!context.custom_instructions) context.custom_instructions = [];
  context.custom_instructions.push(newInstruction);
  await db.from('settings').update({ context }).eq('id', settings.id);
  return true;
}

async function saveMessage(role, content) {
  const user = await getUser();
  await db.from('messages').insert({
    user_id: user?.id,
    role,
    content
  });
}

async function getRecentMessages(limit = 6) {
  const { data } = await db.from('messages').select('role, content')
    .order('created_at', { ascending: false }).limit(limit);
  return (data || []).reverse().map(m => {
    if (m.content && m.content.length > 300) {
      m.content = m.content.substring(0, 300) + '...';
    }
    return m;
  });
}

// ============================================
// STATE AND TIMERS
// ============================================
let globalDeepWorkUntil = null;
let deepWorkTimeout = null;

// ============================================
// AI HELPER
// ============================================

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_tasks',
      description: 'Создать одну или несколько новых задач',
      parameters: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Task title' },
                direction: { type: 'string', description: 'Direction tags: AI-Connect, English, Personal, etc. CSV' },
                status: { type: 'string', description: 'Default "Ждёт меня"' },
                priority: { type: 'string', description: 'High, Medium, Low (Высокий/Средний/Низкий)' },
                deadline: { type: 'string', description: 'YYYY-MM-DD (must compute date)' },
                next_step: { type: 'string', description: 'Next step' },
                area: { type: 'string', enum: ['Работа', 'Репетиторство', 'Личное'], description: 'Must select one: Работа, Репетиторство, Личное' }
              },
              required: ['title', 'area']
            }
          }
        },
        required: ['tasks']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_tasks',
      description: 'Get active tasks list',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          direction: { type: 'string' },
          priority: { type: 'string' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_context',
      description: 'Remember new instruction, habit, fact forever',
      parameters: {
        type: 'object',
        properties: {
          new_instruction: { type: 'string', description: 'What to remember' }
        },
        required: ['new_instruction']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_todays_schedule',
      description: 'Получить расписание на сегодня',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_to_inbox',
      description: 'Save quick thought/idea to Inbox',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Thought text' }
        },
        required: ['content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_note',
      description: 'Create full Note (Diary, Knowledge Base, Ideas)',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Note title' },
          content: { type: 'string', description: 'Content (markdown supported)' },
          tags: { type: 'array', items: { type: 'string' }, description: 'String tags array' },
          area: { type: 'string', enum: ['Работа', 'Репетиторство', 'Личное'], description: 'Area' }
        },
        required: ['title', 'content', 'area']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_transaction',
      description: 'Log transaction (income or expense)',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Amount' },
          type: { type: 'string', description: 'income or expense' },
          category: { type: 'string', description: 'Invent category based on text (e.g. Transport, Food, Cafe, Salary)' },
          comment: { type: 'string', description: 'Original comment text' },
          account_name: { type: 'string', description: 'Account name or "Карта"' }
        },
        required: ['amount', 'type', 'category']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'start_deep_work',
      description: 'Start Deep Work mode (focus). Routes all messages to Inbox silently.',
      parameters: {
        type: 'object',
        properties: {
          minutes: { type: 'number', description: 'Duration in mins (e.g. 60)' }
        },
        required: ['minutes']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_lesson',
      description: 'Log an English lesson conducted',
      parameters: {
        type: 'object',
        properties: {
          student_name: { type: 'string', description: 'Student name' },
          topic: { type: 'string', description: 'Lesson topic' },
          homework: { type: 'string', description: 'Homework' },
          paid: { type: 'boolean', description: 'Is paid' }
        },
        required: ['student_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_lesson_plan',
      description: 'Generate lesson plan or questions for student',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Prompt for generation' }
        },
        required: ['prompt']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_habits',
      description: 'Get active habits list',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'log_habit',
      description: 'Log habit as done for today',
      parameters: {
        type: 'object',
        properties: {
          habit_id: { type: 'string', description: 'Habit ID' }
        },
        required: ['habit_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_knowledge_base',
      description: 'Search in Knowledge Base (find prompts, articles, notes)',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (1-2 keywords)' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_finances',
      description: 'Get financial stats for current month. Use for finance roast or tracking.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_channel_post',
      description: 'Generate AI post for Telegram channel AI-Connect',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Source URL if available' },
          raw_text: { type: 'string', description: 'Raw text if no URL' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'save_link_to_knowledge_base',
      description: 'Auto-read URL, summarize, and save to Knowledge Base',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to read' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_event',
      description: 'Create calendar event or reminder',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Event title' },
          description: { type: 'string', description: 'Details or links (optional)' },
          start_at: { type: 'string', description: 'ISO 8601 date/time (e.g. 2026-06-22T14:00:00). Compute using CURRENT TIME.' },
          area: { type: 'string', enum: ['Работа', 'Репетиторство', 'Личное'], description: 'Area' }
        },
        required: ['title', 'start_at', 'area']
      }
    }
  }
];

async function executeFunctionCall(name, args) {
  try {
    switch (name) {
      case 'create_event': {
        const { title, description, start_at, area } = args;
        if (!title || !start_at) return { success: false, error: 'Не указан title или start_at' };
        
        const user = await getUser();
        if (!user) return { success: false, error: 'User not found' };

        const { data, error } = await db.from('events').insert({
          user_id: user.id,
          title: title,
          description: description || '',
          start_at: start_at,
          area: area || 'Работа'
        }).select().single();

        if (error) return { success: false, error: error.message };
        return { success: true, event: data, message: `Напоминание/событие "${title}" успешно добавлено на ${start_at}!` };
      }
      case 'create_tasks': {
        if (!args.tasks || !Array.isArray(args.tasks)) {
          return { success: false, error: 'Параметр tasks должен быть массивом' };
        }
        const created = [];
        for (const t of args.tasks) {
          t.area = t.area || 'Работа';
          let d = t.deadline || null;
          if (d && !d.match(/^\d{4}-\d{2}-\d{2}$/)) {
            try { d = new Date(d).toISOString().split('T')[0]; } catch(e) { d = null; }
          }
          t.deadline = d;
          const task = await createTask(t.title, t);
          created.push(task);
        }
        const titles = created.map(t => t.title).join('", "');
        return { success: true, count: created.length, message: `Успешно создано задач: ${created.length}. ("${titles}")` };
      }
      case 'get_tasks': {
        const tasks = await getTasks(args);
        return { success: true, tasks, count: tasks.length };
      }
      case 'update_context': {
        await updateContext(args.new_instruction);
        return { success: true, message: 'Запомнил навсегда: ' + args.new_instruction };
      }
      case 'get_todays_schedule': {
        const events = await getTodayEvents();
        const todayTasks = await getTasksDueToday();
        const overdue = await getOverdueTasks();
        const upcoming = await getUpcomingDeadlines(7);
        const inProgress = await getTasks({ status: 'В работе' });
        const now = new Date();
        return {
          success: true,
          date: now.toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk', weekday: 'long', day: 'numeric', month: 'long' }),
          time: now.toLocaleTimeString('ru-RU', { timeZone: 'Europe/Minsk', hour: '2-digit', minute: '2-digit' }),
          events, tasks_due_today: todayTasks, overdue_tasks: overdue, upcoming_tasks_this_week: upcoming, in_progress_tasks: inProgress
        };
      }
      case 'add_to_inbox': {
        const user = await getUser();
        if(!user) return { success: false, error: 'User not found' };
        const { data, error } = await db.from('inbox').insert({ user_id: user.id, content: args.content }).select().single();
        if(error) return { success: false, error: error.message };
        return { success: true, item: data, message: 'Мысль записана во входящие' };
      }
      case 'create_note': {
        const note = await createNote(args.title, args.content, args.tags, args.area || 'Работа');
        return { success: true, note, message: `Заметка "${args.title}" успешно создана!` };
      }
      case 'create_transaction': {
        const txType = args.type || 'expense'; // По умолчанию считаем расходом (чек)
        const tx = await createTransaction(args.amount, txType, args.category, args.comment || '', args.account_name || '');
        const verb = txType === 'income' ? 'Записан доход' : 'Записан расход';
        
        let extraMsg = '';
        if (txType === 'expense') {
          try {
            const settings = await getSettings();
            if (settings && settings.monthlyLimit) {
              const limit = parseFloat(settings.monthlyLimit);
              const stats = await getMonthlyFinances();
              const spent = stats.expense; // это сумма расходов за месяц (уже включает текущую транзакцию, т.к. мы ее записали выше)
              
              if (spent > limit) {
                extraMsg = `\n\n🤬 ВНИМАНИЕ: МЕСЯЧНЫЙ БЮДЖЕТ ПРЕВЫШЕН! (Потрачено ${spent} из ${limit}). АСТАНАВИТЕСЬ! БОЛЬШЕ НИКАКИХ ТРАТ!`;
              } else if (spent >= limit * 0.8) {
                extraMsg = `\n\n⚠️ Осторожно! Ты на краю! Потрачено уже больше 80% бюджета (${spent} из ${limit}). Осталось всего ${limit - spent} BYN до конца месяца!`;
              }
            }
          } catch(e) {
            console.error('Budget check error:', e);
          }
        }

        return { success: true, transaction: tx, message: `${verb}: ${args.amount} BYN (${args.category})${extraMsg}` };
      }
      case 'start_deep_work': {
        const mins = args.minutes || 60;
        globalDeepWorkUntil = Date.now() + mins * 60 * 1000;
        
        if (deepWorkTimeout) clearTimeout(deepWorkTimeout);
        deepWorkTimeout = setTimeout(() => {
          globalDeepWorkUntil = null;
          bot.sendMessage(CHAT_ID, '⏳ Режим Deep Work завершен! Как успехи? Напоминаю, что во время работы ты мог присылать мне сообщения — они все ждут тебя во вкладке Инбокс в веб-интерфейсе.').catch(e => console.error(e));
        }, mins * 60 * 1000);

        return { success: true, message: `Режим Deep Work активирован на ${mins} минут.` };
      }
      case 'get_habits': {
        const habitsList = await getHabits();
        return { success: true, habits: habitsList, count: habitsList.length };
      }
      case 'log_habit': {
        const d = new Date().toISOString().split('T')[0];
        const log = await logHabit(args.habit_id, d, 'done');
        return { success: true, log, message: `Привычка отмечена выполненной на ${d}` };
      }
      case 'search_knowledge_base': {
        const results = await searchKnowledgeBase(args.query);
        return { success: true, count: results.length, items: results, message: `Найдено записей: ${results.length}` };
      }
      case 'analyze_finances': {
        const stats = await getMonthlyFinances();
        return { success: true, stats, message: 'Статистика за текущий месяц получена. Проанализируй данные, найди категории с наибольшими тратами, дай жесткий, но полезный финансовый совет.' };
      }
      case 'add_lesson': {
        const user = await getUser();
        // 1. Найти или создать ученика
        let { data: st } = await db.from('students').select('*').eq('user_id', user.id).ilike('name', `%${args.student_name}%`).limit(1).single();
        if (!st) {
          const { data: newSt } = await db.from('students').insert({ user_id: user.id, name: args.student_name, price: 0 }).select().single();
          st = newSt;
        }
        
        // 2. Создать урок
        const dateStr = new Date().toISOString();
        const { data: lesson } = await db.from('lessons').insert({
          student_id: st.id,
          date: dateStr,
          topic: args.topic || '',
          homework: args.homework || '',
          status: 'Проведен',
          paid: !!args.paid
        }).select().single();
        
        // 3. Авто-оплата в финансы
        if (args.paid && st.price > 0) {
          await createTransaction(st.price, 'income', 'Уроки (Английский)', `Оплата урока: ${st.name}`, 'Карта');
        }
        
        return { success: true, lesson, message: `Урок с ${st.name} успешно добавлен!` + (args.paid && st.price > 0 ? ` Записан доход ${st.price} BYN.` : '') };
      }
      case 'generate_lesson_plan': {
        // Мы используем Groq для генерации ответа на промпт, затем возвращаем его в цепочку
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'system', content: 'Ты опытный и креативный преподаватель английского. Помоги составить учебный материал, план урока или вопросы по запросу.' }, { role: 'user', content: args.prompt }]
          })
        });
        const json = await response.json();
        const result = json.choices[0].message.content;
        return { success: true, generated_plan: result, message: 'План сгенерирован успешно. Выведи его пользователю красиво и структурированно.' };
      }
      case 'generate_channel_post': {
        let content = args.raw_text || '';
        
        // Если передана ссылка, скачиваем и парсим текст
        if (args.url) {
          try {
            const resp = await fetch(args.url, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });
            if (resp.ok) {
              const html = await resp.text();
              const $ = cheerio.load(html);
              // Убираем лишнее
              $('script, style, nav, footer, iframe, noscript').remove();
              content = $('body').text().replace(/\s+/g, ' ').trim();
              if (content.length > 8000) content = content.substring(0, 8000); // лимит
            } else {
              return { success: false, error: 'Не удалось открыть ссылку: ' + resp.status };
            }
          } catch(e) {
            return { success: false, error: 'Ошибка скачивания ссылки: ' + e.message };
          }
        }
        
        if (!content) return { success: false, error: 'Нет текста для генерации поста' };
        
        const systemPrompt = `Ты профессиональный копирайтер для внутреннего Telegram-канала "AI-Connect". 
Твоя задача — сделать из переданной новости один вовлекающий пост.
Формат поста строго следующий:
1. 🔥 Кликбейтный, яркий заголовок (используй эмодзи).
2. Тизер: 2-3 предложения самой сути новости, чтобы заинтересовать. Без лишней воды.
3. Призыв к действию: "Читайте полную статью с разбором на нашем HR-портале! 👇".
Напиши пост живо, энергично, для сотрудников компании. Не добавляй лишних приветствий, сразу выдавай готовый текст поста.`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Сделай пост из этого материала:\n\n${content}` }
            ]
          })
        });
        const json = await response.json();
        const postText = json.choices[0].message.content;
        
        return { success: true, post: postText, message: 'Пост сгенерирован успешно. Выведи его пользователю.' };
      }
      case 'save_link_to_knowledge_base': {
        const { url } = args;
        if (!url) return { success: false, error: 'URL не передан' };

        const cheerio = require('cheerio');
        let content = '';
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          const html = await res.text();
          const $ = cheerio.load(html);
          $('script, style, nav, footer, iframe, noscript').remove();
          content = $('body').text().replace(/\s+/g, ' ').trim();
        } catch(e) {
          return { success: false, error: 'Ошибка при скачивании ссылки: ' + e.message };
        }
        
        if (!content) return { success: false, error: 'Не удалось извлечь текст по ссылке' };
        content = content.substring(0, 15000); // Ограничиваем длину

        const systemPrompt = `Ты ИИ-аналитик. Твоя задача — сделать полезную выжимку из текста статьи/новости/видео.
Формат ответа СТРОГО JSON:
{
  "title": "Информативный заголовок",
  "content": "Выжимка в формате Markdown: краткая суть, основные тезисы списком, выводы. Используй жирный шрифт для выделения главного.",
  "type": "Выбери одно из: Статья, Кейс, Инструмент, Заметка",
  "tags": ["тег1", "тег2"]
}
Не пиши ничего кроме JSON!`;

        try {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              response_format: { type: "json_object" },
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Сделай выжимку этого текста:\n\n${content}` }
              ]
            })
          });
          const json = await response.json();
          const parsed = JSON.parse(json.choices[0].message.content);
          
          const user = await getUser();
          if (!user) throw new Error("Пользователь не найден");

          const { data, error } = await db.from('knowledge_base').insert({
            user_id: user.id,
            title: parsed.title || 'Сохраненная ссылка',
            content: parsed.content || content.substring(0, 500) + '...',
            type: parsed.type || 'Заметка',
            tags: parsed.tags || [],
            source_url: url
          }).select().single();

          if (error) throw error;
          return { success: true, message: `Успешно сохранено: ${parsed.title}`, id: data.id };
        } catch (e) {
          return { success: false, error: 'Ошибка генерации выжимки или сохранения: ' + e.message };
        }
      }
      default:
        return { success: false, error: `Неизвестная функция: ${name}` };
    }
  } catch(e) {
    return { success: false, error: e.message };
  }
}

async function askAI(userMessage, context = '', imageUrl = null, disableTools = false, disableHistory = false) {
  if (!AI_API_KEY) return 'API ключ для нейросети не настроен (AI_API_KEY).';

  const settings = await getSettings();
  const now = new Date();
  const timeStr = now.toLocaleString('ru-RU', {
    timeZone: 'Europe/Minsk',
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  let extraCtx = '';
  if (settings.context?.custom_instructions?.length) {
    const validInstructions = settings.context.custom_instructions.filter(i => !i.includes('ALTER TABLE tasks'));
    if (validInstructions.length) {
      extraCtx = '\n\nДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ:\n' +
        validInstructions.map((ins, i) => `${i+1}. ${ins}`).join('\n');
    }
  }

  const systemInstruction = `${SYSTEM_PROMPT}\n\n${USER_CONTEXT}\n\nТЕКУЩЕЕ ВРЕМЯ: ${timeStr}${extraCtx}${context ? '\n\n' + context : ''}`;

  let messages = [];
  if (!disableHistory) {
    const history = await getRecentMessages(8); // Reduced from 20 to avoid Groq TPM 6000 token limit
    messages = history.map(m => ({ role: m.role, content: m.content }));
  }
  
  if (imageUrl) {
    messages.push({ 
      role: 'user', 
      content: [
        { type: 'text', text: userMessage },
        { type: 'image_url', image_url: { url: imageUrl } }
      ] 
    });
  } else {
    messages.push({ role: 'user', content: userMessage });
  }

  // Сразу отправляем статус "Печатает...", чтобы не казалось, что бот завис
  bot.sendChatAction(CHAT_ID, 'typing').catch(() => {});

  let response = await callAPI(systemInstruction, messages, 0, !!imageUrl, null, disableTools);
  let maxIter = 5;

  while (maxIter-- > 0) {
    const choice = response.choices?.[0];
    if (!choice) break;
    const message = choice.message;

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return message.content || 'Не удалось получить ответ';
    }

    messages.push(message);
    for (const toolCall of message.tool_calls) {
      let args = {};
      try { args = JSON.parse(toolCall.function.arguments); } catch(e) {}
      console.log(`🔧 [Bot] Calling: ${toolCall.function.name}`, args);
      const result = await executeFunctionCall(toolCall.function.name, args);
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: JSON.stringify(result)
      });
    }

    response = await callAPI(systemInstruction, messages, 0, !!imageUrl);
  }

  return response.choices?.[0]?.message?.content || 'Не удалось получить ответ';
}

async function callAPI(systemInstruction, messages, retryCount = 0, isVision = false, forceModel = null, disableTools = false) {
  let modelToUse = forceModel || AI_MODEL;
  if (isVision) {
    if (AI_API_URL.includes('groq')) modelToUse = 'llama-3.2-90b-vision-preview';
    else if (AI_API_URL.includes('openai')) modelToUse = 'gpt-4o-mini';
    else if (AI_API_URL.includes('openrouter')) modelToUse = 'openrouter/free';
  }

  const res = await fetch(AI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_API_KEY}`
    },
    body: JSON.stringify({
      model: modelToUse,
      messages: [
        { role: 'system', content: systemInstruction },
        ...messages
      ],
      tools: (isVision || disableTools) ? undefined : TOOLS,
      tool_choice: (isVision || disableTools) ? undefined : 'auto',
      temperature: 0.1,
      max_tokens: 1024
    })
  });

  if (!res.ok) {
    const err = await res.json();
    const errMsg = err.error?.message || `API error ${res.status}`;
    
    if (res.status === 429 && retryCount < 2) {
      if (errMsg.includes('tokens per day') || errMsg.includes('TPD')) {
        console.warn('Groq TPD limit reached! Falling back to smaller model...');
        return callAPI(systemInstruction, messages, retryCount + 1, isVision, 'llama-3.1-8b-instant', disableTools);
      }

      let waitTime = 20;
      const matchM = errMsg.match(/try again in ([\d\.]+)m/);
      const matchS = errMsg.match(/try again in ([\d\.]+)s/);
      if (matchM && matchM[1]) waitTime = parseFloat(matchM[1]) * 60 + 1;
      else if (matchS && matchS[1]) waitTime = parseFloat(matchS[1]) + 1;
      
      if (waitTime > 30 && AI_API_URL.includes('groq')) {
         console.warn(`Wait time ${waitTime}s is too long, falling back to smaller model...`);
         return callAPI(systemInstruction, messages, retryCount + 1, isVision, 'llama-3.1-8b-instant', disableTools);
      }

      console.warn(`Rate limit hit. Waiting ${waitTime}s...`);
      await new Promise(r => setTimeout(r, waitTime * 1000));
      return callAPI(systemInstruction, messages, retryCount + 1, isVision, forceModel, disableTools);
    }
    
    // Fallback if model fails to generate valid tool call JSON
    if (errMsg.includes('failed_generation') && retryCount < 1) {
      console.warn('Groq failed_generation. Retrying without tools...');
      const fallbackRes = await fetch(AI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AI_API_KEY}` },
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            { role: 'system', content: systemInstruction + '\nОТВЕЧАЙ ТОЛЬКО ТЕКСТОМ, НЕ ВЫЗЫВАЙ ФУНКЦИИ.' },
            ...messages
          ],
          temperature: 0.1,
          max_tokens: 1024
        })
      });
      if (fallbackRes.ok) return fallbackRes.json();
    }
    
    throw new Error(errMsg);
  }

  return res.json();
}

// ============================================
// TELEGRAM HANDLERS
// ============================================

// /start — регистрация chat_id
bot.onText(/\/start/, (msg) => {
  CHAT_ID = msg.chat.id.toString();
  console.log(`📍 Chat ID: ${CHAT_ID}`);
  bot.sendMessage(CHAT_ID, 'Привет! Я твой антигравити-ассистент. Можешь писать текстом, скидывать голосовые (я их расшифрую) или присылать фотографии чеков для учета финансов!');
});

// Обработка фотографий (сканер чеков)
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const user = await getUser();
  
  // --- ПЕРЕХВАТ DEEP WORK ---
  if (globalDeepWorkUntil && Date.now() < globalDeepWorkUntil) {
    await db.from('inbox').insert({ user_id: user.id, content: 'Фотография от ' + new Date().toLocaleTimeString() });
    return bot.sendMessage(chatId, '🤫 Фото сохранено (помечено в Инбоксе). Возвращайся к работе!');
  }
  // --------------------------

  try {
    const sentMsg = await bot.sendMessage(msg.chat.id, '👀 Изучаю чек...');
    
    // Получаем фото в максимальном разрешении
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const fileLink = await bot.getFileLink(fileId);
    
    // Скачиваем фото и конвертируем в base64
    const response = await fetch(fileLink);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const imageUrl = `data:image/jpeg;base64,${base64}`;
    
    let userCaption = msg.caption ? `Комментарий пользователя: ${msg.caption}\n` : '';
    
    // Шаг 1: Просим Vision-модель (которая может не уметь вызывать инструменты) просто подробно описать чек
    const visionPrompt = `Ты профессиональный бухгалтер. Внимательно изучи этот чек. 
Извлеки: 
1. Итоговую сумму (только число).
2. Способ оплаты (наличные, карта и т.д.).
3. Краткий список покупок (откуда чек и основные товары).
Напиши это просто текстом. Никаких функций не вызывай.`;

    // Вызываем API только для извлечения текста
    let visionUrl = 'https://openrouter.ai/api/v1/chat/completions';
    let visionKey = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY;
    let visionModel = 'meta-llama/llama-3.2-90b-vision-instruct:free';
    
    const visionRes = await fetch(visionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${visionKey}` },
      body: JSON.stringify({
        model: visionModel,
        messages: [{ role: 'user', content: [{ type: 'text', text: visionPrompt }, { type: 'image_url', image_url: { url: imageUrl } }] }],
        max_tokens: 500
      })
    });
    
    const visionData = await visionRes.json();
    const receiptDescription = visionData.choices?.[0]?.message?.content;
    
    if (!receiptDescription) {
      throw new Error(`Не удалось прочитать фотографию чека: ${JSON.stringify(visionData.error || visionData)}`);
    }

    // Шаг 2: Передаем извлеченный текст ОБЫЧНОЙ текстовой модели, которая идеально умеет вызывать инструменты
    const actionPrompt = `Пользователь прислал фотографию. Вот детальное описание того, что на ней (от ИИ-визуализатора):
---
${receiptDescription}
---
Комментарий пользователя к фото: ${userCaption}

ВНИМАНИЕ! КРИТИЧЕСКОЕ ЗАДАНИЕ ПО ОБРАБОТКЕ ФОТО:
Проанализируй описание фото и выбери ОДНО из действий:

1. Если на фото кассовый чек, счет из ресторана или квитанция об оплате:
   ОБЯЗАН вызвать встроенный инструмент create_transaction для сохранения расхода!
   - amount: возьми сумму из чека
   - category: логичная категория
   - comment: перечисли ВСЕ купленные товары из чека через запятую, включая их количество, чтобы я знал, за что конкретно заплатил (например: "Молоко 2шт, Хлеб, Кофе")

2. Если на фото изображено что-то, подтверждающее полезную привычку пользователя (например: беговые кроссовки на улице, еда для здорового питания, коврик для фитнеса, раскрытая книга, гантели, витамины):
   СНАЧАЛА вызови инструмент get_habits, чтобы узнать список привычек. ЗАТЕМ вызови инструмент log_habit для нужной привычки (чтобы поставить галочку "Выполнено" на сегодня). ОЧЕНЬ ВАЖНО: Если видишь кроссовки или улицу - это бег!

3. Во всех остальных случаях (мемы, коты, рандомные фото без явной связи с финансами или привычками):
   Ничего не вызывай, просто коротко и дружелюбно прокомментируй фото текстом.

ПОСЛЕ успешного вызова функции, обязательно напиши пользователю короткий текстовый ответ (например: "Чек записан!" или "✅ Пробежка засчитана, молодец!").`;

    const aiResponse = await askAI(actionPrompt);
    
    // Сохраняем в историю
    await saveMessage('user', userCaption + ' [Фотография чека]');
    await saveMessage('assistant', aiResponse);
    
    bot.editMessageText(aiResponse, {
      chat_id: msg.chat.id,
      message_id: sentMsg.message_id,
      parse_mode: 'Markdown'
    });
  } catch (e) {
    console.error('Photo error:', e);
    bot.sendMessage(msg.chat.id, '❌ Произошла ошибка при распознавании фото: ' + e.message);
  }
});

// /tasks — список задач
bot.onText(/\/tasks/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const tasks = await getTasks();
    if (tasks.length === 0) {
      return bot.sendMessage(chatId, '📋 Активных задач нет. Красота!');
    }
    const priorityEmoji = { 'Высокий': '🔴', 'Средний': '🟡', 'Низкий': '🟢' };
    let text = '📋 *Активные задачи:*\n\n';
    tasks.slice(0, 15).forEach((t, i) => {
      const emoji = priorityEmoji[t.priority] || '⚪';
      const deadline = t.deadline ? ` (до ${t.deadline})` : '';
      text += `${i+1}. ${emoji} ${t.title}${deadline}\n   _${t.direction} · ${t.status}_\n\n`;
    });
    if (tasks.length > 15) text += `... и ещё ${tasks.length - 15} задач`;
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch(e) {
    bot.sendMessage(chatId, '❌ Ошибка загрузки задач: ' + e.message);
  }
});

// /level — RPG Статистика
bot.onText(/\/level/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const stats = await getGamificationStats();
    const xp = stats.totalXp;
    const level = Math.floor(Math.sqrt(xp / 50)) + 1;
    
    let rank = 'Новичок';
    if (level >= 20) rank = 'Босс Жизни 👑';
    else if (level >= 13) rank = 'Сеньор-Достигатор 💎';
    else if (level >= 8) rank = 'Мастер Времени ⏳';
    else if (level >= 4) rank = 'Джуниор 🚀';
    else if (level >= 2) rank = 'Ученик 🌱';

    const currentLevelBaseXp = Math.pow(level - 1, 2) * 50;
    const nextLevelBaseXp = Math.pow(level, 2) * 50;

    let text = `🎮 *Твоя RPG-Статистика*\n\n`;
    text += `👑 *Ранг:* ${rank}\n`;
    text += `📈 *Уровень:* ${level}\n`;
    text += `⚡ *Опыт (XP):* ${xp} / ${nextLevelBaseXp}\n\n`;
    text += `_До следующего уровня: ${nextLevelBaseXp - xp} XP_\n\n`;
    text += `✅ *Задач выполнено:* ${stats.tasksDone}\n`;
    text += `🔥 *Привычек закрыто:* ${stats.habitsDone}`;

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch(e) {
    bot.sendMessage(chatId, '❌ Ошибка загрузки статистики: ' + e.message);
  }
});

// /today — план на сегодня
bot.onText(/\/today/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const todayTasks = await getTasksDueToday();
    const events = await getTodayEvents();
    const overdue = await getOverdueTasks();
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

    let text = `📅 *${dateStr}*\n\n`;

    if (events.length > 0) {
      text += '🕐 *События:*\n';
      events.forEach(e => {
        const start = new Date(e.start_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        text += `  ${start} — ${e.title}\n`;
      });
      text += '\n';
    }

    if (todayTasks.length > 0) {
      text += '🎯 *Задачи на сегодня:*\n';
      todayTasks.forEach(t => { text += `  • ${t.title}\n`; });
      text += '\n';
    }

    if (overdue.length > 0) {
      text += `⚠️ *Просрочено (${overdue.length}):*\n`;
      overdue.slice(0, 5).forEach(t => { text += `  • ${t.title} (${t.deadline})\n`; });
      text += '\n';
    }

    if (events.length === 0 && todayTasks.length === 0 && overdue.length === 0) {
      text += 'Сегодня чисто — ни задач, ни событий. Отдыхаем или берёмся за что-то новое? 🚀';
    }

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch(e) {
    bot.sendMessage(chatId, '❌ Ошибка: ' + e.message);
  }
});

// /briefing — утренний брифинг вручную
bot.onText(/\/briefing/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '⏳ Готовлю утренний брифинг...');
  try {
    const text = await generateMorningBriefing();
    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' }).catch(() => {
      bot.sendMessage(chatId, text); // Без markdown в случае ошибки
    });
  } catch(e) {
    bot.sendMessage(chatId, '❌ Ошибка генерации брифинга: ' + e.message);
  }
});

// /roast — вечерняя прожарка вручную
bot.onText(/\/roast/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '🔥 Готовлю прожарку дня...');
  try {
    const text = await generateEveningReview();
    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' }).catch(() => {
      bot.sendMessage(chatId, text);
    });
  } catch(e) {
    bot.sendMessage(chatId, '❌ Ошибка генерации прожарки: ' + e.message);
  }
});

// /health — индекс формы
bot.onText(/\/health/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '🏃‍♂️ Анализирую индекс формы...');
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);
    const startIso = thirtyDaysAgo.toISOString().split('T')[0];
    const endIso = today.toISOString().split('T')[0];

    const habits = await getHabits();
    const logs = await getHabitLogs(startIso, endIso);

    const healthKeywords = ['сон', 'спать', 'бег', 'пробежк', 'спорт', 'тренир', 'пресс', 'зарядк', 'вод', 'health', 'отжиман'];
    const healthHabits = habits.filter(h => healthKeywords.some(kw => h.name.toLowerCase().includes(kw)));

    if (healthHabits.length === 0) {
      return bot.sendMessage(chatId, 'У тебя пока нет привычек для здоровья! Добавь "Сон" или "Зарядка" в веб-интерфейсе.');
    }

    let doneCount = 0;
    const todayStr = today.toISOString().split('T')[0];
    healthHabits.forEach(h => {
      if (logs.some(l => l.habit_id === h.id && l.date === todayStr && l.status === 'done')) {
        doneCount++;
      }
    });

    const score = Math.round((doneCount / healthHabits.length) * 100);
    let emoji = score >= 80 ? '🔥' : (score >= 50 ? '⚡' : '💀');
    
    let text = `*Твой Индекс Формы на сегодня:* ${score}% ${emoji}\n\n`;
    text += `Выполнено: ${doneCount} из ${healthHabits.length} здоровых привычек.\n`;
    text += `\nЗайди в веб-приложение (вкладка Здоровье), чтобы посмотреть график активности!`;

    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' }).catch(() => {
      bot.sendMessage(chatId, text);
    });
  } catch(e) {
    bot.sendMessage(chatId, '❌ Ошибка генерации индекса: ' + e.message);
  }
});

// ============================================
// VOICE TO TEXT (WHISPER)
// ============================================

async function transcribeAudio(buffer, filename) {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY не задан в .env. Голосовые сообщения не работают.");
  
  const FormDataNode = require('form-data');
  const formData = new FormDataNode();
  formData.append('file', Buffer.from(buffer), { filename: filename, contentType: 'audio/ogg' });
  formData.append('model', 'whisper-large-v3');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      ...formData.getHeaders()
    },
    body: formData.getBuffer()
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.text;
}

// Любое текстовое или голосовое сообщение — отправляем в ИИ
bot.on('message', async (msg) => {
  if (msg.text?.startsWith('/')) return; // Команды обрабатываются выше
  const chatId = msg.chat.id;

  // Автоматически запоминаем chat_id
  if (!CHAT_ID) CHAT_ID = chatId.toString();

  try {
    let textToProcess = msg.text;

    // Обработка голосовых и видео-кружочков
    let fileId = null;
    let fileExt = 'ogg';
    if (msg.voice) { fileId = msg.voice.file_id; fileExt = 'ogg'; }
    else if (msg.video_note) { fileId = msg.video_note.file_id; fileExt = 'mp4'; }

    if (fileId) {
      bot.sendChatAction(chatId, 'typing');
      const fileLink = await bot.getFileLink(fileId);
      const res = await fetch(fileLink);
      if (!res.ok) throw new Error("Не удалось скачать файл из Telegram");
      const buffer = await res.arrayBuffer();
      
      const transcribed = await transcribeAudio(buffer, `audio.${fileExt}`);
      if (!transcribed || transcribed.trim() === '') {
        return bot.sendMessage(chatId, '🔕 Не удалось распознать речь (тишина или шум).');
      }
      
      bot.sendMessage(chatId, `🎤 *Распознано:* _${transcribed}_`, { parse_mode: 'Markdown' });
      textToProcess = transcribed;
    }

    if (!textToProcess) return; // Игнорируем фото/стикеры без текста

    // --- ПЕРЕХВАТ DEEP WORK ---
    if (globalDeepWorkUntil && Date.now() < globalDeepWorkUntil) {
      if (textToProcess.toLowerCase().includes('стоп') || textToProcess.toLowerCase().includes('отмени')) {
        globalDeepWorkUntil = null;
        if (deepWorkTimeout) clearTimeout(deepWorkTimeout);
        return bot.sendMessage(chatId, 'Режим Deep Work досрочно отменен.');
      }
      const user = await getUser();
      await db.from('inbox').insert({ user_id: user?.id, content: textToProcess });
      return bot.sendMessage(chatId, '🤫 Сохранено в Инбокс. Возвращайся к работе!');
    }
    // --------------------------

    // Сохраняем сообщение пользователя
    await saveMessage('user', textToProcess);

    // Показываем "печатает..."
    bot.sendChatAction(chatId, 'typing');

    // Получаем ответ от ИИ
    const reply = await askAI(textToProcess);

    // Сохраняем ответ ассистента
    await saveMessage('assistant', reply);

    // Отправляем (разбиваем длинные сообщения)
    if (reply.length > 4000) {
      const chunks = reply.match(/.{1,4000}/gs) || [reply];
      for (const chunk of chunks) {
        await bot.sendMessage(chatId, chunk, { parse_mode: 'Markdown' }).catch(() => {
          bot.sendMessage(chatId, chunk); // Без Markdown если ошибка парсинга
        });
      }
    } else {
      await bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' }).catch(() => {
        bot.sendMessage(chatId, reply);
      });
    }
  } catch(e) {
    console.error('Bot message error:', e);
    let debugInfo = e.message;
    if (e.cause) debugInfo += '\nCause: ' + e.cause.message;
    if (e.stack) debugInfo += '\nStack: ' + e.stack.substring(0, 200);
    bot.sendMessage(chatId, '❌ Ошибка (Дебаг):\n' + debugInfo);
  }
});

// ============================================
// PROACTIVE MESSAGES (CRON)
// ============================================

async function generateMorningBriefing() {
  const todayTasks = await getTasksDueToday();
  const overdue = await getOverdueTasks();
  const upcoming = await getUpcomingDeadlines(7);
  const events = await getTodayEvents();
  const habits = await getHabits();

  const contextData = `
ДАННЫЕ ДЛЯ УТРЕННЕГО БРИФИНГА:
- Задачи на сегодня: ${JSON.stringify(todayTasks.map(t => t.title))}
- Просроченные задачи: ${JSON.stringify(overdue.map(t => ({ title: t.title, deadline: t.deadline })))}
- Дедлайны на 7 дней: ${JSON.stringify(upcoming.map(t => ({ title: t.title, deadline: t.deadline })))}
- События сегодня: ${JSON.stringify(events.map(e => ({ title: e.title, start: e.start_at })))}
- Привычки: ${JSON.stringify(habits.map(h => h.name))}

Сгенерируй утренний брифинг. Формат:
1. Приветствие с датой
2. Главная задача дня (самая важная)
3. Остальные задачи
4. Расписание (если есть события)
5. Напоминания и дедлайны
6. Мотивация (коротко)
`;

  return await askAI('Сгенерируй утренний брифинг', contextData, null, true, true);
}

async function generateEveningReview() {
  const completedToday = await getTasksCompletedToday();
  const todayTasks = await getTasksDueToday();
  const overdue = await getOverdueTasks();
  const habitLogs = await getHabitLogsToday();
  const habits = await getHabits();

  const contextData = `
ДАННЫЕ ДЛЯ ВЕЧЕРНЕГО ОБЗОРА:
- РЕАЛЬНО ВЫПОЛНЕНО СЕГОДНЯ: ${completedToday.length} задач. (${JSON.stringify(completedToday.map(t => t.title))})
- ЗАБРОШЕНО НА СЕГОДНЯ (осталось висеть): ${todayTasks.length} задач. (${JSON.stringify(todayTasks.map(t => t.title))})
- ПРОСРОЧЕННЫЕ (хвосты с прошлых дней): ${overdue.length} задач. (${JSON.stringify(overdue.map(t => t.title))})
- Привычки выполнены сегодня: ${habitLogs.length} из ${habits.length}. (${JSON.stringify(habitLogs.map(l => l.habits?.name))})

Сгенерируй вечернюю прожарку дня (Roast My Day).
ИНСТРУКЦИЯ:
Ты — жесткий, саркастичный и прямолинейный ИИ-тренер. 
Проанализируй эти цифры. 
- Если закрыто много задач (от 5+) и сделаны привычки — скупо похвали, но скажи, что расслабляться рано.
- Если выполнено мало задач (0-3), остались висяки или забыты привычки — ЖЕСТКО ПРОЖАРЬ ЕГО. Смейся над его ленью, используй сарказм и черный юмор. Заставь его почувствовать жгучий стыд за прокрастинацию. Выведи список того, что он провалил. Запрети ему отдыхать, пока не сделает выводы.
- Напомни, что отбой строго в 22:30.
Отвечай ярко, с эмодзи, как строгий коуч. Не будь банальным ботом.
`;

  return await askAI('Сгенерируй вечерний обзор-прожарку', contextData, null, true, true);
}

async function generateWeeklyReview() {
  const stats = await getWeekStats();
  const overdue = await getOverdueTasks();

  const contextData = `
ЕЖЕНЕДЕЛЬНЫЙ ОБЗОР:
- Задач закрыто за неделю: ${stats.completed}
- Задач создано за неделю: ${stats.created}
- Просрочено: ${overdue.length}

Сгенерируй еженедельный обзор. Похвали за достижения, обрати внимание на проблемы, спроси про цели на следующую неделю.
`;

  return await askAI('Еженедельный обзор', contextData, null, true, true);
}

function sendProactiveMessage(text) {
  if (!CHAT_ID) {
    console.warn('⚠️ CHAT_ID не задан. Отправь /start боту, чтобы зарегистрировать.');
    return;
  }
  bot.sendMessage(CHAT_ID, text, { parse_mode: 'Markdown' }).catch(err => {
    console.error('Ошибка отправки проактивного сообщения:', err.message);
    // Попробуем без Markdown
    bot.sendMessage(CHAT_ID, text).catch(() => {});
  });
}

// ---- CRON JOBS ----

// [NEW] Подъем и пробежка: 7:00 по Минску = 4:00 UTC
cron.schedule('0 4 * * *', () => {
  sendProactiveMessage('☀️ *Доброе утро!* Время просыпаться. Надевай кроссовки, 15 минут бега и зарядка на пресс ждут тебя!');
}, { timezone: 'UTC' });

// Утренний брифинг: 8:45 по Минску (UTC+3) = 5:45 UTC
cron.schedule('45 5 * * *', async () => {
  console.log('⏰ Cron: утренний брифинг');
  try {
    const text = await generateMorningBriefing();
    await saveMessage('assistant', text);
    sendProactiveMessage('📝 *План на день*\n\n' + text);
  } catch(e) {
    console.error('Cron morning error:', e);
    sendProactiveMessage('📝 Доброе утро! Не смог собрать брифинг — проверь логи.');
  }
}, { timezone: 'UTC' });

// Напоминание перед Deep Work: 9:55 по Минску = 6:55 UTC
cron.schedule('55 6 * * 1-5', () => {
  sendProactiveMessage('🧠 Через 5 минут — Deep Work. Закрой мессенджеры, убери уведомления, выбери главную задачу. Погнали! 🚀');
}, { timezone: 'UTC' });

// [NEW] Обед: 13:00 по Минску = 10:00 UTC
cron.schedule('0 10 * * 1-5', () => {
  sendProactiveMessage('🍔 *Время обеда!* Твое время с 13:00 до 14:00 защищено. Отрывайся от монитора и отдыхай.');
}, { timezone: 'UTC' });

// Вечерний обзор: 19:30 по Минску = 16:30 UTC
cron.schedule('30 16 * * *', async () => {
  console.log('⏰ Cron: вечерний обзор');
  try {
    const text = await generateEveningReview();
    await saveMessage('assistant', text);
    sendProactiveMessage('🌙 *Вечерний обзор*\n\n' + text);
  } catch(e) {
    console.error('Cron evening error:', e);
    sendProactiveMessage('🌙 Вечер! Не смог собрать обзор дня — проверь логи.');
  }
}, { timezone: 'UTC' });

// Еженедельный обзор: воскресенье 19:00 по Минску = 16:00 UTC
cron.schedule('0 16 * * 0', async () => {
  console.log('⏰ Cron: еженедельный обзор');
  try {
    const text = await generateWeeklyReview();
    await saveMessage('assistant', text);
    sendProactiveMessage('📊 *Итоги недели*\n\n' + text);
  } catch(e) {
    console.error('Cron weekly error:', e);
  }
}, { timezone: 'UTC' });

// Стоп работы: 20:00 по Минску = 17:00 UTC
cron.schedule('0 17 * * *', () => {
  sendProactiveMessage('🛑 20:00 — время закрывать ноут. Ты сегодня молодец. Отдыхай, проведи вечер с Кристиной! 💜');
}, { timezone: 'UTC' });

// [NEW] Подготовка ко сну: 22:00 по Минску = 19:00 UTC
cron.schedule('0 19 * * *', () => {
  sendProactiveMessage('🛌 Уже 22:00. Пора замедляться. Отбой в 22:30–23:00, чтобы завтра легко встать в 7:00 и быть бодрым!');
}, { timezone: 'UTC' });

// [TEST] Тестовое уведомление на сейчас
cron.schedule('26,28 11 * * *', () => {
  sendProactiveMessage('🤖 ПИИП-ПИИП! Это тестовое сообщение от планировщика! Я жив, здоров и не сплю. Можешь быть уверен — вечером напишу по расписанию! 😎');
}, { timezone: 'UTC' });

// Проверка дедлайнов (каждый день в 10:00 = 7:00 UTC)
cron.schedule('0 7 * * *', async () => {
  try {
    const upcoming = await getUpcomingDeadlines(1); // Дедлайн завтра
    for (const task of upcoming) {
      sendProactiveMessage(`⚠️ Завтра дедлайн: *${task.title}*\nЧто осталось сделать?`);
    }
  } catch(e) {
    console.error('Cron deadline check error:', e);
  }
}, { timezone: 'UTC' });

console.log('✅ Cron-задачи настроены:');
console.log('   🏃 Подъем и бег: 7:00');
console.log('   📝 Утренний брифинг: 8:45');
console.log('   🧠 Deep Work reminder: 9:55');
console.log('   🍔 Обед: 13:00');
console.log('   🌙 Вечерний обзор: 19:30');
console.log('   🛑 Стоп работы: 20:00');
console.log('   🛌 Отход ко сну: 22:00');
console.log('   📊 Еженедельный обзор: Вс 19:00');
console.log('   ⚠️ Проверка дедлайнов: 10:00');

// [NEW] Умные напоминания (AI Календарь) — проверка каждую минуту
const notifiedEvents = new Set();
cron.schedule('* * * * *', async () => {
  try {
    const user = await getUser();
    if (!user) return;
    
    const now = new Date();
    // Ищем события, которые наступили в диапазоне: сейчас минус 10 минут ... сейчас плюс 1 минута
    const future = new Date(now.getTime() + 1 * 60000);
    const past = new Date(now.getTime() - 10 * 60000);

    // 1. Проверка Событий (AI Календарь)
    const { data: eventsData } = await db.from('events')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_at', past.toISOString())
      .lte('start_at', future.toISOString());

    if (eventsData && eventsData.length > 0) {
      for (const e of eventsData) {
        if (!notifiedEvents.has(e.id)) {
          const eventTime = new Date(e.start_at);
          if (eventTime <= future) {
            notifiedEvents.add(e.id);
            sendProactiveMessage(`🔔 **Напоминание:** ${e.title}\n${e.description ? '_' + e.description + '_' : ''}`);
          }
        }
      }
    }

    // 2. Проверка Уроков (Репетиторство) - Напоминание за 15 минут
    const future15 = new Date(now.getTime() + 16 * 60000); // 15-16 минут вперед
    const past15 = new Date(now.getTime() + 14 * 60000);

    const { data: lessonsData } = await db.from('lessons')
      .select('*, students(name)')
      .eq('status', 'Запланирован')
      .gte('date', past15.toISOString())
      .lte('date', future15.toISOString());

    if (lessonsData && lessonsData.length > 0) {
      for (const ls of lessonsData) {
        if (!notifiedEvents.has(ls.id)) {
          notifiedEvents.add(ls.id);
          const stName = ls.students?.name || 'Ученик';
          sendProactiveMessage(`🔔 **Урок через 15 минут!**\nУченик: ${stName}\n📚 Тема: ${ls.topic || 'Без темы'}\n✏️ ДЗ: ${ls.homework || 'Не задано'}`);
        }
      }
    }
  } catch (e) {
    console.error('Cron reminders check error:', e);
  }
}, { timezone: 'UTC' });

// ---- HTTP Server for Render Health Checks ----
const http = require('http');
const PORT = process.env.PORT || 80;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('🤖 Бот Игоря работает в штатном режиме!');
}).listen(PORT, () => {
  console.log(`📡 Health-check сервер запущен на порту ${PORT}`);
});

// ---- Graceful Shutdown ----
const gracefulShutdown = () => {
  console.log('🔄 Остановка бота...');
  bot.stopPolling();
  process.exit(0);
};

process.once('SIGINT', gracefulShutdown);
process.once('SIGTERM', gracefulShutdown);
