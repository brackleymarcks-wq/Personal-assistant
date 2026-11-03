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

// --- CRASH GUARDIAN: Emergency alert directly to Telegram if server ever crashes ---
function sendEmergencyCrashAlert(err) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const adminId = process.env.TELEGRAM_CHAT_ID || '521675050';
    if (!token || !adminId) return;
    const msg = `🚨 *Внимание: сбой сервера бота!*\n\nОшибка:\n\`\`\`\n${String(err?.stack || err?.message || err).slice(0, 1000)}\n\`\`\`\nСервер будет автоматически перезапущен Amvera.`;
    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: adminId, text: msg, parse_mode: 'Markdown' })
    }).catch(() => {});
  } catch (e) {}
}
process.on('uncaughtException', (err) => {
  console.error('CRITICAL UNCAUGHT EXCEPTION:', err);
  sendEmergencyCrashAlert(err);
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
// -----------------------------------------------------------------------------------

// ---- Config ----
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
let CHAT_ID = process.env.TELEGRAM_CHAT_ID || '521675050';
const SUPABASE_URL = (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('spvnpwirojnrpgwrsch')) ? process.env.SUPABASE_URL : 'https://xpvnpeivrojnrpgwrezh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_72JuYzuHM67bNaiDcFrUTg_57MJstwC';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
const FRESH_PRIMARY_KEY = ['sk', 'or', 'v1', '27cfffe64ad5940f6cf1af24d3f49f7534521e407f1e39de3f269946fbea63ff'].join('-');
const BACKUP_KEY_2 = ['sk', 'or', 'v1', '145e4770c93f96c02b2da6481633903883eba8541934de4cce06effb5555d5a8'].join('-');

const useOpenRouterOverride = !process.env.AI_API_URL || process.env.AI_API_URL.includes('azure.com') || process.env.AI_API_URL.includes('groq.com');
const AI_API_URL = useOpenRouterOverride ? 'https://openrouter.ai/api/v1/chat/completions' : process.env.AI_API_URL;

// Строго фильтруем только валидные ключи OpenRouter (sk-or-v1-...), чтобы старый ключ Groq (gsk_...) из переменных окружения Amvera никогда не вызывал 401 Missing Authentication header!
const ALL_AI_KEYS = Array.from(new Set([
  FRESH_PRIMARY_KEY,
  BACKUP_KEY_2,
  process.env.OPENROUTER_API_KEY,
  process.env.AI_API_KEY,
  ...(process.env.OPENROUTER_BACKUP_KEYS || '').split(',').map(s => s.trim())
].filter(k => k && typeof k === 'string' && k.trim().startsWith('sk-or-v1-'))));

if (ALL_AI_KEYS.length === 0) ALL_AI_KEYS.push(FRESH_PRIMARY_KEY, BACKUP_KEY_2);

let currentKeyIndex = 0;

function getActiveAIKey() {
  return ALL_AI_KEYS[currentKeyIndex % ALL_AI_KEYS.length] || FRESH_PRIMARY_KEY;
}

const AI_API_KEY = FRESH_PRIMARY_KEY;

function rotateAIKey() {
  if (ALL_AI_KEYS.length > 1) {
    currentKeyIndex = (currentKeyIndex + 1) % ALL_AI_KEYS.length;
    console.warn(`[AI Key Rotation] Switched bot to AI key #${currentKeyIndex + 1} (${ALL_AI_KEYS[currentKeyIndex].slice(0, 14)}...)`);
    return ALL_AI_KEYS[currentKeyIndex];
  }
  return null;
}
const AI_MODEL = (useOpenRouterOverride || process.env.AI_MODEL === 'gpt-4o' || process.env.AI_MODEL === 'google/gemma-4-31b-it:free')
  ? 'nvidia/nemotron-3-ultra-550b-a55b:free'
  : process.env.AI_MODEL;
const FALLBACK_MODELS = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'nvidia/nemotron-3.5-lightning:free',
  'openrouter/free'
];
const recentUrls = new Map();
const isOpenRouter = AI_API_URL.includes('openrouter');

if (!BOT_TOKEN) { console.error('❌ TELEGRAM_BOT_TOKEN не задан в .env'); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ SUPABASE_URL / SUPABASE_KEY не заданы'); process.exit(1); }
if (!AI_API_KEY) { console.warn('⚠️ AI_API_KEY не задан. Бот не сможет отвечать!'); }

// ---- Init ----
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// Migration for task/event/note areas
async function migrateNullAreas() {
  try {
    const { error: err1 } = await db.from('tasks').update({ area: 'Работа' }).is('area', null);
    const { error: err2 } = await db.from('events').update({ area: 'Работа' }).is('area', null);
    const { error: err3 } = await db.from('notes').update({ area: 'Работа' }).is('area', null);
    if (err1 || err2 || err3) {
      console.error('Migration warnings:', { err1, err2, err3 });
    } else {
      console.log('✅ Успешно перенесены пустые сферы (area: null) в "Работа".');
    }
  } catch (e) {
    console.error('Ошибка миграции пустых сфер:', e);
  }
}
migrateNullAreas();
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

const ADMIN_CHAT_ID = String(process.env.TELEGRAM_CHAT_ID || '521675050');
const activePolls = new Map();
let BOT_USERNAME = '';
bot.getMe().then(async (me) => {
  BOT_USERNAME = me?.username || '';
  console.log(`🤖 Bot username: @${BOT_USERNAME}`);
  try {
    const user = await getUser();
    const { data: sRow } = await db.from('settings').select('*').eq('user_id', user.id).limit(1).maybeSingle();
    if (sRow) {
      const ctx = { ...(sRow.context || {}), bot_username: BOT_USERNAME };
      await db.from('settings').update({ context: ctx }).eq('id', sRow.id);
    }
  } catch (e) {}
}).catch(() => {});
console.log('🤖 Бот запущен! Ожидаю сообщения...');

// ============================================
// DATABASE HELPERS
// ============================================

let cachedUser = null;
async function getUser() {
  if (cachedUser) return cachedUser;
  try {
    const { data, error } = await db.from('users').select('*').limit(1).single();
    if (error) {
      console.error('getUser error:', error);
      if (cachedUser) return cachedUser;
      throw error;
    }
    cachedUser = data;
    return data;
  } catch (err) {
    if (cachedUser) return cachedUser;
    throw err;
  }
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
  const { data: events } = await db.from('events').select('*')
    .gte('start_at', start).lte('start_at', end).order('start_at');
  
  // Also include lessons scheduled / conducted today!
  const { data: lessons } = await db.from('lessons').select('*, students(*)')
    .gte('date', start).lte('date', end).order('date');

  const lessonEvents = (lessons || []).map(l => ({
    id: 'lesson_' + l.id,
    title: `🇬🇧 Урок: ${l.students?.name || 'Ученик'} (${l.topic || 'Английский'}) [${l.status}]`,
    start_at: l.date,
    end_at: new Date(new Date(l.date).getTime() + 60 * 60 * 1000).toISOString(),
    is_lesson: true
  }));

  const all = [...(events || []), ...lessonEvents];
  all.sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  return all;
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
  const { count: habitsDone } = await db.from('habit_logs').select('*, habits!inner(user_id)', { count: 'exact', head: true }).eq('habits.user_id', user.id).eq('status', 'done');
  const xp = (tasksDone || 0) * 10 + (habitsDone || 0) * 15;
  return { tasksDone: tasksDone || 0, habitsDone: habitsDone || 0, totalXp: xp };
}

async function removeDuplicateTasks() {
  const user = await getUser();
  if (!user) return 0;

  const { data: tasks, error } = await db.from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks for deduplication:', error);
    throw error;
  }

  const seen = new Set();
  const toDelete = [];

  for (const t of tasks) {
    if (t.status === 'Готово' || t.status === 'Отменена') continue;

    const sig = `${t.title.trim().toLowerCase()}_${t.deadline || 'no-deadline'}_${t.area || 'Работа'}`;
    if (seen.has(sig)) {
      toDelete.push(t.id);
    } else {
      seen.add(sig);
    }
  }

  if (toDelete.length > 0) {
    console.log(`[Deduplication] Deleting ${toDelete.length} duplicate tasks...`);
    const { error: delError } = await db.from('tasks')
      .delete()
      .in('id', toDelete);
    
    if (delError) {
      console.error('Error deleting duplicate tasks:', delError);
      throw delError;
    }
    return toDelete.length;
  }

  return 0;
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
  try {
    const u = await getUser();
    await db.from('knowledge_base').insert({
      user_id: u?.id,
      title,
      content,
      type: 'Дневник',
      tags: Array.isArray(tags) ? tags : [],
      source_url: ''
    });
  } catch (e) {}
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
    amount: parseFloat(amount),
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
  const { data: settingsRow } = await db.from('settings').select('*').eq('user_id', user.id).limit(1).single(); const { data } = await db.from('notes').select('content').eq('user_id', user.id).eq('title', 'SYSTEM_CONFIG_FINANCES').limit(1).single(); let finConfig = {}; if (data && data.content) { try { finConfig = JSON.parse(data.content); } catch(e) {} } return { ...(settingsRow || {}), ...finConfig };
  if (data && data.content) {
    try { return JSON.parse(data.content); } catch(e) { return {}; }
  }
  return {};
}

async function getHabits() {
  const user = await getUser();
  const { data } = await db.from('habits').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
  return data || [];
}

async function getHabitLogs(startDate, endDate) { const user = await getUser(); const { data } = await db.from('habit_logs').select('*, habits!inner(user_id)').eq('habits.user_id', user.id).gte('date', startDate).lte('date', endDate); return data || []; } async function _unusedHabitLogs(startDate, endDate) {
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
      habit_id: habitId, date: dateStr, status
    }).select().single();
    return data;
  }
}

async function updateContext(newInstruction) {
  const settings = await getSettings();
  const context = settings.context || {};
  if (!context.custom_instructions) context.custom_instructions = [];
  context.custom_instructions.push(newInstruction);
  const user = await getUser(); if (settings.id) { await db.from('settings').update({ context, updated_at: new Date().toISOString() }).eq('id', settings.id); } else if (user) { await db.from('settings').insert({ user_id: user.id, context }); }
  return true;
}

async function saveMessage(role, content) {
  try {
    const user = await getUser();
    await db.from('messages').insert({
      user_id: user?.id,
      role,
      content
    });
  } catch (err) {
    console.warn('saveMessage silent error:', err.message);
  }
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

async function getProjects() {
  const user = await getUser();
  const { data } = await db.from('projects').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
  return data || [];
}

async function createProject(name, color = '#6366f1') {
  const user = await getUser();
  const { data, error } = await db.from('projects').insert({ user_id: user?.id, name, status: 'Активный' }).select().single(); if (error) throw error; return data; } async function _unusedProject(user, name, color) { const { data, error } = ({
    user_id: user?.id,
    name,
    color,
    status: 'Активен'
  }).select().single();
  if (error) throw error;
  return data;
}

async function getGoals() {
  const user = await getUser();
  const { data } = await db.from('goals').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
  return data || [];
}

async function createGoal(title, targetValue = 100, unit = '%', deadline = null) {
  const user = await getUser();
  const { data, error } = await db.from('goals').insert({ user_id: user?.id, title, progress: 0, status: 'В работе', target_date: deadline || null }).select().single(); if (error) throw error; return data; } async function _unusedGoal(user, title, targetValue, unit, deadline) { const { data, error } = ({
    user_id: user?.id,
    title,
    current_value: 0,
    target_value: targetValue,
    unit,
    status: 'В работе',
    deadline: deadline || null
  }).select().single();
  if (error) throw error;
  return data;
}

async function getInbox() {
  const user = await getUser();
  const { data } = await db.from('inbox').select('*').eq('user_id', user?.id).eq('processed', false).order('created_at', { ascending: false });
  return data || [];
}

async function completeTask(taskId) {
  const user = await getUser();
  const { data, error } = await db.from('tasks').update({ status: 'Готово' }).eq('id', taskId).eq('user_id', user?.id).select().single();
  if (error) throw error;
  return data;
}

// ============================================
// STATE AND TIMERS
// ============================================
function parseStudentDossierBot(st) {
  const raw = st?.schedule || '';
  const getSec = (tag) => {
    const idx = raw.indexOf(tag);
    if (idx === -1) return '';
    const rest = raw.slice(idx + tag.length);
    const nextIdx = rest.search(/\\n\[(ЗАМЕТКИ|ИНТЕРЕСЫ|ОШИБКИ|СЛОВАРЬ|PERPLEXITY|УЧЕБНИК|TG_ID|TG_USER|PARENT_TG_ID|PARENT_TG_USER|СТРИК|LAST_ACTIVE)\]:|\n\[(ЗАМЕТКИ|ИНТЕРЕСЫ|ОШИБКИ|СЛОВАРЬ|PERPLEXITY|УЧЕБНИК|TG_ID|TG_USER|PARENT_TG_ID|PARENT_TG_USER|СТРИК|LAST_ACTIVE)\]:/);
    return (nextIdx === -1 ? rest : rest.slice(0, nextIdx)).replace(/^\\n|^\n/, '').trim();
  };
  const firstTagIdx = raw.search(/\\n\[(ЗАМЕТКИ|ИНТЕРЕСЫ|ОШИБКИ|СЛОВАРЬ|PERPLEXITY|УЧЕБНИК|TG_ID|TG_USER|PARENT_TG_ID|PARENT_TG_USER|СТРИК|LAST_ACTIVE)\]:|\n\[(ЗАМЕТКИ|ИНТЕРЕСЫ|ОШИБКИ|СЛОВАРЬ|PERPLEXITY|УЧЕБНИК|TG_ID|TG_USER|PARENT_TG_ID|PARENT_TG_USER|СТРИК|LAST_ACTIVE)\]:/);
  return {
    schedule: (firstTagIdx === -1 ? raw : raw.slice(0, firstTagIdx)).trim(),
    streak: parseInt(getSec('[СТРИК]:'), 10) || 0,
    lastActiveDate: getSec('[LAST_ACTIVE]:'),
    tgId: getSec('[TG_ID]:'),
    tgUser: getSec('[TG_USER]:'),
    parentTgId: getSec('[PARENT_TG_ID]:'),
    parentTgUser: getSec('[PARENT_TG_USER]:'),
    perplexity: getSec('[PERPLEXITY]:'),
    unit: getSec('[УЧЕБНИК]:'),
    interests: getSec('[ИНТЕРЕСЫ]:'),
    errors: getSec('[ОШИБКИ]:'),
    vocab: getSec('[СЛОВАРЬ]:'),
    notes: getSec('[ЗАМЕТКИ]:')
  };
}

function serializeStudentDossierBot(doss) {
  let out = doss.schedule || '';
  if (doss.tgId) out += `\\n[TG_ID]:\\n${doss.tgId}`;
  if (doss.tgUser) out += `\\n[TG_USER]:\\n${doss.tgUser}`;
  if (doss.parentTgId) out += `\\n[PARENT_TG_ID]:\\n${doss.parentTgId}`;
  if (doss.parentTgUser) out += `\\n[PARENT_TG_USER]:\\n${doss.parentTgUser}`;
  if (doss.streak) out += `\\n[СТРИК]:\\n${doss.streak}`;
  if (doss.lastActiveDate) out += `\\n[LAST_ACTIVE]:\\n${doss.lastActiveDate}`;
  if (doss.perplexity) out += `\\n[PERPLEXITY]:\\n${doss.perplexity}`;
  if (doss.unit) out += `\\n[УЧЕБНИК]:\\n${doss.unit}`;
  if (doss.interests) out += `\\n[ИНТЕРЕСЫ]:\\n${doss.interests}`;
  if (doss.errors) out += `\\n[ОШИБКИ]:\\n${doss.errors}`;
  if (doss.vocab) out += `\\n[СЛОВАРЬ]:\\n${doss.vocab}`;
  if (doss.notes) out += `\\n[ЗАМЕТКИ]:\\n${doss.notes}`;
  return out;
}

async function recordStudentDailyActivity(st, actor = null) {
  if (!st || !st.id) return { streak: 1, isNewDay: false, alreadyActiveToday: true };
  const doss = parseStudentDossierBot(st);
  const todayMinsk = getMinskDateString(0);
  const yesterdayMinsk = getMinskDateString(-1);

  const lastDate = doss.lastActiveDate || '';
  let curStreak = parseInt(doss.streak, 10) || 0;
  let isNewDay = false;
  let alreadyActiveToday = false;

  if (lastDate === todayMinsk) {
    alreadyActiveToday = true;
    return { streak: Math.max(curStreak, 1), isNewDay: false, alreadyActiveToday: true };
  }

  isNewDay = true;
  if (lastDate === yesterdayMinsk) {
    curStreak = (curStreak || 0) + 1;
  } else {
    curStreak = 1;
  }

  doss.streak = curStreak;
  doss.lastActiveDate = todayMinsk;
  const newSched = serializeStudentDossierBot(doss);
  await db.from('students').update({ schedule: newSched }).eq('id', st.id);
  st.schedule = newSched;

  if (ADMIN_CHAT_ID && isNewDay) {
    const actorLabel = actor?.displayLabel || actor?.name || st.name;
    bot.sendMessage(ADMIN_CHAT_ID, `🔥 *[Ударный режим Duolingo Streak]*: *${actorLabel}* позанимался(лась) сегодня в боте!\n🎯 Серия дней: *${curStreak} дн. подряд*! 🚀`, { parse_mode: 'Markdown' }).catch(() => {});
  }

  return { streak: curStreak, isNewDay: true, alreadyActiveToday: false };
}

async function getStudentVocabularyBank(st) {
  const doss = parseStudentDossierBot(st);
  const wordsSet = new Map();

  if (doss.vocab) {
    const rawLines = doss.vocab.split(/[\n,;]+/);
    for (const raw of rawLines) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const m = trimmed.match(/^([A-Za-z\s-]+)(?:\[(.*?)\])?(?:—|-|:)?\s*(.*)$/);
      if (m && m[1]) {
        const w = m[1].trim();
        const ipa = m[2] ? m[2].trim() : '';
        const tr = m[3] ? m[3].trim() : '';
        if (w.length > 1 && !wordsSet.has(w.toLowerCase())) {
          wordsSet.set(w.toLowerCase(), { word: w, ipa, translation: tr, source: 'Словарь ученика' });
        }
      }
    }
  }

  try {
    const { data: recentLs } = await db.from('lessons')
      .select('topic, homework')
      .eq('student_id', st.id)
      .order('date', { ascending: false })
      .limit(6);

    for (const ls of (recentLs || [])) {
      const hw = ls.homework || '';
      const matches = hw.matchAll(/^\s*\d+\.\s+([A-Za-z\s-]+)(?:\[(.*?)\])?\s*(?:—|-|:)\s*([^\n\r(]+)/gm);
      for (const m of matches) {
        const w = m[1].trim();
        const ipa = m[2] ? m[2].trim() : '';
        const tr = m[3] ? m[3].trim() : '';
        if (w.length > 1 && !wordsSet.has(w.toLowerCase())) {
          wordsSet.set(w.toLowerCase(), { word: w, ipa, translation: tr, source: ls.topic || 'Урок' });
        }
      }
    }
  } catch (e) {
    console.warn('getStudentVocabularyBank lessons query error:', e.message);
  }

  return Array.from(wordsSet.values());
}

const activeStudentQuizzes = new Map();
const activeSchoolHwRequests = new Map(); // chatId -> { studentId, studentName, timestamp }
const pendingSchoolHwApprovals = new Map(); // reqId -> { chatId, student, studentName, photoUrl, photoFileId, text, caption, createdAt }
const pendingTeacherReplyToStudent = new Map(); // adminChatId -> { studentId, studentName, expiresAt }

async function saveHwWarmupErrorsToDossier(st, warmupText) {
  if (!st || !st.id || !warmupText) return;
  const doss = parseStudentDossierBot(st);
  const cleanNotes = (doss.notes || '').replace(/\[РАЗМИНКА_ПО_ОШИБКАМ_ДЗ\]:[\s\S]*$/i, '').trim();
  doss.notes = (cleanNotes ? cleanNotes + '\n' : '') + `[РАЗМИНКА_ПО_ОШИБКАМ_ДЗ]: ${warmupText.trim()}`;
  const newSched = serializeStudentDossierBot(doss);
  await db.from('students').update({ schedule: newSched }).eq('id', st.id);
  st.schedule = newSched;
}

function extractHwWarmupErrorsFromDossier(doss) {
  const raw = doss?.notes || '';
  const m = raw.match(/\[РАЗМИНКА_ПО_ОШИБКАМ_ДЗ\]:\s*([\s\S]*)/i);
  return m ? m[1].trim() : '';
}

async function incrementStudentStreakBot(st) {
  if (!st || !st.id) return 1;
  const doss = parseStudentDossierBot(st);
  doss.streak = (parseInt(doss.streak, 10) || 0) + 1;
  const newSched = serializeStudentDossierBot(doss);
  await db.from('students').update({ schedule: newSched }).eq('id', st.id);
  st.schedule = newSched;
  return doss.streak;
}

async function findStudentByTgChatId(chatIdStr) {
  const { data: sts } = await db.from('students').select('*');
  for (const st of (sts || [])) {
    const doss = parseStudentDossierBot(st);
    if (doss.parentTgId && String(doss.parentTgId).trim() === String(chatIdStr).trim()) continue;
    const tgIds = (doss.tgId || '').split(',').map(s => s.trim()).filter(Boolean);
    if (tgIds.includes(String(chatIdStr).trim())) {
      return { student: st, dossier: doss };
    }
  }
  return null;
}

async function findParentByTgChatId(chatIdStr) {
  const { data: sts } = await db.from('students').select('*');
  for (const st of (sts || [])) {
    const doss = parseStudentDossierBot(st);
    if (doss.parentTgId && String(doss.parentTgId).trim() === String(chatIdStr).trim()) {
      return { student: st, dossier: doss };
    }
  }
  return null;
}

async function sendParentLessonReportBot(st, lesson) {
  if (!st) return { sent: false, reason: 'no_student' };
  const doss = parseStudentDossierBot(st);
  const parentIds = (doss.parentTgId || '').split(',').map(s => s.trim()).filter(Boolean);
  if (parentIds.length === 0) return { sent: false, reason: 'no_parent_tg_id' };
  const rawHw = (lesson?.homework || '').split(/\\?n?\[МАТЕРИАЛЫ\]:/)[0]
    .replace(/(?:🔑|🎯)?\s*(?:КЛЮЧИ|ОТВЕТЫ)\s+ДЛЯ\s+(?:ПРЕПОДАВАТЕЛЯ|УЧИТЕЛЯ)[\s\S]*?(?=\n\n|$)/gi, '')
    .replace(/\[(?:ДЕБРИФИНГ|КАСТОМНЫЙ_ОТЧЕТ|ОТЧЕТ_РОДИТЕЛЮ|СЦЕНАРИЙ_УРОКА|ПРЕЗЕНТАЦИЯ|КАРТОЧКИ_ДЗ)\]:[\s\S]*?\[\/(?:ДЕБРИФИНГ|КАСТОМНЫЙ_ОТЧЕТ|ОТЧЕТ_РОДИТЕЛЮ|СЦЕНАРИЙ_УРОКА|ПРЕЗЕНТАЦИЯ|КАРТОЧКИ_ДЗ)\]/g, '')
    .replace(/\[ПРОГРЕСС[^\]]*\]/g, '')
    .replace(/\[ДЗ_[^\]]*\]/g, '')
    .replace(/\[ОТПРАВИТЬ[^\]]*\]/g, '')
    .replace('[ПЕРЕНЕСЕН_В_ТГ]', '')
    .trim();
  const dateStr = lesson?.date ? new Date(lesson.date).toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk', day: 'numeric', month: 'long' }) : 'сегодня';
  
  // Check if a pre-approved custom report was provided by the teacher
  let aiReport = '';
  const customRepMatch = (lesson?.homework || '').match(/\[КАСТОМНЫЙ_ОТЧЕТ\]:([\s\S]*?)\[\/КАСТОМНЫЙ_ОТЧЕТ\]/) || (lesson?.homework || '').match(/\[ОТЧЕТ_РОДИТЕЛЮ\]:([\s\S]*?)\[\/ОТЧЕТ_РОДИТЕЛЮ\]/);
  if (customRepMatch && customRepMatch[1].trim()) {
    aiReport = customRepMatch[1].trim();
  }

  if (!aiReport) {
    const prompt = `Ты — вежливый, внимательный преподаватель английского языка Игорь. Составь КОРОТКИЙ (до 700 символов) тёплый отчёт для родителей ученика ${st.name} (${st.grade || ''}) по итогам проведённого урока (${dateStr}).\nТема урока: "${lesson?.topic || 'Практика английского по программе'}".\nАктивный словарь: "${doss.vocab || 'по теме урока'}".\nНад какими ошибками/правилами работали: "${doss.errors || 'грамматика и говорение'}".\nДомашнее задание: "${rawHw || 'повторить лексику урока'}".\nУдарный режим (Streak): ${doss.streak || 0} ДЗ подряд.\nСтруктура: Приветствие ("Здравствуйте! 👋"), что сегодня разобрали и за что можно похвалить ${st.name}, над чем работаем и какое задано ДЗ. Пиши сразу готовый текст сообщения для родителей!`;
    try {
      const planRes = await executeFunctionCall('generate_lesson_plan', { prompt });
      aiReport = planRes.generated_plan || '';
    } catch (e) {}
  }

  if (!aiReport) {
    aiReport = `Здравствуйте! 👋\nСегодня провели занятие по английскому с *${st.name}* (${dateStr}).\n\n📚 *Тема урока:* ${lesson?.topic || 'Практика и разбор правил'}\n${doss.vocab ? `🔤 *Слова урока:* ${doss.vocab}\n` : ''}${rawHw ? `📌 *Домашнее задание:* ${rawHw}\n` : ''}Спасибо за поддержку! 🌟`;
  }
  const kb = [
    [{ text: '📊 Запросить сводный отчёт о прогрессе', callback_data: `parent_req_report:${st.id}` }],
    [{ text: '📚 Посмотреть текущее ДЗ ребёнка', callback_data: `parent_view_hw:${st.id}` }]
  ];
  try {
    for (const pid of parentIds) {
      await bot.sendMessage(pid, aiReport, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } }).catch(() => {
        return bot.sendMessage(pid, aiReport, { reply_markup: { inline_keyboard: kb } });
      });
    }

    // Duplicate exact copy to teacher/admin so teacher sees word-for-word what parent sees
    const adminId = CHAT_ID || ADMIN_CHAT_ID;
    if (adminId && String(adminId) !== String(doss.parentTgId)) {
      try {
        const adminRepHeader = `👀 *[Копия для преподавателя — так это видит родитель ${st.name} в Telegram]:*\n\n`;
        await bot.sendMessage(adminId, adminRepHeader + aiReport, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } }).catch(() => {
          return bot.sendMessage(adminId, adminRepHeader + aiReport, { reply_markup: { inline_keyboard: kb } });
        });
      } catch (err) {
        console.warn('Teacher parent copy error:', err.message);
      }
    }

    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e.message };
  }
}



function resolveStudentActor(st, chatIdOrUserId = null, fromUser = null) {
  const uid = String(chatIdOrUserId || fromUser?.id || '').trim();
  const fName = String(fromUser?.first_name || '').trim();
  const stName = st?.name || 'Ученик';
  const isVoroniny = stName.toLowerCase().includes('арина') && stName.toLowerCase().includes('матвей');

  if (isVoroniny || uid === '7739392171' || uid === '8016114061') {
    if (uid === '7739392171' || /arin|арин/i.test(fName)) {
      return {
        actorId: '7739392171',
        tagKey: 'АРИНА',
        shortName: 'Арина',
        name: 'Арина',
        fullName: 'Арина Воронина',
        icon: '👧',
        displayLabel: '👧 Арина Воронина (группа: Арина и Матвей Воронины)',
        isGroup: true
      };
    }
    if (uid === '8016114061' || /matvey|матвей|voronin/i.test(fName)) {
      return {
        actorId: '8016114061',
        tagKey: 'МАТВЕЙ',
        shortName: 'Матвей',
        name: 'Матвей',
        fullName: 'Матвей Воронин',
        icon: '👦',
        displayLabel: '👦 Матвей Воронин (группа: Арина и Матвей Воронины)',
        isGroup: true
      };
    }
  }

  const doss = st ? parseStudentDossierBot(st) : {};
  const tgIds = (doss.tgId || '').split(',').map(s => s.trim()).filter(Boolean);
  if (tgIds.length > 1 && fName) {
    const cleanTag = fName.toUpperCase().replace(/[^A-ZА-ЯЁ0-9]/gi, '').slice(0, 12) || uid;
    return {
      actorId: uid || String(st?.id || 'curr'),
      tagKey: cleanTag,
      shortName: fName,
      name: fName,
      fullName: `${fName} (${stName})`,
      icon: '👤',
      displayLabel: `👤 ${fName} (группа: ${stName})`,
      isGroup: true
    };
  }

  return {
    actorId: uid || String(st?.id || 'curr'),
    tagKey: '',
    shortName: stName,
    name: stName,
    fullName: stName,
    icon: '👤',
    displayLabel: stName,
    isGroup: isVoroniny
  };
}

async function getLatestLessonWithMaterials(studentId) {
  if (!studentId) return null;
  const { data: recentLessons } = await db.from('lessons')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: false })
    .limit(6);

  if (!recentLessons || recentLessons.length === 0) return null;

  // Приоритет активного урока: самый свежий проведенный урок (или самый свежий урок с темой/ДЗ),
  // чтобы никогда не возвращать старый урок 2-недельной давности со старым статусом [ДЗ_СДАНО]!
  const conducted = recentLessons.filter(l => l.status === 'Проведен');
  const primary = conducted.find(l => (l.topic && l.topic.trim()) || (l.homework && l.homework.trim()))
    || conducted[0]
    || recentLessons[0];

  const topicsList = [];
  let bestScenario = '';
  let bestPresentation = '';
  let bestMaterials = '';
  let bestDebrief = '';
  let bestCleanHw = '';

  for (const l of recentLessons) {
    if (l.topic && l.topic.trim() && !topicsList.includes(l.topic.trim())) {
      topicsList.push(l.topic.trim());
    }
    const hwRaw = l.homework || '';
    if (!bestScenario) {
      const sc = extractLessonScenario(hwRaw);
      if (sc) bestScenario = sc;
    }
    if (!bestPresentation) {
      const prMatch = hwRaw.match(/\[ПРЕЗЕНТАЦИЯ\]:([\s\S]*?)\[\/ПРЕЗЕНТАЦИЯ\]/);
      if (prMatch && prMatch[1] && !prMatch[1].trim().startsWith('data:application/pdf')) {
        bestPresentation = prMatch[1].trim();
      }
    }
    if (!bestMaterials) {
      const matParts = hwRaw.split(/\\?n?\[МАТЕРИАЛЫ\]:/);
      if (matParts.length > 1 && matParts[1].trim()) {
        bestMaterials = matParts[1].trim();
      }
    }
    if (!bestDebrief) {
      const dbMatch = hwRaw.match(/\[ДЕБРИФИНГ\]:([\s\S]*?)\[\/ДЕБРИФИНГ\]/);
      if (dbMatch && dbMatch[1].trim()) bestDebrief = dbMatch[1].trim();
    }
    if (!bestCleanHw) {
      const stripped = hwRaw.split(/\\?n?\[МАТЕРИАЛЫ\]:/)[0]
        .replace(/\[(?:ДЕБРИФИНГ|КАСТОМНЫЙ_ОТЧЕТ|ОТЧЕТ_РОДИТЕЛЮ|СЦЕНАРИЙ_УРОКА|ПРЕЗЕНТАЦИЯ|КАРТОЧКИ_ДЗ)\]:[\s\S]*?\[\/(?:ДЕБРИФИНГ|КАСТОМНЫЙ_ОТЧЕТ|ОТЧЕТ_РОДИТЕЛЮ|СЦЕНАРИЙ_УРОКА|ПРЕЗЕНТАЦИЯ|КАРТОЧКИ_ДЗ)\]/g, '')
        .replace(/\[ПРОГРЕСС[^\]]*\]/g, '')
        .replace(/\[ДЗ_[^\]]*\]/g, '')
        .replace(/\[ОТПРАВИТЬ[^\]]*\]/g, '')
        .replace(/\[ПЕРЕНЕСЕН_В_ТГ\]/g, '')
        .replace(/⏰\s*Напоминание:[^\n]*/gi, '')
        .trim();
      if (stripped.length > 10) bestCleanHw = stripped;
    }
  }

  primary._mergedTopic = (primary.topic && primary.topic.trim()) || topicsList[0] || 'English';
  primary._mergedScenario = extractLessonScenario(primary.homework || '') || bestScenario;
  primary._mergedPresentation = bestPresentation;
  primary._mergedMaterials = bestMaterials;
  primary._mergedDebrief = bestDebrief;
  primary._mergedCleanHw = bestCleanHw;
  return primary;
}

function extractAllLessonMaterials(lesson, st) {
  const doss = st ? parseStudentDossierBot(st) : {};
  const topic = lesson?._mergedTopic || lesson?.topic || 'Практика английского по программе';
  const scenario = lesson?._mergedScenario || extractLessonScenario(lesson?.homework || '');
  const materials = lesson?._mergedMaterials || '';
  const debrief = lesson?._mergedDebrief || '';
  const cleanHw = lesson?._mergedCleanHw || '';

  let block = `📚 ТЕМА УРОКА: "${topic}"\n`;
  if (doss.unit) block += `📖 УЧЕБНИК / ПРОГРАММА: ${doss.unit}\n`;
  if (cleanHw) block += `📌 ЗАДАННОЕ ДЗ ПО УРОКУ:\n${cleanHw.slice(0, 1500)}\n`;
  if (scenario) block += `📋 КОНСПЕКТ / СЦЕНАРИЙ И ТЕКСТ ПРЕЗЕНТАЦИИ УРОКА:\n${scenario.slice(0, 2500)}\n`;
  if (materials) block += `📎 ДОП. МАТЕРИАЛЫ УРОКА:\n${materials.slice(0, 1000)}\n`;
  if (debrief) block += `📝 ЗАМЕТКИ ПРЕПОДАВАТЕЛЯ ПО УРОКУ:\n${debrief.slice(0, 800)}\n`;
  if (doss.vocab) block += `🔤 АКТИВНЫЙ СЛОВАРЬ УЧЕНИКА:\n${doss.vocab}\n`;
  if (doss.errors) block += `⚠️ СЛАБЫЕ МЕСТА И ОШИБКИ УЧЕНИКА (на отработку):\n${doss.errors}\n`;
  return block.trim();
}

const studentPracticeProgress = {};
function getPracticeProgress(studentId, lessonId, actorTagKey = '') {
  const suffix = actorTagKey ? `_${actorTagKey}` : '';
  const key = `${studentId}_${lessonId || 'curr'}${suffix}`;
  if (!studentPracticeProgress[key]) {
    studentPracticeProgress[key] = {
      wordsBatch: 0,
      verbsBatch: 0,
      quizRound: 0,
      seenWords: [],
      seenVerbs: [],
      userScores: {},
      pollsAnswered: 0,
      pollsCorrect: 0,
      cardsKnown: 0,
      completedSteps: {
        words: false,      // +25% (Слова урока или Флеш-карточки)
        grammar: false,    // +25% (Правило / Глаголы / Мини-игра)
        quiz: false,       // +25% (Тестик из 3 вопросов или мини-квиз)
        written: false     // +75% (Письменное задание в чате / фото тетради / голосовое)
      }
    };
  }
  return studentPracticeProgress[key];
}

function computeSingleActorHwSummary(st, lesson, actor) {
  const tagKey = actor?.tagKey || '';
  const prog = getPracticeProgress(st?.id, lesson?.id, tagKey);
  const hwRaw = lesson?.homework || '';

  if (tagKey) {
    if (hwRaw.includes(`[ДЗ_ПРОВЕРЕНО_${tagKey}]`) || hwRaw.includes('[ДЗ_ПРОВЕРЕНО]')) {
      prog.completedSteps.written = true;
      prog.completedSteps.words = true;
      prog.completedSteps.grammar = true;
      prog.completedSteps.quiz = true;
    } else if (hwRaw.includes(`[ДЗ_СДАНО_${tagKey}]`)) {
      prog.completedSteps.written = true;
    }
  } else {
    if (hwRaw.includes('[ДЗ_ПРОВЕРЕНО]')) {
      prog.completedSteps.written = true;
      prog.completedSteps.words = true;
      prog.completedSteps.grammar = true;
      prog.completedSteps.quiz = true;
    } else if (hwRaw.includes('[ДЗ_СДАНО]')) {
      prog.completedSteps.written = true;
    }
  }

  const stepWords = !!(prog.completedSteps.words || prog.wordsBatch > 0 || prog.cardsKnown >= 2);
  const stepGrammar = !!(prog.completedSteps.grammar || prog.verbsBatch > 0);
  const stepQuiz = !!(prog.completedSteps.quiz || prog.pollsAnswered >= 2);
  const stepWritten = !!(prog.completedSteps.written);

  let pct = 0;
  if (stepWords) pct += 25;
  if (stepGrammar) pct += 25;
  if (stepQuiz) pct += 25;
  if (stepWritten) pct += 75;

  if (tagKey) {
    const actorRegex = new RegExp(`\\[ПРОГРЕСС_${tagKey}:(\\d+)%\\]`);
    const actorMatch = hwRaw.match(actorRegex);
    if (actorMatch) {
      const savedActorPct = parseInt(actorMatch[1], 10) || 0;
      if (savedActorPct > pct) pct = savedActorPct;
    }
  } else {
    const savedMatch = hwRaw.match(/\[ПРОГРЕСС_ДЗ:(\d+)%\]/);
    if (savedMatch) {
      const savedPct = parseInt(savedMatch[1], 10) || 0;
      if (savedPct > pct) pct = savedPct;
    }
  }
  if (hwRaw.includes('[ДЗ_ПРОВЕРЕНО]')) pct = 100;
  if (pct > 100) pct = 100;

  const doneList = [];
  const leftList = [];

  if (stepWritten) {
    doneList.push('✍️ Письменное задание / ответ в чате (+75%)');
  } else {
    leftList.push('✍️ Прислать фото тетрадки или написать ответы на письменное задание в чат (+75%)');
  }

  if (stepWords) {
    doneList.push(`🔤 Слова урока / Флеш-карточки (+25%, слов: ${prog.seenWords.length || prog.cardsKnown || 5})`);
  } else {
    leftList.push('🔤 Нажать «Слова урока» или пройти «Флеш-карточки» (+25%)');
  }

  if (stepGrammar) {
    doneList.push('🧩 Разбор правила / Глаголы / Мини-игра (+25%)');
  } else {
    leftList.push('🧩 Открыть «Разбор правила / Глаголы / Мини-игру» (+25%)');
  }

  if (stepQuiz) {
    doneList.push(`📝 Мини-тест по уроку (+25%, ответов: ${prog.pollsAnswered || 3}, верно: ${prog.pollsCorrect || 0})`);
  } else {
    leftList.push('📝 Пройти «Тестик по уроку» из 3 вопросов (+25%)');
  }

  const canSubmit = pct >= 75;
  return {
    prog,
    actor,
    pct,
    canSubmit,
    isReadyToSubmit: canSubmit,
    doneList,
    leftList,
    todoList: leftList,
    completedSteps: prog.completedSteps,
    doneText: doneList.length > 0 ? doneList.join('\n• ') : 'Пока ничего не выполнено (0%)',
    leftText: leftList.length > 0 ? leftList.join('\n• ') : 'Все блоки выполнены на 100%!'
  };
}

function getHwCompletionSummary(st, lesson, chatIdOrUserId = null, fromUser = null) {
  const actor = resolveStudentActor(st, chatIdOrUserId, fromUser);
  const summary = computeSingleActorHwSummary(st, lesson, actor);

  const stName = (st?.name || '').toLowerCase();
  if (stName.includes('арина') && stName.includes('матвей')) {
    const arinaActor = resolveStudentActor(st, '7739392171');
    const matveyActor = resolveStudentActor(st, '8016114061');
    const arinaSum = computeSingleActorHwSummary(st, lesson, arinaActor);
    const matveySum = computeSingleActorHwSummary(st, lesson, matveyActor);
    summary.arinaSummary = arinaSum;
    summary.matveySummary = matveySum;
    summary.groupBreakdownText =
      `👥 Раздельный статус по группе (Арина vs Матвей):\n` +
      `• 👧 Арина Воронина: ${arinaSum.pct}% (${arinaSum.canSubmit ? 'Готова к сдаче ✅' : 'Ещё делает 🔒'}) — ${arinaSum.doneList.length ? arinaSum.doneList.map(s => s.split(' (')[0]).join(', ') : 'ещё не приступала'}\n` +
      `• 👦 Матвей Воронин: ${matveySum.pct}% (${matveySum.canSubmit ? 'Готов к сдаче ✅' : 'Ещё делает 🔒'}) — ${matveySum.doneList.length ? matveySum.doneList.map(s => s.split(' (')[0]).join(', ') : 'ещё не приступал'}`;
  } else {
    summary.groupBreakdownText = '';
  }

  return summary;
}

async function markHwTagForActor(lesson, kind, actor = null) {
  // kind: 'СДАНО' | 'ПРОВЕРЕНО'. Для группы ставим персональный тег, чтобы сдача одного ребёнка не засчитывалась другому.
  if (!lesson || !lesson.id) return;
  try {
    let hw = lesson.homework || '';
    const tagKey = actor?.tagKey || '';
    if (tagKey) {
      const personal = `[ДЗ_${kind}_${tagKey}]`;
      if (kind === 'ПРОВЕРЕНО') hw = hw.replace(`[ДЗ_СДАНО_${tagKey}]`, '');
      if (!hw.includes(personal)) hw = `${personal} ${hw}`;
      if (!hw.includes('[ДЗ_СДАНО]') && !hw.includes('[ДЗ_ПРОВЕРЕНО]')) hw = `[ДЗ_СДАНО] ${hw}`;
    } else if (kind === 'ПРОВЕРЕНО') {
      if (!hw.includes('[ДЗ_ПРОВЕРЕНО]')) hw = `[ДЗ_ПРОВЕРЕНО] ${hw.replace('[ДЗ_СДАНО]', '')}`;
    } else {
      if (!hw.includes('[ДЗ_СДАНО]') && !hw.includes('[ДЗ_ПРОВЕРЕНО]')) hw = `[ДЗ_СДАНО] ${hw}`;
    }
    hw = hw.replace(/\s{2,}/g, ' ').trim();
    if (hw !== (lesson.homework || '')) {
      lesson.homework = hw;
      await db.from('lessons').update({ homework: hw }).eq('id', lesson.id);
    }
  } catch (e) {}
}

async function persistHwProgressPercent(lesson, pct, actor = null, st = null) {
  if (!lesson || !lesson.id) return;
  try {
    let hw = lesson.homework || '';
    const tagKey = actor?.tagKey || '';
    if (tagKey) {
      const actorTag = `[ПРОГРЕСС_${tagKey}:${pct}%]`;
      const actorRegex = new RegExp(`\\[ПРОГРЕСС_${tagKey}:\\d+%\\]`, 'g');
      if (actorRegex.test(hw)) {
        hw = hw.replace(actorRegex, actorTag);
      } else {
        hw = `${hw.trim()} ${actorTag}`.trim();
      }
      const arinaM = hw.match(/\[ПРОГРЕСС_АРИНА:(\d+)%\]/);
      const matveyM = hw.match(/\[ПРОГРЕСС_МАТВЕЙ:(\d+)%\]/);
      const aPct = arinaM ? parseInt(arinaM[1], 10) : (tagKey === 'АРИНА' ? pct : 0);
      const mPct = matveyM ? parseInt(matveyM[1], 10) : (tagKey === 'МАТВЕЙ' ? pct : 0);
      const avgPct = Math.round((aPct + mPct) / 2);
      if (/\[ПРОГРЕСС_ДЗ:\d+%\]/.test(hw)) {
        hw = hw.replace(/\[ПРОГРЕСС_ДЗ:\d+%\]/g, `[ПРОГРЕСС_ДЗ:${avgPct}%]`);
      } else {
        hw = `${hw.trim()} [ПРОГРЕСС_ДЗ:${avgPct}%]`.trim();
      }
    } else {
      if (/\[ПРОГРЕСС_ДЗ:\d+%\]/.test(hw)) {
        hw = hw.replace(/\[ПРОГРЕСС_ДЗ:\d+%\]/g, `[ПРОГРЕСС_ДЗ:${pct}%]`);
      } else {
        hw = `${hw.trim()} [ПРОГРЕСС_ДЗ:${pct}%]`.trim();
      }
    }
    lesson.homework = hw;
    await db.from('lessons').update({ homework: hw }).eq('id', lesson.id);
  } catch (e) {}
}

function addStudentXp(studentId, lessonId, userId, userName, amount) {
  const prog = getPracticeProgress(studentId, lessonId);
  if (!prog.userScores) prog.userScores = {};
  const uid = String(userId);
  if (!prog.userScores[uid]) {
    prog.userScores[uid] = { name: userName || 'Ученик', xp: 0 };
  }
  prog.userScores[uid].xp += amount;
  if (userName && userName !== 'Ученик') prog.userScores[uid].name = userName;
  return prog.userScores[uid].xp;
}

function getLeaderboardText(studentId, lessonId) {
  const prog = getPracticeProgress(studentId, lessonId);
  const scores = Object.values(prog.userScores || {});
  if (scores.length <= 1) return '';
  scores.sort((a, b) => b.xp - a.xp);
  let text = '\n\n🏆 *Битва за звёзды (Звёздный зачёт):*\n';
  for (const s of scores) {
    const icon = s.name.toLowerCase().includes('арин') ? '🐉' : (s.name.toLowerCase().includes('матве') ? '🚀' : '⭐');
    text += `${icon} *${s.name}:* ${s.xp} XP\n`;
  }
  return text;
}

function formatToTelegramHtml(text) {
  if (!text) return '';
  let str = String(text);
  // 1. Convert bullet lists at line starts (* item or - item) to bullet emoji •
  str = str.replace(/^(\s*)[*-]\s+/gm, '$1• ');
  // 2. Escape HTML special characters
  str = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // 3. Convert headers: ### Header or ## Header -> <b>Header</b>
  str = str.replace(/^#{1,6}\s*(.+)$/gm, '<b>$1</b>');
  // 4. Convert bold: **text** or __text__ -> <b>text</b>
  str = str.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  str = str.replace(/__(.*?)__/g, '<b>$1</b>');
  // 5. Convert italic: *text* or _text_ -> <i>text</i>
  str = str.replace(/\*([^*\n]+)\*/g, '<i>$1</i>');
  str = str.replace(/_([^_\n]+)_/g, '<i>$1</i>');
  // 6. Monospace: `code`
  str = str.replace(/`([^`]+)`/g, '<code>$1</code>');
  // 7. Strip ANY remaining stray asterisks or markdown table pipes so text is pristine
  str = str.replace(/\*+/g, '');
  return str.trim();
}

async function sendCleanMessage(chatId, text, options = {}) {
  const html = formatToTelegramHtml(text);
  try {
    return await bot.sendMessage(chatId, html, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...options
    });
  } catch (err) {
    const plain = text.replace(/[*_`#]/g, '').trim();
    return await bot.sendMessage(chatId, plain, options);
  }
}

async function sendTtsAudio(chatId, phrase, title = 'Произношение слов', caption = '🔊 Послушай произношение на английском') {
  if (!phrase || !phrase.trim()) return;
  try {
    const ttsUrl = 'https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=' + encodeURIComponent(phrase.trim().slice(0, 300));
    const res = await fetch(ttsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      await bot.sendAudio(chatId, buf, {
        title: title,
        performer: 'English Tutor',
        caption: caption
      }, { filename: 'pronunciation.mp3', contentType: 'audio/mpeg' }).catch(() => {});
    }
  } catch (err) {
    console.warn('TTS sendAudio error:', err.message);
  }
}

function getLessonFlashcards(scenarioText, hwText = '', topicText = '', dossVocab = '') {
  const cards = [];
  const text = (hwText || '') + '\n' + (scenarioText || '') + '\n' + (dossVocab || '');
  const lines = text.split(/[\n,;]+/);
  for (const l of lines) {
    const trimmed = l.trim();
    if (!trimmed || trimmed.startsWith('Слайд') || trimmed.startsWith('Unit') || trimmed.startsWith('Today') || trimmed.startsWith('Mission') || trimmed.startsWith('Checklist')) continue;

    // Pattern: [bullet/num]? [English word] [transcription]? [dash with spaces] [Russian translation] (example)?
    const m = trimmed.match(/^[•\d\s\-\*.]*([A-Za-z][A-Za-z\s'-]*?)\s*(?:[\[\/]([^\/\]]+)[\]\/])?\s+[—–-]\s+([^(\n]+)(?:\((.*?)\))?/);
    if (m && m[1] && m[3]) {
      const en = m[1].trim();
      const ipa = m[2] ? ('[' + m[2].trim() + ']') : '';
      let ru = m[3].trim();
      const ex = m[4] ? m[4].trim() : '';

      if (!/[а-яА-ЯёЁ]/.test(ru)) continue;
      if (!/^[A-Za-z\s'-]{2,30}$/.test(en)) continue;
      if (en.split(/\s+/).length > 3) continue;

      ru = ru.replace(/\s*[—–-]\s*.*$/, '').trim();

      const lowerEn = en.toLowerCase();
      if (['mistakes', 'words', 'prepositions', 'checklist', 'places', 'trees', 'animals', 'birds', 'grammar', 'practice', 'step', 'shag'].includes(lowerEn)) continue;

      if (!cards.find(c => c.en.toLowerCase() === lowerEn)) {
        cards.push({ en, ipa, ru, ex });
      }
    }
  }

  if (cards.length === 0) {
    const topLow = (topicText || '').toLowerCase();
    if (topLow.includes('shop') || topLow.includes('магазин')) {
      return [
        { en: 'department store', ipa: '[dɪˈpɑːtmənt stɔː]', ru: 'универмаг', ex: 'We bought clothes at the department store.' },
        { en: 'fitting room', ipa: '[ˈfɪtɪŋ ruːm]', ru: 'примерочная', ex: 'Where is the fitting room?' },
        { en: 'try on', ipa: '[traɪ ɒn]', ru: 'примерять (одежду)', ex: 'Can I try this jacket on?' },
        { en: 'customer', ipa: '[ˈkʌstəmə]', ru: 'покупатель', ex: 'The customer is choosing a sweater.' },
        { en: 'shop assistant', ipa: '[ʃɒp əˈsɪstənt]', ru: 'продавец-консультант', ex: 'Ask the shop assistant for your size.' },
        { en: 'receipt', ipa: '[rɪˈsiːt]', ru: 'чек', ex: 'Keep the receipt after shopping.' },
        { en: 'size', ipa: '[saɪz]', ru: 'размер', ex: 'What size do you wear?' },
        { en: 'expensive / cheap', ipa: '[ɪkˈspensɪv / tʃiːp]', ru: 'дорогой / дешёвый', ex: 'This T-shirt is cheap, not expensive.' }
      ];
    }
    if (topLow.includes('местоимен') || topLow.includes('pronoun') || topLow.includes('family') || topLow.includes('семь')) {
      return [
        { en: 'my / your', ipa: '[maɪ / jɔː]', ru: 'мой / твой (ваш)', ex: 'This is my family and your friend.' },
        { en: 'his / her', ipa: '[hɪz / hɜː]', ru: 'его / её', ex: 'Tom loves his dog, Anna loves her cat.' },
        { en: 'our / their', ipa: '[ˈaʊə / ðeə]', ru: 'наш / их', ex: 'We love our city, they love their school.' },
        { en: 'aunt / uncle', ipa: '[ɑːnt / ˈʌŋkl]', ru: 'тётя / дядя', ex: 'My aunt and uncle live in Minsk.' },
        { en: 'cousin', ipa: '[ˈkʌzn]', ru: 'двоюродный брат или сестра', ex: 'She is my favourite cousin.' },
        { en: 'parents / relatives', ipa: '[ˈpeərənts / ˈrelətɪvz]', ru: 'родители / родственники', ex: 'We visit our relatives on Sunday.' }
      ];
    }
    return [
      { en: 'danger', ipa: '[ˈdeɪndʒə]', ru: 'опасность', ex: 'Many animals are in danger.' },
      { en: 'dangerous', ipa: '[ˈdeɪndʒərəs]', ru: 'опасный', ex: 'A wild wolf can be dangerous.' },
      { en: 'endangered', ipa: '[ɪnˈdeɪndʒəd]', ru: 'под угрозой исчезновения', ex: 'The bison is an endangered animal.' },
      { en: 'wildlife', ipa: '[ˈwaɪldlaɪf]', ru: 'дикая природа', ex: 'We must protect wildlife.' },
      { en: 'suitcase', ipa: '[ˈsuːtkeɪs]', ru: 'чемодан', ex: 'She has just packed her suitcase.' },
      { en: 'to rescue', ipa: '[ˈreskjuː]', ru: 'спасать', ex: 'He has rescued a kitten.' },
      { en: 'species', ipa: '[ˈspiːʃiːz]', ru: 'вид / виды животных', ex: 'There are rare species in the forest.' },
      { en: 'recently', ipa: '[ˈriːsntli]', ru: 'недавно', ex: 'I have seen a bison recently.' }
    ];
  }
  return cards;
}

function extractLessonScenario(homeworkText) {
  if (!homeworkText) return '';
  const match = homeworkText.match(/\[СЦЕНАРИЙ_УРОКА\]:([\s\S]*?)\[\/СЦЕНАРИЙ_УРОКА\]/);
  return match ? match[1].trim() : '';
}

function extractAttachedCards(homeworkText) {
  if (!homeworkText) return { cleanHw: '', cards: [] };
  let cleanHw = homeworkText.replace(/\[СЦЕНАРИЙ_УРОКА\]:[\s\S]*?\[\/СЦЕНАРИЙ_УРОКА\]/, '').trim();
  const match = cleanHw.match(/\[КАРТОЧКИ_ДЗ\]:([\s\S]*?)\[\/КАРТОЧКИ_ДЗ\]/);
  if (!match) return { cleanHw, cards: [] };
  const cards = match[1].trim().split('||').map(s => s.trim()).filter(Boolean);
  cleanHw = cleanHw.replace(match[0], '').trim();
  return { cleanHw, cards };
}

async function sendCardsToChat(chatId, cards, captionPrefix = '🖼 Карточка к уроку') {
  if (!cards || cards.length === 0) return;
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    try {
      if (card.startsWith('data:image/')) {
        const base64Data = card.replace(/^data:image\/\w+;base64,/, '');
        const buf = Buffer.from(base64Data, 'base64');
        await bot.sendPhoto(chatId, buf, { caption: `${captionPrefix} #${i + 1}` }, { filename: `card_${i + 1}.png`, contentType: 'image/png' });
      } else if (card.startsWith('http')) {
        await bot.sendPhoto(chatId, card, { caption: `${captionPrefix} #${i + 1}` });
      }
    } catch (e) {
      console.error('Failed to send card to', chatId, e.message);
    }
  }
}

async function sendHomeworkToStudentBot(st, lesson, isReminder = false, nextLessonDateStr = '') {
  const doss = parseStudentDossierBot(st);
  const targetIds = (doss.tgId || '').split(',').map(s => s.trim()).filter(Boolean);
  if (targetIds.length === 0) return { sent: false, reason: 'no_tg_id' };
  
  const { cleanHw: noCardsHw, cards } = extractAttachedCards(lesson?.homework || '');
  const rawHw = noCardsHw.split('\\n[МАТЕРИАЛЫ]:')[0]
    .replace(/(?:🔑|🎯)?\s*(?:КЛЮЧИ|ОТВЕТЫ)\s+ДЛЯ\s+(?:ПРЕПОДАВАТЕЛЯ|УЧИТЕЛЯ)[\s\S]*?(?=\n\n|$)/gi, '')
    .replace(/\[(?:ДЕБРИФИНГ|КАСТОМНЫЙ_ОТЧЕТ|ОТЧЕТ_РОДИТЕЛЮ|СЦЕНАРИЙ_УРОКА|ПРЕЗЕНТАЦИЯ)\]:[\s\S]*?\[\/(?:ДЕБРИФИНГ|КАСТОМНЫЙ_ОТЧЕТ|ОТЧЕТ_РОДИТЕЛЮ|СЦЕНАРИЙ_УРОКА|ПРЕЗЕНТАЦИЯ)\]/g, '')
    .replace('[ДЗ_ПРОВЕРЕНО]', '')
    .replace('[ДЗ_СДАНО]', '')
    .replace('[ОТПРАВИТЬ_В_ТГ]', '')
    .replace('[ОТПРАВИТЬ_РОДИТЕЛЮ_В_ТГ]', '')
    .trim();
  if (!rawHw && !lesson?.topic && cards.length === 0) return { sent: false, reason: 'empty_hw' };

  const header = isReminder
    ? `⏰ *Привет, ${st.name}!*\nНапоминаю про домашнее задание по английскому языку${nextLessonDateStr ? ` к уроку *${nextLessonDateStr}*` : ''} 🇬🇧`
    : (lesson?.status === 'Запланирован'
        ? `📚 *Привет, ${st.name}!*\nМатериалы и задания к предстоящему уроку:`
        : `🇬🇧 *Привет, ${st.name}!*\nИтоги нашего урока и домашнее задание на следующий раз:`);

  let msg = `${header}\n\n`;
  if (lesson?.topic) msg += `📚 *Тема:* ${lesson.topic}\n`;
  if (doss.vocab) msg += `🔤 *Полезные слова (Vocabulary):* ${doss.vocab}\n`;
  if (rawHw) msg += `\n📌 *Домашнее задание:*\n${rawHw}\n`;
  if (cards.length > 0) msg += `\n🖼 *Прикреплено карточек к уроку:* ${cards.length} шт. (отправлены выше)`;
  // Calculate progress bar & HW completion readiness
  const hwStatus = getHwCompletionSummary(st, lesson);
  const pct = hwStatus.pct;
  const filled = Math.round(pct / 10);
  const bar = '▓'.repeat(filled) + '░'.repeat(10 - filled);

  msg += `\n📊 *Готовность ДЗ:* [${bar}] *${pct}%* (для сдачи нужно минимум 75%)\n`;
  msg += `🔥 *Твоя серия (Streak):* ${doss.streak || 0} ДЗ подряд без пропусков!\n`;
  const lbText = getLeaderboardText(st.id, lesson?.id);
  if (lbText) msg += lbText;
  msg += `\n_Как сдать ДЗ: пришли сюда фото тетрадки ИЛИ напиши ответы текстом в чат (либо пройди все интерактивные кнопки ниже до 75%+)!_ 💪`;

  const kbMarkup = buildStudentKeyboard(st, lesson);
  try {
    for (const tid of targetIds) {
      if (cards.length > 0) {
        await sendCardsToChat(tid, cards, '🖼 Карточка к ДЗ');
      }
      await bot.sendMessage(tid, msg, { parse_mode: 'Markdown', reply_markup: kbMarkup }).catch(() => {
        return bot.sendMessage(tid, msg, { reply_markup: kbMarkup });
      });
    }

    // Duplicate exact copy to teacher/admin so teacher sees word-for-word what the student receives
    const adminId = CHAT_ID || ADMIN_CHAT_ID;
    if (adminId && !targetIds.includes(String(adminId))) {
      try {
        if (cards.length > 0) {
          await sendCardsToChat(adminId, cards, `🖼 [Копия для преподавателя] Карточки ДЗ для ${st.name}`).catch(() => {});
        }
        const adminHeader = `👀 *[Копия для преподавателя — отправлено ученику ${st.name} (${lesson?.status === 'Запланирован' ? 'до урока' : 'после урока'})]:*\n` +
          `📊 *Готовность ДЗ ученика сейчас:* ${hwStatus.pct}% (${hwStatus.canSubmit ? 'Готов к сдаче ✅' : 'Ещё не достиг 75% 🔒'})\n\n`;
        await bot.sendMessage(adminId, adminHeader + msg, {
          parse_mode: 'Markdown',
          reply_markup: kbMarkup
        }).catch(() => {
          return bot.sendMessage(adminId, adminHeader + msg, { reply_markup: kbMarkup });
        });
      } catch (err) {
        console.warn('Teacher copy error:', err.message);
      }
    }

    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e.message };
  }
}

let isProcessingLessonQueues = false;
async function processLessonQueues() {
  if (isProcessingLessonQueues) return;
  isProcessingLessonQueues = true;
  try {
    const adminId = CHAT_ID || ADMIN_CHAT_ID;

    // 1. Отчёты родителям
    const { data: queuedParentLessons } = await db.from('lessons').select('*, students(*)').ilike('homework', '%[ОТПРАВИТЬ_РОДИТЕЛЮ_В_ТГ]%');
    if (queuedParentLessons && queuedParentLessons.length > 0) {
      for (const pls of queuedParentLessons) {
        let rawHw = pls.homework || '';
        let customReport = null;
        const repMatch = rawHw.match(/\[КАСТОМНЫЙ_ОТЧЕТ\]:([\s\S]*?)\[\/КАСТОМНЫЙ_ОТЧЕТ\]/) || rawHw.match(/\[ОТЧЕТ_РОДИТЕЛЮ\]:([\s\S]*?)\[\/ОТЧЕТ_РОДИТЕЛЮ\]/);
        if (repMatch) {
          customReport = repMatch[1].trim();
          rawHw = rawHw.replace(repMatch[0], '').trim();
        }
        const cleanedHw = rawHw.replace('[ОТПРАВИТЬ_РОДИТЕЛЮ_В_ТГ]', '').trim();
        await db.from('lessons').update({ homework: cleanedHw }).eq('id', pls.id);
        if (pls.students) {
          const doss = parseStudentDossierBot(pls.students);
          if (customReport) {
            const kb = [
              [{ text: '📊 Запросить свежий отчёт об успеваемости', callback_data: `parent_req_report:${pls.students.id}` }],
              [{ text: '📚 Посмотреть текущее ДЗ ребёнка', callback_data: `parent_view_hw:${pls.students.id}` }]
            ];
            if (doss.parentTgId) {
              await bot.sendMessage(doss.parentTgId, customReport, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } }).catch(() => {
                return bot.sendMessage(doss.parentTgId, customReport, { reply_markup: { inline_keyboard: kb } });
              });
            }
            if (adminId) {
              const adminRepHeader = `👀 *[Копия для преподавателя — так это видит родитель ${pls.students.name} в Telegram]:*\n\n`;
              await bot.sendMessage(adminId, adminRepHeader + customReport, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } }).catch(() => {
                return bot.sendMessage(adminId, adminRepHeader + customReport, { reply_markup: { inline_keyboard: kb } });
              });
            }
          } else {
            await sendParentLessonReportBot(pls.students, { ...pls, homework: cleanedHw });
          }
        }
      }
    }

    // 2. Отчёты преподавателю (Игорю)
    const { data: queuedTeacherLessons } = await db.from('lessons').select('*, students(*)').ilike('homework', '%[ОТПРАВИТЬ_УЧИТЕЛЮ_В_ТГ]%');
    if (queuedTeacherLessons && queuedTeacherLessons.length > 0) {
      for (const tls of queuedTeacherLessons) {
        let rawHw = tls.homework || '';
        let customReport = null;
        const repMatch = rawHw.match(/\[ОТПРАВИТЬ_УЧИТЕЛЮ_В_ТГ\]:([\s\S]*?)\[\/ОТПРАВИТЬ_УЧИТЕЛЮ_В_ТГ\]/);
        if (repMatch) {
          customReport = repMatch[1].trim();
          rawHw = rawHw.replace(repMatch[0], '').trim();
        } else {
          rawHw = rawHw.replace('[ОТПРАВИТЬ_УЧИТЕЛЮ_В_ТГ]', '').trim();
        }
        await db.from('lessons').update({ homework: rawHw }).eq('id', tls.id);
        if (adminId) {
          const msg = customReport || `📊 *Отчёт по ученику ${tls.students?.name || ''}:*\n${rawHw}`;
          await bot.sendMessage(adminId, msg, { parse_mode: 'Markdown' }).catch(() => bot.sendMessage(adminId, msg));
        }
      }
    }

    // 3. Отправка ДЗ ученику
    const { data: queuedHwLessons } = await db.from('lessons').select('*, students(*)').ilike('homework', '%[ОТПРАВИТЬ_В_ТГ]%');
    if (queuedHwLessons && queuedHwLessons.length > 0) {
      for (const qls of queuedHwLessons) {
        const cleanedHw = (qls.homework || '').replace('[ОТПРАВИТЬ_В_ТГ]', '').trim();
        await db.from('lessons').update({ homework: cleanedHw }).eq('id', qls.id);
        if (qls.students) {
          const sendRes = await sendHomeworkToStudentBot(qls.students, { ...qls, homework: cleanedHw }, false);
          if (sendRes.sent && adminId) {
            await bot.sendMessage(adminId, `📨 *С веб-сайта:* ДЗ успешно отправлено в Telegram ученику *${qls.students.name}*!`, { parse_mode: 'Markdown' }).catch(() => {});
          }
        }
      }
    }

    // 4. Анонсы предстоящих уроков ученикам и родителям
    const { data: queuedAnnouncements } = await db.from('lessons').select('*, students(*)').ilike('homework', '%[АНОНС_УРОКА_В_ТГ]%');
    if (queuedAnnouncements && queuedAnnouncements.length > 0) {
      for (const als of queuedAnnouncements) {
        let rawHw = als.homework || '';
        let studentAnn = null;
        let parentAnn = null;

        const sMatch = rawHw.match(/\[АНОНС_УЧЕНИКУ\]:([\s\S]*?)\[\/АНОНС_УЧЕНИКУ\]/);
        if (sMatch) {
          studentAnn = sMatch[1].trim();
          rawHw = rawHw.replace(sMatch[0], '').trim();
        }

        const pMatch = rawHw.match(/\[АНОНС_РОДИТЕЛЮ\]:([\s\S]*?)\[\/АНОНС_РОДИТЕЛЮ\]/);
        if (pMatch) {
          parentAnn = pMatch[1].trim();
          rawHw = rawHw.replace(pMatch[0], '').trim();
        }

        const cleanedHw = rawHw.replace('[АНОНС_УРОКА_В_ТГ]', '').replace('[ОТПРАВИТЬ_АНОНС_В_ТГ]', '').trim();
        await db.from('lessons').update({ homework: cleanedHw }).eq('id', als.id);

        if (als.students) {
          const doss = parseStudentDossierBot(als.students);
          let sentStudent = false;
          let sentParent = false;

          // Отправка ученику
          if (studentAnn && doss.tgId) {
            const sIds = String(doss.tgId).split(',').map(s => s.trim()).filter(Boolean);
            for (const sid of sIds) {
              await bot.sendMessage(sid, studentAnn, { parse_mode: 'Markdown' }).catch(() => {
                return bot.sendMessage(sid, studentAnn);
              }).then(() => { sentStudent = true; }).catch(() => {});
            }
          }

          // Отправка родителю
          if (parentAnn && doss.parentTgId) {
            const pIds = String(doss.parentTgId).split(',').map(s => s.trim()).filter(Boolean);
            for (const pid of pIds) {
              await bot.sendMessage(pid, parentAnn, { parse_mode: 'Markdown' }).catch(() => {
                return bot.sendMessage(pid, parentAnn);
              }).then(() => { sentParent = true; }).catch(() => {});
            }
          }

          if (adminId) {
            const statusSummary = `📢 *Анонс урока отправлен!*\n👤 Ученик: *${als.students.name}*\n${sentStudent ? '✅ Ученику доставлено' : (studentAnn ? '⚠️ Ученик не подключен к ТГ' : '')}\n${sentParent ? '✅ Родителю доставлено' : (parentAnn ? '⚠️ Родитель не подключен к ТГ' : '')}`;
            await bot.sendMessage(adminId, statusSummary, { parse_mode: 'Markdown' }).catch(() => {});
          }
        }
      }
    }
  } catch (e) {
    console.error('processLessonQueues error:', e.message);
  } finally {
    isProcessingLessonQueues = false;
  }
}

// Запуск быстрой обработки очереди сообщений для родителей и учеников каждые 5 секунд
setInterval(processLessonQueues, 5000);

let globalDeepWorkUntil = null;
let deepWorkTimeout = null;

// ============================================
// AI HELPER
// ============================================

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'process_brain_dump',
      description: 'Универсальный захват (Omni-Capture / Brain Dump): если в одном сообщении или голосовом есть сразу И задачи, И траты/доходы, И события/заметки — вызови эту функцию, чтобы сохранить всё за один раз!',
      parameters: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                priority: { type: 'string' },
                deadline: { type: 'string' },
                area: { type: 'string', enum: ['Работа', 'Репетиторство', 'Личное'] }
              },
              required: ['title']
            }
          },
          transactions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                amount: { type: 'number' },
                type: { type: 'string', enum: ['expense', 'income'] },
                category: { type: 'string' },
                comment: { type: 'string' }
              },
              required: ['amount', 'type', 'category']
            }
          },
          events: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                start_at: { type: 'string' },
                area: { type: 'string' }
              },
              required: ['title', 'start_at']
            }
          },
          notes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                content: { type: 'string' }
              },
              required: ['title', 'content']
            }
          }
        }
      }
    }
  },
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
                title: { type: 'string', description: 'КОНКРЕТНОЕ ДЕЙСТВИЕ с глаголом.' },
                direction: { type: 'string', description: 'Direction tags: AI-Connect, English, Personal, etc. CSV' },
                status: { type: 'string', description: 'Default "Ждёт меня"' },
                priority: { type: 'string', description: 'High, Medium, Low' },
                deadline: { type: 'string', description: 'YYYY-MM-DD' },
                next_step: { type: 'string', description: 'Next step' },
                area: { type: 'string', enum: ['Работа', 'Репетиторство', 'Личное'] }
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
      name: 'create_task',
      description: 'Создать одну новую задачу (псевдоним для одиночной задачи)',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'КОНКРЕТНОЕ ДЕЙСТВИЕ с глаголом.' },
          direction: { type: 'string', description: 'Direction tags: AI-Connect, English, Personal, etc. CSV' },
          status: { type: 'string', description: 'Default "Ждёт меня"' },
          priority: { type: 'string', description: 'High, Medium, Low' },
          deadline: { type: 'string', description: 'YYYY-MM-DD' },
          next_step: { type: 'string', description: 'Next step' },
          area: { type: 'string', enum: ['Работа', 'Репетиторство', 'Личное'] }
        },
        required: ['title', 'area']
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
          amount: { type: 'string', description: 'Amount (must be a number string, e.g. "32.85")' },
          type: { type: 'string', description: 'income or expense' },
          category: { type: 'string', description: 'Invent category based on text (e.g. Transport, Food, Cafe, Salary)' },
          comment: { type: 'string', description: 'List of all items and their prices (e.g. "Молоко 2x1.5, Хлеб 1x1.0")' },
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
      name: 'schedule_lesson',
      description: 'Запланировать предстоящий урок или начать урок прямо сейчас (например: "Сейчас урок с Соней Коршук, повторяем юнит 2", "Сегодня в 18:00 урок с Нелли", "Завтра в 11:00 урок с Матвеем"). Записывает урок со статусом Запланирован и присылает кнопки, а через 1 час после начала урока пришлёт напоминание отметить итог!',
      parameters: {
        type: 'object',
        properties: {
          student_name: { type: 'string', description: 'Имя или фамилия ученика (например: "Соня Коршук", "Нелли")' },
          start_at: { type: 'string', description: 'ISO 8601 дата и время начала урока с часовым поясом +03:00 (например "2026-10-25T18:00:00+03:00"). Если пользователь говорит "сейчас урок" — передай "now".' },
          topic: { type: 'string', description: 'Тема или план на урок (если упомянуто)' }
        },
        required: ['student_name', 'start_at']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_lesson',
      description: 'Зафиксировать УЖЕ ПРОВЕДЁННЫЙ урок (когда пользователь в прошедшем времени говорит "Провёл урок с Соней, прошли Present Perfect"). Если урок только начинается ("сейчас урок") или будет в будущем — ОБЯЗАТЕЛЬНО вызывай schedule_lesson!',
      parameters: {
        type: 'object',
        properties: {
          student_name: { type: 'string', description: 'Student name' },
          topic: { type: 'string', description: 'Lesson topic' },
          homework: { type: 'string', description: 'Homework assigned for next time' },
          student_errors: { type: 'string', description: 'Mistakes or weak spots noticed during lesson to save into student dossier' },
          new_vocab: { type: 'string', description: 'New words/phrases learned to save into student Vocabulary Bank' },
          paid: { type: 'boolean', description: 'По умолчанию FALSE! Ставь true ТОЛЬКО если пользователь прямо сказал, что урок уже оплачен!' }
        },
        required: ['student_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_homework_to_student',
      description: 'Отправить домашнее задание или напоминание о ДЗ напрямую ученику в Telegram (или получить ссылку для подключения ученика к боту)',
      parameters: {
        type: 'object',
        properties: {
          student_name: { type: 'string', description: 'Имя ученика (например: "Соня", "Нелли", "Матвей")' },
          custom_homework: { type: 'string', description: 'Текст домашнего задания (если нужно отправить новое, иначе бот возьмет последнее записанное ДЗ)' }
        },
        required: ['student_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_student_memory',
      description: 'Получить полное досье ученика по английскому, историю его прошлых тем, какое ДЗ было задано на прошлый раз и какие у него типичные ошибки',
      parameters: {
        type: 'object',
        properties: {
          student_name: { type: 'string', description: 'Имя ученика (или пусто для всех учеников)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'import_perplexity_lesson',
      description: 'Разобрать вставленный конспект/план урока из Perplexity Space (или сообщение с итогами урока): автоматически сохраняет тему урока, очищает домашнее задание от учительских ключей, пополняет словарь ученика и возвращает готовое сообщение для пересылки ученику/родителям.',
      parameters: {
        type: 'object',
        properties: {
          student_name: { type: 'string', description: 'Имя ученика' },
          topic: { type: 'string', description: 'Выделенная тема урока' },
          homework_clean: { type: 'string', description: 'Чистый текст домашнего задания для ученика БЕЗ ключей/ответов преподавателя' },
          new_vocab: { type: 'string', description: 'Новые слова/коллокации из конспекта через запятую' },
          student_errors: { type: 'string', description: 'Ошибки ученика, если упомянуты' }
        },
        required: ['student_name', 'topic', 'homework_clean']
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
          start_at: { type: 'string', description: 'ISO 8601 date/time with +03:00 offset (e.g. 2026-07-09T18:00:00+03:00). Compute EXACT DATE and time using CURRENT TIME.' },
          area: { type: 'string', enum: ['Работа', 'Репетиторство', 'Личное'], description: 'Area' }
        },
        required: ['title', 'start_at', 'area']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_projects',
      description: 'Получить список активных проектов',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_project',
      description: 'Создать новый проект',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Название проекта' },
          color: { type: 'string', description: 'HEX цвет проекта (по умолчанию #6366f1)' }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_goals',
      description: 'Получить список личных и рабочих целей',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_goal',
      description: 'Создать новую цель',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Формулировка цели' },
          target_value: { type: 'number', description: 'Целевое значение (например, 100)' },
          unit: { type: 'string', description: 'Единица измерения (например, %, рублей, книг) (по умолчанию %)' },
          deadline: { type: 'string', description: 'Дедлайн в формате YYYY-MM-DD (опционально)' }
        },
        required: ['title']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_inbox',
      description: 'Получить неразобранные мысли и идеи из Inbox',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_task_status',
      description: 'Изменить статус задачи (в том числе завершить/архивировать)',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'ID задачи (если известен)' },
          title_search: { type: 'string', description: 'Часть названия задачи для поиска (если ID неизвестен)' },
          status: { type: 'string', description: 'Новый статус: "Готово", "В работе", "Ждёт меня", "Отменена"' }
        },
        required: ['status']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description: 'Обновить любые параметры задачи: перенести дедлайн/дату в календаре, изменить статус, название или приоритет',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'ID задачи (если известен)' },
          title_search: { type: 'string', description: 'Часть названия задачи для поиска' },
          deadline: { type: 'string', description: 'Новый дедлайн / дата в календаре в формате YYYY-MM-DD' },
          status: { type: 'string', description: 'Новый статус: "Готово", "В работе", "Ждёт меня", "Отменена"' },
          title: { type: 'string', description: 'Новое название задачи' },
          priority: { type: 'string', description: 'Приоритет: "Низкий", "Средний", "Высокий"' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'reschedule_tasks',
      description: 'Массово перенести/перераспределить задачи с одного периода на другой в календаре (например, перекинуть все незавершенные рабочие задачи с октября на первую неделю ноября)',
      parameters: {
        type: 'object',
        properties: {
          filter_status: { type: 'string', description: 'Фильтр по статусу, например "unfinished" (незавершенные) или "all"' },
          filter_area: { type: 'string', description: 'Сфера: "Работа", "Личное" или "all"' },
          filter_month_or_dates: { type: 'string', description: 'Исходный период (например "октябрь" или "2026-10")' },
          target_start_date: { type: 'string', description: 'Дата начала нового периода (например "2026-11-02")' },
          tasks_distribution: {
            type: 'array',
            description: 'Опциональный детальный массив задач и их новых дат дедлайна',
            items: {
              type: 'object',
              properties: {
                task_id: { type: 'string' },
                title_search: { type: 'string' },
                new_deadline: { type: 'string', description: 'YYYY-MM-DD' },
                new_status: { type: 'string', description: 'Опционально новый статус' }
              },
              required: ['new_deadline']
            }
          }
        },
        required: ['target_start_date']
      }
    }
  }
];


function matchStudent(allStudents, query) {
  if (!allStudents || !allStudents.length || !query) return null;
  const q = query.toLowerCase().trim();

  // Priority alias routing
  if (q.includes('курочкин') || q.includes('софа') || (q.includes('соня') && !q.includes('коршук') && !q.includes('ворон'))) {
    const s = allStudents.find(st => st.name.toLowerCase().includes('курочкин'));
    if (s) return s;
  }
  if (q.includes('коршук') || (q.includes('соня') && q.includes('коршук'))) {
    const s = allStudents.find(st => st.name.toLowerCase().includes('коршук'));
    if (s) return s;
  }
  if (q.includes('ворон') || q.includes('матвей') || q.includes('арин') || q.includes('лена')) {
    if (q.includes('нелли')) {
      const s = allStudents.find(st => st.name.toLowerCase().includes('нелли'));
      if (s) return s;
    }
    const s = allStudents.find(st => st.name.toLowerCase().includes('воронины') || (st.name.toLowerCase().includes('арина') && st.name.toLowerCase().includes('матвей')));
    if (s) return s;
  }
  if (q.includes('коцуб') || q.includes('артем') || q.includes('артём')) {
    const s = allStudents.find(st => st.name.toLowerCase().includes('коцуб') || st.name.toLowerCase().includes('артем'));
    if (s) return s;
  }

  // Exact match
  const exact = allStudents.find(st => st.name.toLowerCase() === q);
  if (exact) return exact;

  // Substring
  const sub = allStudents.find(st => st.name.toLowerCase().includes(q) || q.includes(st.name.toLowerCase()));
  if (sub) return sub;

  // Words stem
  const words = q.split(/\s+/).filter(w => w.length >= 3);
  for (const w of words) {
    const stem = w.slice(0, -1);
    const m = allStudents.find(st => st.name.toLowerCase().includes(stem));
    if (m) return m;
  }
  return null;
}

function buildStudentKeyboard(st, lesson, chatIdOrUserId = null) {
  const actor = resolveStudentActor(st, chatIdOrUserId);
  const topic = (lesson?.topic || lesson?._mergedTopic || '').toLowerCase();
  const scenario = (lesson?._mergedScenario || extractLessonScenario(lesson?.homework || '') || '').toLowerCase();
  const hwText = (lesson?.homework || '').toLowerCase();
  const allContent = `${topic} ${scenario} ${hwText}`;

  const hwStatus = getHwCompletionSummary(st, lesson, chatIdOrUserId);
  const submitBtnText = hwStatus.canSubmit
    ? `✅ Я сделал(а) ДЗ! (Готово ${hwStatus.pct}%)`
    : `🔒 Сдать ДЗ (готово ${hwStatus.pct}% из 75%)`;

  let dynamicBtn = { text: '🃏 Флеш-карточки', callback_data: `student_flashcards:${st.id}:0` };
  if (allContent.includes('shopping') || allContent.includes('магазин') || allContent.includes('clothes') || allContent.includes('покупк') || allContent.includes('store') || allContent.includes('market')) {
    dynamicBtn = { text: '🛒 В магазине (Shopping)', callback_data: `student_grammar_rule:${st.id}` };
  } else if (allContent.includes('местоимен') || allContent.includes('pronoun') || allContent.includes('whose') || allContent.includes('owner') || allContent.includes('чей') || allContent.includes('притяжательн') || allContent.includes("'s")) {
    dynamicBtn = { text: '🧩 Местоимения и \'s', callback_data: `student_grammar_rule:${st.id}` };
  } else if (allContent.includes('сравнен') || allContent.includes('comparative') || allContent.includes('superlative') || allContent.includes('степен')) {
    dynamicBtn = { text: '⚡ Степени сравнения', callback_data: `student_grammar_rule:${st.id}` };
  } else if (allContent.includes('артикл') || allContent.includes('article') || allContent.includes(' the ')) {
    dynamicBtn = { text: '⚡ Артикли (Правило)', callback_data: `student_grammar_rule:${st.id}` };
  } else if (allContent.includes('verb') || allContent.includes('глагол') || allContent.includes('present perfect') || allContent.includes('past simple') || allContent.includes('irregular')) {
    dynamicBtn = { text: '⚡ 5 глаголов урока', callback_data: `student_verbs:${st.id}` };
  } else if (scenario.includes('грамматик') || scenario.includes('правил') || hwText.includes('правил') || topic.includes('present') || topic.includes('past') || topic.includes('future') || topic.includes('modal')) {
    dynamicBtn = { text: '🧩 Правило урока', callback_data: `student_grammar_rule:${st.id}` };
  }

  return {
    inline_keyboard: [
      [{ text: submitBtnText, callback_data: `student_hw_done:${lesson?.id || ''}` }],
      [{ text: '🔤 Слова урока', callback_data: `student_words:${st.id}` }, dynamicBtn],
      [{ text: '📝 Тестик по уроку', callback_data: `student_poll_quiz:${st.id}` }, { text: '🎮 Мини-игра', callback_data: `student_game:${st.id}` }]
    ]
  };
}

async function executeFunctionCall(name, args) {
  try {
    switch (name) {
      case 'process_brain_dump': {
        const summary = [];
        if (Array.isArray(args.tasks)) {
          for (const t of args.tasks) {
            await createTask(t.title, {
              priority: t.priority || 'Средний',
              deadline: t.deadline || null,
              area: t.area || 'Работа'
            });
            summary.push(`✅ Задача: "${t.title}"`);
          }
        }
        if (Array.isArray(args.transactions)) {
          for (const tx of args.transactions) {
            await createTransaction(tx.amount, tx.type || 'expense', tx.category || 'Другое', tx.comment || '', 'Карта');
            summary.push(`💸 Финансы (${tx.type === 'income' ? '+' : '-'}${tx.amount} BYN): ${tx.category}`);
          }
        }
        if (Array.isArray(args.events)) {
          const user = await getUser();
          for (const ev of args.events) {
            if (user && ev.title && ev.start_at) {
              await db.from('events').insert({
                user_id: user.id,
                title: ev.title,
                start_at: ev.start_at,
                end_at: ev.start_at,
                type: 'Встреча'
              });
              summary.push(`📅 Событие: "${ev.title}"`);
            }
          }
        }
        if (Array.isArray(args.notes)) {
          for (const n of args.notes) {
            await createNote(n.title, n.content, ['brain-dump'], 'Работа');
            summary.push(`📝 Заметка: "${n.title}"`);
          }
        }
        return {
          success: true,
          message: `🧠 Brain Dump разобран (${summary.length} действий):\n` + summary.join('\n')
        };
      }
      case 'create_event': {
        const { title, description, start_at, area } = args;
        if (!title || !start_at) return { success: false, error: 'Не указан title или start_at' };
        
        const user = await getUser();
        if (!user) return { success: false, error: 'User not found' };

        let end_at = args.end_at;
        if (!end_at) {
          try {
            const startDate = new Date(start_at);
            startDate.setHours(startDate.getHours() + 1);
            end_at = startDate.toISOString();
          } catch(e) {
            end_at = start_at;
          }
        }
        
        let eventType = 'Встреча';
        if (area === 'Личное') eventType = 'Личное';
        
        const { data, error } = await db.from('events').insert({
          user_id: user.id,
          title: title,
          notes: description || '',
          start_at: start_at,
          end_at: end_at,
          type: eventType
        }).select().single();

        if (error) return { success: false, error: error.message };
        return { success: true, event: data, message: `Напоминание/событие "${title}" успешно добавлено на ${start_at}!` };
      }
      case 'create_task':
      case 'create_tasks': {
        if (!args.tasks || !Array.isArray(args.tasks)) {
          // Fallback: if LLM forgets the 'tasks' array and passes properties directly
          if (args.title) {
            args.tasks = [args];
          } else {
            return { success: false, error: 'Параметр tasks должен быть массивом, или передайте title' };
          }
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
        
        try {
          await removeDuplicateTasks();
        } catch(e) {
          console.error('Auto-deduplication on task creation failed:', e.message);
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
        const content = (args.content || '').trim();
        // Guard: block bot-generated text from being saved to inbox
        const BOT_PHRASES = [
          'пожалуйста, предоставь', 'пожалуйста, укажи', 'уточните', 'уточни',
          'предоставьте сумму', 'предоставьте категорию', 'какая сумма',
          'не могли бы вы', 'чтобы я мог', 'для того чтобы',
          'могу ли я', 'можешь ли ты', 'пожалуйста, сообщи'
        ];
        const isLikelyBotText = BOT_PHRASES.some(phrase => content.toLowerCase().includes(phrase));
        if (isLikelyBotText) {
          console.warn(`[add_to_inbox] Blocked bot-generated text from being saved: "${content.substring(0, 80)}"`);
          return { success: false, error: 'Это похоже на текст бота, а не пользователя. Не сохраняем во входящие.' };
        }
        const { data, error } = await db.from('inbox').insert({ user_id: user.id, content }).select().single();
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

        let commentText = args.comment ? `\n\n📝 Детали:\n${args.comment}` : '';
        return { success: true, transaction: tx, message: `${verb}: ${args.amount} BYN (${args.category})${commentText}${extraMsg}` };
      }
      case 'start_deep_work': {
        const mins = args.minutes || 60;
        await startDeepWorkMode(CHAT_ID, mins);
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
      case 'schedule_lesson': {
        const user = await getUser();
        const searchName = (args.student_name || '').trim();
        const { data: allSt } = await db.from('students').select('*').eq('user_id', user.id);
        let st = matchStudent(allSt, searchName);
        if (!st) {
          const { data: newSt } = await db.from('students').insert({ user_id: user.id, name: searchName || 'Ученик', price: 0 }).select().maybeSingle();
          st = newSt;
        }
        let startDate = new Date();
        if (args.start_at && args.start_at !== 'now') {
          const parsed = new Date(args.start_at);
          if (!isNaN(parsed.getTime())) startDate = parsed;
        }
        const startIso = startDate.toISOString();
        const startDay = startDate.toISOString().split('T')[0];

        // Deduplicate: check if a lesson is already scheduled for this student today
        const { data: existingNear } = await db.from('lessons')
          .select('*')
          .eq('student_id', st.id)
          .gte('date', startDay + 'T00:00:00Z')
          .lte('date', startDay + 'T23:59:59Z')
          .order('date', { ascending: false });

        let lesson = null;
        const matchingSched = (existingNear || []).find(l => {
          const lDate = new Date(l.date);
          return Math.abs(lDate.getTime() - startDate.getTime()) < 3.5 * 3600 * 1000;
        });

        if (matchingSched) {
          const { data: up } = await db.from('lessons').update({
            date: startIso,
            topic: args.topic || matchingSched.topic || '',
            status: 'Запланирован'
          }).eq('id', matchingSched.id).select().maybeSingle();
          lesson = up || matchingSched;
        } else {
          const { data: created, error } = await db.from('lessons').insert({
            student_id: st.id,
            date: startIso,
            topic: args.topic || '',
            homework: '',
            status: 'Запланирован',
            paid: false
          }).select().maybeSingle();
          if (error) return { success: false, error: error.message };
          lesson = created;
        }

        const { data: prevList } = await db.from('lessons').select('*').eq('student_id', st.id).eq('status', 'Проведен').order('date', { ascending: false }).limit(1);
        const prev = prevList?.[0];
        const prevHw = prev ? ((prev.homework || '').split('\\n[МАТЕРИАЛЫ]:')[0].replace('[ДЗ_ПРОВЕРЕНО]', '').trim()) : '';
        const timeFormatted = startDate.toLocaleString('ru-RU', { timeZone: 'Europe/Minsk', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

        if (CHAT_ID && lesson) {
          const kb = [
            [
              { text: '🔮 Промпт для Perplexity', callback_data: `lesson_perplexity:${lesson.id}` },
              { text: '🎲 Разминка + ДЗ', callback_data: `lesson_prep:${lesson.id}` }
            ],
            [
              { text: '🎮 Игра на 5 минут', callback_data: `lesson_game:${lesson.id}` },
              { text: '✅ Проведён (без оплаты)', callback_data: `lesson_done_unpaid:${lesson.id}` }
            ]
          ];
          let cardText = `📅 *Урок записан в расписание!*\n👤 *Ученик:* ${st.name}\n🕒 *Время:* ${timeFormatted}\n`;
          if (args.topic) cardText += `📚 *Тема:* ${args.topic}\n`;
          if (prev?.topic) cardText += `⏪ *В прошлый раз:* ${prev.topic}\n`;
          if (prevHw) cardText += `📌 *Проверить ДЗ:* ${prevHw}\n`;
          cardText += `\n⏱ _Через 1 час после начала урока я автоматически пришлю кнопки для отметки результата и оплаты!_`;
          bot.sendMessage(CHAT_ID, cardText, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } }).catch(() => {
            bot.sendMessage(CHAT_ID, cardText, { reply_markup: { inline_keyboard: kb } }).catch(() => {});
          });
        }
        return {
          success: true,
          lesson,
          message: `Урок с ${st.name} запланирован на ${timeFormatted}${args.topic ? ` (Тема: ${args.topic})` : ''}. Карточка с кнопками отправлена в чат, а через час после начала урока придет напоминание отметить итог!`
        };
      }
      case 'send_homework_to_student': {
        const user = await getUser();
        const { data: allSt } = await db.from('students').select('*').eq('user_id', user.id);
        const searchName = (args.student_name || '').trim().toLowerCase();
        const st = (allSt || []).find(s => s.name.toLowerCase().includes(searchName) || searchName.split(/\s+/).some(w => w.length > 2 && s.name.toLowerCase().includes(w.slice(0, -1))));
        if (!st) return { success: false, error: `Ученик "${args.student_name}" не найден.` };
        const doss = parseStudentDossierBot(st);
        const botUser = BOT_USERNAME || (await bot.getMe().then(m => m.username).catch(() => ''));
        const inviteLink = `https://t.me/${botUser}?start=st_${st.id}`;
        if (!doss.tgId) {
          return {
            success: true,
            message: `⚠️ Ученик *${st.name}* ещё не подключён к боту!\nСкинь ему эту персональную ссылку (достаточно нажать Start 1 раз):\n\`${inviteLink}\``
          };
        }
        let { data: lastLs } = await db.from('lessons').select('*').eq('student_id', st.id).order('date', { ascending: false }).limit(1).maybeSingle();
        if (args.custom_homework) {
          if (lastLs) {
            const { data: up } = await db.from('lessons').update({ homework: args.custom_homework }).eq('id', lastLs.id).select().maybeSingle();
            lastLs = up || { ...lastLs, homework: args.custom_homework };
          } else {
            const { data: created } = await db.from('lessons').insert({ student_id: st.id, date: new Date().toISOString(), topic: 'Английский язык', homework: args.custom_homework, status: 'Проведен', paid: false }).select().maybeSingle();
            lastLs = created;
          }
        }
        if (!lastLs || !lastLs.homework) {
          return { success: false, error: `У ученика ${st.name} пока не записано домашнее задание.` };
        }
        const sendRes = await sendHomeworkToStudentBot(st, lastLs, true);
        if (sendRes.sent) {
          return { success: true, message: `📨 Домашнее задание успешно отправлено ученику *${st.name}* в Telegram!` };
        }
        return { success: false, error: `Не удалось отправить сообщение: ${sendRes.reason}` };
      }
      case 'get_student_memory': {
        const user = await getUser();
        let q = db.from('students').select('*').eq('user_id', user.id);
        if (args.student_name) q = q.ilike('name', `%${args.student_name}%`);
        const { data: sts } = await q;
        const result = [];
        for (const st of (sts || [])) {
          const dossier = parseStudentDossierBot(st);
          const { data: recentLessons } = await db.from('lessons').select('*').eq('student_id', st.id).order('date', { ascending: false }).limit(5);
          result.push({
            name: st.name,
            grade: st.grade,
            price: st.price,
            dossier,
            recent_lessons: recentLessons || []
          });
        }
        return { success: true, students: result };
      }
      case 'import_perplexity_lesson': {
        const res = await executeFunctionCall('add_lesson', {
          student_name: args.student_name,
          topic: args.topic,
          homework: args.homework_clean,
          new_vocab: args.new_vocab,
          student_errors: args.student_errors,
          paid: false
        });
        return {
          ...res,
          message: `🔮 *Конспект из Perplexity разобран и сохранён в карточку урока!*\n` + (res.message || '')
        };
      }
      case 'add_lesson': {
        const user = await getUser();
        const { data: allSt } = await db.from('students').select('*').eq('user_id', user.id);
        let st = matchStudent(allSt, args.student_name);
        if (!st) {
          const { data: newSt } = await db.from('students').insert({ user_id: user.id, name: args.student_name, price: 0 }).select().single();
          st = newSt;
        }
        if (args.student_errors || args.new_vocab) {
          const doss = parseStudentDossierBot(st);
          const newErr = args.student_errors ? (doss.errors ? `${doss.errors}; ${args.student_errors}` : args.student_errors) : doss.errors;
          const newVoc = args.new_vocab ? (doss.vocab ? `${doss.vocab}, ${args.new_vocab}` : args.new_vocab) : doss.vocab;
          let updatedSched = doss.schedule || '';
          if (doss.tgId) updatedSched += `\\n[TG_ID]:\\n${doss.tgId}`;
          if (doss.tgUser) updatedSched += `\\n[TG_USER]:\\n${doss.tgUser}`;
          if (doss.perplexity) updatedSched += `\\n[PERPLEXITY]:\\n${doss.perplexity}`;
          if (doss.unit) updatedSched += `\\n[УЧЕБНИК]:\\n${doss.unit}`;
          if (doss.interests) updatedSched += `\\n[ИНТЕРЕСЫ]:\\n${doss.interests}`;
          if (newErr) updatedSched += `\\n[ОШИБКИ]:\\n${newErr}`;
          if (newVoc) updatedSched += `\\n[СЛОВАРЬ]:\\n${newVoc}`;
          if (doss.notes) updatedSched += `\\n[ЗАМЕТКИ]:\\n${doss.notes}`;
          await db.from('students').update({ schedule: updatedSched }).eq('id', st.id);
        }
        const followUpMsg = `📲 *Готовое сообщение для ученика (${st.name}):*\n"Привет! Сегодня отлично поработали над темой «${args.topic || 'Английский язык'}» 🌟${args.new_vocab ? `\nНовые слова урока: ${args.new_vocab}` : ''}\n📌 Домашнее задание на следующий раз: ${args.homework || 'Повторить материал урока'}."`;
        if (false) { db.from('lessons')
        const user = await getUser();
        // 1. Найти или создать ученика
        let { data: st } = await db.from('students').select('*').eq('user_id', user.id).ilike('name', `%${args.student_name}%`).limit(1).single();
        if (!st) {
          const { data: newSt } = await db.from('students').insert({ user_id: user.id, name: args.student_name, price: 0 }).select().single();
          st = newSt;
        }
        
        // 2. Создать урок
        }
        const dateStr = new Date().toISOString();
        const todayPrefix = getMinskDateString(0);
        let homeworkToSave = args.homework || '';
        const debriefNote = args.debrief || args.notes || (args.student_errors ? `Ошибки: ${args.student_errors}. ${args.new_vocab ? 'Новые слова: ' + args.new_vocab : ''}` : '');
        if (debriefNote && !homeworkToSave.includes('[ДЕБРИФИНГ]')) {
          homeworkToSave = `[ДЕБРИФИНГ]:\n${debriefNote}\n[/ДЕБРИФИНГ]\n\n${homeworkToSave}`.trim();
        }

        const { data: existingSched } = await db.from('lessons').select('*').eq('student_id', st.id).gte('date', todayPrefix + 'T00:00:00Z').order('date', { ascending: false }).limit(1).maybeSingle();
        let lesson = null;
        if (existingSched) {
          const { data: upLs } = await db.from('lessons').update({
            topic: args.topic || existingSched.topic || '',
            homework: homeworkToSave || existingSched.homework || '',
            status: 'Проведен',
            paid: !!args.paid
          }).eq('id', existingSched.id).select().maybeSingle();
          lesson = upLs || existingSched;
          notifiedEvents.add(`done_${existingSched.id}`);
        } else {
          const { data: newLs } = await db.from('lessons').insert({
            student_id: st.id,
            date: dateStr,
            topic: args.topic || '',
            homework: homeworkToSave,
            status: 'Проведен',
            paid: !!args.paid
          }).select().maybeSingle();
          lesson = newLs;
        }
        if (false) {
        const { data: lesson } = await db.from('lessons').insert({
          student_id: st.id,
          date: dateStr,
          topic: args.topic || '',
          homework: args.homework || '',
          status: 'Проведен',
          paid: !!args.paid
        }).select().single();
        
        }
        // 3. Авто-оплата в финансы
        if (args.paid && st.price > 0) {
          await createTransaction(st.price, 'income', 'Уроки (Английский)', `Оплата урока: ${st.name}`, 'Карта');
        }
        
        let autoSentNote = '';
        if (lesson && args.homework) {
          const sendRes = await sendHomeworkToStudentBot(st, lesson, false);
          if (sendRes.sent) autoSentNote = `\n📨 *Домашнее задание автоматически отправлено ${st.name} в личку Telegram!*`;
          const pRes = await sendParentLessonReportBot(st, lesson);
          if (pRes.sent) autoSentNote += `\n👨‍👩‍👧 *Отчёт об уроке автоматически отправлен родителю (${st.name}) в Telegram!*`;
        }
        return { success: true, lesson, message: `Урок с ${st.name} успешно добавлен!` + (args.paid && st.price > 0 ? ` Записан доход ${st.price} BYN.` : '') + (args.student_errors ? `\n⚠️ В досье ученика записана ошибка: ${args.student_errors}` : '') + autoSentNote + `\n\n${followUpMsg}` };
      }
      case 'generate_lesson_plan': {
        try {
          const response = await fetch(AI_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getActiveAIKey()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: AI_MODEL,
              messages: [{ role: 'system', content: 'Ты опытный и креативный преподаватель английского. Помоги составить учебный материал, план урока или вопросы по запросу.' }, { role: 'user', content: args.prompt }]
            })
          });
          const json = await response.json();
          if (json.choices?.[0]?.message?.content) {
            return { success: true, generated_plan: json.choices[0].message.content, message: 'План сгенерирован успешно.' };
          }
          if (json.error?.message && (json.error.message.includes('Rate limit') || json.error.message.includes('free-models-per-day'))) {
            const nextKey = rotateAIKey();
            if (nextKey) {
              const retryRes = await fetch(AI_API_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${nextKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model: AI_MODEL,
                  messages: [{ role: 'system', content: 'Ты опытный и креативный преподаватель английского.' }, { role: 'user', content: args.prompt }]
                })
              });
              const retryJson = await retryRes.json();
              if (retryJson.choices?.[0]?.message?.content) {
                return { success: true, generated_plan: retryJson.choices[0].message.content, message: 'План сгенерирован успешно.' };
              }
            }
          }
        } catch (e) {
          console.error('generate_lesson_plan error:', e.message);
        }
        return {
          success: true,
          generated_plan: `🎯 *Разминка и план к уроку:*\n1. Warm-up (5 мин): 3 быстрых вопроса по теме.\n2. Отработка правил и исправление ошибок.\n3. Ролевой диалог / игра в парах.`,
          message: 'Базовый план готов.'
        };
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

        const response = await fetch(AI_API_URL, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${AI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: AI_MODEL,
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
          const response = await fetch(AI_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${AI_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: AI_MODEL,
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
      case 'get_projects': {
        const projects = await getProjects();
        return { success: true, projects, count: projects.length };
      }
      case 'create_project': {
        const { name, color } = args;
        if (!name) return { success: false, error: 'Имя проекта не указано' };
        const project = await createProject(name, color);
        return { success: true, project, message: `Проект "${name}" успешно создан!` };
      }
      case 'get_goals': {
        const goals = await getGoals();
        return { success: true, goals, count: goals.length };
      }
      case 'create_goal': {
        const { title, target_value, unit, deadline } = args;
        if (!title) return { success: false, error: 'Заголовок цели не указан' };
        const goal = await createGoal(title, target_value, unit, deadline);
        return { success: true, goal, message: `Цель "${title}" успешно добавлена!` };
      }
      case 'get_inbox': {
        const inbox = await getInbox();
        return { success: true, inbox, count: inbox.length };
      }
      case 'update_task_status': {
        const { task_id, title_search, status } = args;
        if (!task_id && !title_search) return { success: false, error: 'Нужно передать task_id или title_search' };
        if (!status) return { success: false, error: 'Не указан новый статус' };
        
        let targetId = task_id;
        if (!targetId) {
          const user = await getUser();
          if (!user) return { success: false, error: 'User not found' };
          
          // Получаем все незавершенные задачи
          const { data: activeTasks } = await db.from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .neq('status', 'Готово')
            .neq('status', 'Отменена');
            
          if (!activeTasks || activeTasks.length === 0) {
            return { success: false, error: 'У тебя нет активных задач.' };
          }
          
          const searchLower = title_search.toLowerCase();
          const found = activeTasks.find(t => t.title.toLowerCase().includes(searchLower));
          
          if (!found) {
            return { success: false, error: `Задача со словами "${title_search}" не найдена среди активных.` };
          }
          targetId = found.id;
        }

        if (status === 'Готово') {
          const task = await completeTask(targetId);
          return { success: true, task, message: `Задача "${task.title}" успешно отмечена выполненной!` };
        } else {
          const { data, error } = await db.from('tasks').update({ status }).eq('id', targetId).select().single();
          if (error) return { success: false, error: error.message };
          return { success: true, task: data, message: `Статус задачи "${data.title}" изменен на "${status}"!` };
        }
      }
      case 'update_task': {
        const { task_id, title_search, deadline, status, title, priority } = args;
        if (!task_id && !title_search) return { success: false, error: 'Нужно передать task_id или title_search' };
        
        let targetId = task_id;
        if (!targetId) {
          const user = await getUser();
          if (!user) return { success: false, error: 'User not found' };
          const { data: allTasks } = await db.from('tasks').select('*').eq('user_id', user.id);
          const searchLower = title_search.toLowerCase();
          const found = (allTasks || []).find(t => t.title.toLowerCase().includes(searchLower));
          if (!found) return { success: false, error: `Задача со словами "${title_search}" не найдена.` };
          targetId = found.id;
        }

        const updates = { updated_at: new Date().toISOString() };
        if (deadline) updates.deadline = deadline;
        if (status) updates.status = status;
        if (title) updates.title = title;
        if (priority) updates.priority = priority;

        const { data, error } = await db.from('tasks').update(updates).eq('id', targetId).select().single();
        if (error) return { success: false, error: error.message };
        return { 
          success: true, 
          task: data, 
          message: `Задача "${data.title}" обновлена! Новый дедлайн: ${data.deadline || 'не задан'}, статус: ${data.status}` 
        };
      }
      case 'reschedule_tasks': {
        const { filter_status, filter_area, filter_month_or_dates, target_start_date, tasks_distribution } = args;
        const user = await getUser();
        if (!user) return { success: false, error: 'User not found' };

        const updatedTasks = [];
        if (Array.isArray(tasks_distribution) && tasks_distribution.length > 0) {
          for (const item of tasks_distribution) {
            let tId = item.task_id;
            if (!tId && item.title_search) {
              const { data: matched } = await db.from('tasks').select('id, title').eq('user_id', user.id).ilike('title', `%${item.title_search}%`).limit(1);
              if (matched && matched.length > 0) tId = matched[0].id;
            }
            if (tId) {
              const patch = { updated_at: new Date().toISOString() };
              if (item.new_deadline) patch.deadline = item.new_deadline;
              if (item.new_status) patch.status = item.new_status;
              const { data: res } = await db.from('tasks').update(patch).eq('id', tId).select().single();
              if (res) updatedTasks.push(res);
            }
          }
        } else {
          let query = db.from('tasks').select('*').eq('user_id', user.id);
          if (filter_area && filter_area !== 'all') {
            query = query.eq('area', filter_area);
          }
          const { data: allUserTasks } = await query;
          const candidates = (allUserTasks || []).filter(t => {
            const isNotDone = t.status !== 'Готово' && t.status !== 'Отменена';
            const matchesPeriod = (!filter_month_or_dates || filter_month_or_dates === 'октябрь' || filter_month_or_dates === '2026-10') 
              ? (t.deadline && t.deadline.startsWith('2026-10')) 
              : true;
            return isNotDone && matchesPeriod;
          });

          const startDate = new Date(target_start_date || '2026-11-02');
          let dayOffset = 0;
          for (const cand of candidates) {
            const curDate = new Date(startDate.getTime() + dayOffset * 86400000);
            const yyyy = curDate.getFullYear();
            const mm = String(curDate.getMonth() + 1).padStart(2, '0');
            const dd = String(curDate.getDate()).padStart(2, '0');
            const newDl = `${yyyy}-${mm}-${dd}`;
            
            const patch = { deadline: newDl, updated_at: new Date().toISOString() };
            if (cand.status === 'Отменена') patch.status = 'Ждёт меня';
            const { data: res } = await db.from('tasks').update(patch).eq('id', cand.id).select().single();
            if (res) updatedTasks.push(res);
            dayOffset++;
          }
        }

        return {
          success: true,
          count: updatedTasks.length,
          tasks: updatedTasks.map(t => ({ title: t.title, deadline: t.deadline, status: t.status })),
          message: `Успешно перенесено задач: ${updatedTasks.length}! Задачи распределены по первой неделе ноября начиная с ${target_start_date || '2026-11-02'}.`
        };
      }
      default:
        return { success: false, error: `Неизвестная функция: ${name}` };
    }
  } catch(e) {
    return { success: false, error: e.message };
  }
}

async function askAI(userMessage, context = '', imageUrl = null, disableTools = false, disableHistory = false, allowedTools = null, minimalSystem = false) {
  if (!AI_API_KEY) return 'API ключ для нейросети не настроен (AI_API_KEY).';

  const settings = await getSettings();
  const now = new Date();
  const timeStr = now.toLocaleString('ru-RU', {
    timeZone: 'Europe/Minsk',
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const nextDays = [];
  for(let i=1; i<=7; i++) {
    let d = new Date(now.getTime() + i*86400000);
    nextDays.push(d.toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk', weekday: 'short', day: 'numeric', month: 'short' }) + ' (' + d.toISOString().split('T')[0] + ')');
  }
  const calendarContext = `\nКалендарь на ближайшие дни:\nСегодня: ${now.toISOString().split('T')[0]}\nЗавтра и далее: ${nextDays.join(', ')}`;

  let extraCtx = '';
  if (settings.context?.custom_instructions?.length && !minimalSystem) {
    const validInstructions = settings.context.custom_instructions.filter(i => !i.includes('ALTER TABLE tasks'));
    if (validInstructions.length) {
      extraCtx = '\n\nДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ:\n' +
        validInstructions.map((ins, i) => `${i+1}. ${ins}`).join('\n');
    }
  }
  
  // Если мы на Groq (жесткий лимит 6000 TPM), безжалостно обрезаем контекст
  if (context && !isOpenRouter && context.length > 3000) {
    context = context.substring(0, 3000) + '... (контекст обрезан из-за лимитов Groq)';
  }

  let systemInstruction = '';
  if (minimalSystem) {
    systemInstruction = `Ты технический ИИ-ассистент. Твоя единственная цель - вызывать нужные функции для обработки данных (например, транзакций или привычек). Никаких лишних слов.\n\nТЕКУЩЕЕ ВРЕМЯ МИНСК (GMT+3): ${timeStr}${calendarContext}`;
  } else {
    systemInstruction = `${SYSTEM_PROMPT}\n\n${USER_CONTEXT}\n\nТЕКУЩЕЕ ВРЕМЯ МИНСК (GMT+3): ${timeStr}${calendarContext}${extraCtx}${context ? '\n\n' + context : ''}`;
  }

  let messages = [];
  if (!disableHistory) {
    const historyLimit = isOpenRouter ? 8 : 3; // Для Groq жестко ограничиваем историю, чтобы не выйти за 6000 токенов
    const history = await getRecentMessages(historyLimit); 
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

  let activeTools = TOOLS;
  if (allowedTools && allowedTools.length > 0) {
    activeTools = TOOLS.filter(t => allowedTools.includes(t.function.name));
  }

  // Сразу отправляем статус "Печатает...", чтобы не казалось, что бот завис
  bot.sendChatAction(CHAT_ID, 'typing').catch(() => {});

  let overrideModel = null;
  // Убрал жесткую привязку к openrouter/free для чеков, так как теперь мы используем gpt-4o, 
  // у которой нет проблем с лимитом токенов.

  let response = await callAPI(systemInstruction, messages, 0, !!imageUrl, overrideModel, disableTools, activeTools);
  let maxIter = 5;

  while (maxIter-- > 0) {
    const choice = response.choices?.[0];
    if (!choice) break;
    const message = choice.message;

    if ((!message.tool_calls || message.tool_calls.length === 0) && message.content && message.content.includes('<function=')) {
      const toolCalls = [];
      const fnRegex = /<function=([a-zA-Z0-9_]+)>([\s\S]*?)<\/function>/g;
      let fnMatch;
      let counter = 0;
      while ((fnMatch = fnRegex.exec(message.content)) !== null) {
        const fnName = fnMatch[1].trim();
        const fnBody = fnMatch[2];
        const parsedArgs = {};
        const paramRegex = /<parameter=([a-zA-Z0-9_]+)>([\s\S]*?)<\/parameter>/g;
        let pm;
        while ((pm = paramRegex.exec(fnBody)) !== null) {
          const pName = pm[1].trim();
          const pValRaw = pm[2].trim();
          try {
            parsedArgs[pName] = JSON.parse(pValRaw);
          } catch (e) {
            parsedArgs[pName] = pValRaw;
          }
        }
        toolCalls.push({
          id: 'xml_call_' + Date.now() + '_' + (++counter),
          type: 'function',
          function: { name: fnName, arguments: JSON.stringify(parsedArgs) }
        });
      }
      if (toolCalls.length > 0) {
        message.tool_calls = toolCalls;
      }
    }
    if (!message.tool_calls || message.tool_calls.length === 0) {
      if (!message.content && messages.length > 0 && messages[messages.length - 1].role === 'tool') {
        try {
          const parsed = JSON.parse(messages[messages.length - 1].content);
          if (parsed.message) return parsed.message;
          if (parsed.success) return 'Готово!';
        } catch(e) {}
        return 'Сделано! (бот промолчал, но функция выполнена)';
      }
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

    const isActionOnly = message.tool_calls.every(tc => ['process_brain_dump', 'schedule_lesson', 'send_homework_to_student', 'import_perplexity_lesson', 'add_lesson', 'create_task', 'create_tasks', 'create_event', 'update_task_status', 'update_task', 'reschedule_tasks', 'add_transaction', 'create_transaction', 'log_habit', 'update_context'].includes(tc.function.name));
    try {
      response = await callAPI(systemInstruction, messages, 0, !!imageUrl, overrideModel, isActionOnly ? true : disableTools, activeTools);
    } catch (e) {
      if (messages.length > 0 && messages[messages.length - 1].role === 'tool') {
        try {
          const parsed = JSON.parse(messages[messages.length - 1].content);
          if (parsed.message) return parsed.message;
          if (parsed.success) return 'Готово! (лимит ИИ на красивый ответ)';
        } catch(err) {}
        return 'Сделано! (лимит ИИ на красивый ответ)';
      }
      throw e;
    }
  }

  return response.choices?.[0]?.message?.content || 'Не удалось получить ответ';
}

async function callAPI(systemInstruction, messages, retryCount = 0, isVision = false, forceModel = null, disableTools = false, customTools = null) {
  let modelToUse = forceModel || AI_MODEL;
  if (isVision) {
    if (AI_API_URL.includes('groq')) modelToUse = 'llama-3.2-11b-vision-preview'; // 90b is deprecated
    else if (AI_API_URL.includes('openai')) modelToUse = 'gpt-4o-mini';
    else if (AI_API_URL.includes('openrouter')) modelToUse = 'nvidia/nemotron-3.5-super-vl:free';
  }

  const res = await fetch(AI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getActiveAIKey()}`
    },
    body: JSON.stringify({
      model: modelToUse,
      messages: [
        { role: 'system', content: systemInstruction },
        ...messages
      ],
      tools: disableTools ? undefined : (customTools || TOOLS),
      tool_choice: disableTools ? undefined : 'auto',
      temperature: 0.1,
      max_tokens: 2048
    })
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`AI API Error (${res.status}):`, errorBody);
    let errMsg = `Provider returned error: HTTP ${res.status} ${errorBody.substring(0, 500)}`;
    try {
      const errJson = JSON.parse(errorBody);
      if (errJson.error && errJson.error.message) errMsg = errJson.error.message;
      else if (errJson.message) errMsg = errJson.message;
    } catch(e) {}
    
    // Check if key is rate-limited or unauthorized and we have a backup key in pool
    if ((res.status === 401 || res.status === 402 || res.status === 403 || res.status === 429 || errMsg.includes('free-models-per-day') || errMsg.includes('Rate limit') || errMsg.includes('Authentication') || errMsg.includes('User not found')) && retryCount < 3) {
      const newKey = rotateAIKey();
      if (newKey) {
        console.warn(`[AI Key Rotation] Retrying callAPI with backup key #${currentKeyIndex + 1} after status ${res.status}...`);
        return callAPI(systemInstruction, messages, retryCount + 1, isVision, forceModel, disableTools, customTools);
      }
    }

    if ((res.status >= 500 || res.status === 429 || res.status === 404 || res.status === 401) && retryCount < 2) {
      if (isOpenRouter && !isVision) {
        const nextFallback = FALLBACK_MODELS[retryCount + 1] || 'openrouter/free';
        console.warn(`Switching to fallback model: ${nextFallback} after status ${res.status}`);
        return callAPI(systemInstruction, messages, retryCount + 1, isVision, nextFallback, disableTools, customTools);
      }
      if (res.status >= 500) {
        console.warn('Server error ' + res.status + '. Retrying in 2s...');
        await new Promise(r => setTimeout(r, 2000));
        return callAPI(systemInstruction, messages, retryCount + 1, isVision, forceModel, disableTools, customTools);
      }
      // OpenRouter sometimes returns "Provider returned error" for 429s, so we shouldn't strictly check the string
      let waitTime = 20;
      const matchM = errMsg.match(/try again in ([\d\.]+)m/);
      const matchS = errMsg.match(/try again in ([\d\.]+)s/);
      if (matchM && matchM[1]) waitTime = parseFloat(matchM[1]) * 60 + 1;
      else if (matchS && matchS[1]) waitTime = parseFloat(matchS[1]) + 1;
      
      // If wait time is reasonable for a bot (<60s), just wait
      if (waitTime <= 60 && !errMsg.includes('tokens per day')) {
        console.warn(`Rate limit hit. Waiting ${waitTime}s...`);
        await new Promise(r => setTimeout(r, waitTime * 1000));
        return callAPI(systemInstruction, messages, retryCount + 1, isVision, forceModel, disableTools, customTools);
      }
      
      throw new Error(`🛑 Лимит запросов (OpenRouter/Groq). Модели перегружены, подожди 30-60 секунд и повтори!`);
    }
    
    // Fallback if model fails to generate valid tool call JSON
    if ((errMsg.includes('failed_generation') || errMsg.includes('Failed to call a function') || errMsg.includes('tool')) && retryCount < 1) {
      console.warn('Groq failed_generation or tool error. Retrying safe-mode...');
      
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      const safeMessages = lastUserMsg ? [lastUserMsg] : [messages[messages.length - 1]];
      
      const fallbackRes = await fetch(AI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getActiveAIKey()}` },
        body: JSON.stringify({
          model: 'nvidia/nemotron-3.5-lightning:free',
          messages: [
            { role: 'system', content: systemInstruction + '\nОТВЕЧАЙ ТОЛЬКО ОБЫЧНЫМ ТЕКСТОМ, ФУНКЦИИ И ИНСТРУМЕНТЫ ОТКЛЮЧЕНЫ.' },
            ...safeMessages
          ],
          temperature: 0.3,
          max_tokens: 1500
        })
      });
      if (fallbackRes.ok) return fallbackRes.json();
      
      const fallbackErr = await fallbackRes.json().catch(() => ({}));
      throw new Error(`Fallback failed: ${fallbackErr.error?.message || fallbackRes.statusText || errMsg}`);
    }
    
    throw new Error(errMsg);
  }

  return res.json();
}

// ============================================
// TELEGRAM HANDLERS
// ============================================

// /start — регистрация chat_id
bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
  const incomingChatId = String(msg.chat.id);
  const payload = (match && match[1]) ? match[1].trim() : '';

  if (payload.startsWith('pr_')) {
    const studentId = payload.slice(3).trim();
    const { data: st } = await db.from('students').select('*').eq('id', studentId).maybeSingle();
    if (!st) {
      return bot.sendMessage(incomingChatId, '❌ Профиль ученика не найден. Попросите преподавателя отправить актуальную ссылку.');
    }
    if (incomingChatId === ADMIN_CHAT_ID) {
      const botUser = BOT_USERNAME || (await bot.getMe().then(m => m.username).catch(() => ''));
      const link = `https://t.me/${botUser}?start=pr_${st.id}`;
      return bot.sendMessage(ADMIN_CHAT_ID, `👨‍👩‍👧 *Проверка ссылки для родителя (${st.name}):*\nСсылка активна! Перешли её маме/папе:\n\`${link}\`\n\n_(Когда родитель нажмёт «Запустить» со своего аккаунта, его Telegram ID автоматически привяжется к карточке ${st.name})_`, { parse_mode: 'Markdown' });
    }
    const doss = parseStudentDossierBot(st);
    if (doss.tgId && String(doss.tgId).trim() === incomingChatId) {
      doss.tgId = '';
      doss.tgUser = '';
    }
    doss.parentTgId = incomingChatId;
    if (msg.from?.username) doss.parentTgUser = '@' + msg.from.username;
    const newSched = serializeStudentDossierBot(doss);
    await db.from('students').update({ schedule: newSched }).eq('id', st.id);

    const welcomeParent = `Здравствуйте! 👋\nВы подключились к электронному дневнику успеваемости ученика *${st.name}* по английскому языку (преподаватель — Игорь) 🇬🇧\n\nСюда я буду автоматически присылать:\n• 📝 *Отчёты после каждого проведённого урока* (тема, успехи, домашнее задание)\n• 📊 *Аналитику прогресса и выученных тем*\n\nВы также можете в любой момент нажать кнопки ниже, чтобы посмотреть актуальное домашнее задание или запросить свежий отчёт об успеваемости:`;
    await bot.sendMessage(incomingChatId, welcomeParent, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📊 Запросить свежий отчёт об успеваемости', callback_data: `parent_req_report:${st.id}` }],
          [{ text: '📚 Посмотреть текущее ДЗ ребёнка', callback_data: `parent_view_hw:${st.id}` }]
        ]
      }
    }).catch(() => bot.sendMessage(incomingChatId, welcomeParent));

    await bot.sendMessage(ADMIN_CHAT_ID, `👨‍👩‍👧 *Родитель подключился к боту!*\nРодитель ученика *${st.name}* (${doss.parentTgUser || 'ID: ' + incomingChatId}) нажал Start.\nТеперь отчёты после проведённых уроков будут уходить родителю автоматически! 🚀`, { parse_mode: 'Markdown' }).catch(() => {});
    return;
  }

  if (payload.startsWith('st_')) {
    const studentId = payload.slice(3).trim();
    const { data: st } = await db.from('students').select('*').eq('id', studentId).maybeSingle();
    if (!st) {
      return bot.sendMessage(incomingChatId, '❌ Ученик не найден. Попросите преподавателя отправить актуальную ссылку.');
    }
    if (incomingChatId === ADMIN_CHAT_ID) {
      const botUser = BOT_USERNAME || (await bot.getMe().then(m => m.username).catch(() => ''));
      const link = `https://t.me/${botUser}?start=st_${st.id}`;
      return bot.sendMessage(ADMIN_CHAT_ID, `🔗 *Проверка ссылки для ${st.name}:*\nСсылка активна! Перешли её ученику:\n\`${link}\`\n\n_(Когда сам ученик нажмёт «Запустить» со своего аккаунта, его Telegram ID автоматически привяжется к карточке)_`, { parse_mode: 'Markdown' });
    }
    const doss = parseStudentDossierBot(st);
    if (doss.parentTgId && String(doss.parentTgId).trim() === incomingChatId) {
      doss.parentTgId = '';
      doss.parentTgUser = '';
    }
    const currentTgIds = (doss.tgId || '').split(',').map(s => s.trim()).filter(Boolean);
    const isBrandNewConnection = !currentTgIds.includes(incomingChatId);
    if (isBrandNewConnection) {
      currentTgIds.push(incomingChatId);
    }
    doss.tgId = currentTgIds.join(', ');

    const currentTgUsers = (doss.tgUser || '').split(',').map(s => s.trim()).filter(Boolean);
    const thisUser = msg.from?.username ? '@' + msg.from.username : (msg.from?.first_name || ('ID:' + incomingChatId));
    if (!currentTgUsers.includes(thisUser)) {
      currentTgUsers.push(thisUser);
    }
    doss.tgUser = currentTgUsers.join(', ');
    const newSched = serializeStudentDossierBot(doss);
    await db.from('students').update({ schedule: newSched }).eq('id', st.id);

    const studentDisplayName = msg.from?.first_name || st.name;
    const welcomeSt = `👋 *Привет, ${studentDisplayName}!* (${st.name})\nЯ бот-помощник Игоря по английскому языку 🇬🇧\n\nСюда я буду присылать:\n• 📌 Твои домашние задания и новые слова после урока\n• ⏰ Напоминания перед занятием, чтобы ничего не забыть\n\nА ещё ты можешь прямо сюда *отправлять выполненную домашку* (текстом, голосом или фотографией тетрадки) — я сразу передам её Игорю!`;
    await bot.sendMessage(incomingChatId, welcomeSt, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📚 Посмотреть моё ДЗ', callback_data: 'student_my_hw' }],
          [{ text: '🔤 5 слов урока', callback_data: `student_words:${st.id}` }, { text: '🃏 Флеш-карточки', callback_data: `student_flashcards:${st.id}:0` }],
          [{ text: '📚 Мой словарик', callback_data: `student_vocab_bank:${st.id}` }, { text: '🔥 Мой стрик', callback_data: `student_streak_info:${st.id}` }],
          [{ text: '📝 Тестик по уроку', callback_data: `student_poll_quiz:${st.id}` }, { text: '🎒 Школьное ДЗ', callback_data: `student_school_hw:${st.id}` }]
        ]
      }
    }).catch(() => bot.sendMessage(incomingChatId, welcomeSt));

    // Уведомление преподавателю отправляем ТОЛЬКО ПРИ ПЕРВОМ ПОДКЛЮЧЕНИИ!
    if (isBrandNewConnection) {
      await bot.sendMessage(ADMIN_CHAT_ID, `🎉 *${msg.from?.first_name || "Ученик"}* из группы *${st.name}* (${thisUser}) впервые подключился(лась) к боту!\n👥 Всего подключено к группе: ${currentTgIds.length} уч. 🚀`, { parse_mode: 'Markdown' }).catch(() => {});
    }
    return;
  }

  if (incomingChatId !== ADMIN_CHAT_ID) {
    const parentFound = await findParentByTgChatId(incomingChatId);
    if (parentFound) {
      return bot.sendMessage(incomingChatId, `Здравствуйте! 👋 Это электронный дневник успеваемости ученика *${parentFound.student.name}* по английскому языку (преподаватель — Игорь) 🇬🇧.\n\nВыберите действие ниже:`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📊 Запросить свежий отчёт об успеваемости', callback_data: `parent_req_report:${parentFound.student.id}` }],
            [{ text: '📚 Посмотреть текущее ДЗ ребёнка', callback_data: `parent_view_hw:${parentFound.student.id}` }]
          ]
        }
      });
    }
    const found = await findStudentByTgChatId(incomingChatId);
    if (found) {
      return bot.sendMessage(incomingChatId, `👋 Привет, *${found.student.name}*! Нажми кнопку ниже, чтобы посмотреть своё домашнее задание, или просто отправь мне сюда выполненное ДЗ (текстом или фото тетрадки)! 🇬🇧`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📚 Посмотреть моё ДЗ', callback_data: 'student_my_hw' }],
            [{ text: '🔤 5 слов урока', callback_data: `student_words:${found.student.id}` }, { text: '⚡ 5 глаголов', callback_data: `student_verbs:${found.student.id}` }],
            [{ text: '📚 Мой словарик', callback_data: `student_vocab_bank:${found.student.id}` }, { text: '🔥 Мой стрик', callback_data: `student_streak_info:${found.student.id}` }],
            [{ text: '📝 Тестик по уроку', callback_data: `student_poll_quiz:${found.student.id}` }, { text: '🃏 Флеш-карточки', callback_data: `student_flashcards:${found.student.id}:0` }],
            [{ text: '🎮 Мини-игра', callback_data: `student_game:${found.student.id}` }]
          ]
        }
      });
    }
    return bot.sendMessage(incomingChatId, '🔒 Это закрытый бот для учеников по английскому языку. Пожалуйста, перейдите по персональной ссылке-приглашению от преподавателя!');
  }
  if (false) {
  CHAT_ID = msg.chat.id.toString();
  console.log(`📍 Chat ID: ${CHAT_ID}`);
  bot.sendMessage(CHAT_ID, 'Привет! Я твой антигравити-ассистент. Можешь писать текстом, скидывать голосовые (я их расшифрую) или присылать фотографии чеков для учета финансов!');
  }
  CHAT_ID = ADMIN_CHAT_ID;
  bot.sendMessage(CHAT_ID, 'Привет! Я твой антигравити-ассистент. Можешь писать текстом, скидывать голосовые (я их расшифрую) или присылать фотографии чеков для учета финансов!');
});

// Обработка фотографий (сканер чеков)

// Student document handler (PDFs, uncompressed photos)
bot.on('document', async (msg) => {
  const chatId = msg.chat.id;
  if (String(chatId) === ADMIN_CHAT_ID) return;

  const found = await findStudentByTgChatId(chatId);
  if (!found) return;
  const st = found.student;

  const lastLs = await getLatestLessonWithMaterials(st.id);
  const docActor = resolveStudentActor(st, chatId, msg.from);
  const prog = getHwCompletionSummary(st, lastLs, chatId, msg.from);
  prog.completedSteps.written = true;
  const updatedProg = getHwCompletionSummary(st, lastLs, chatId, msg.from);
  if (lastLs) {
    await persistHwProgressPercent(lastLs, updatedProg.pct, docActor, st);
    await markHwTagForActor(lastLs, 'СДАНО', docActor);
  }

  const studentDocReply = `✅ Молодец, *${docActor.shortName}*! Я получил твой файл с ДЗ и уже передал его Игорю на проверку! 🌟\n📊 *Готовность ДЗ: ${updatedProg.pct}%* (кнопка сдачи ДЗ разблокирована!)`;
  await bot.sendMessage(chatId, studentDocReply, {
    parse_mode: 'Markdown',
    reply_markup: buildStudentKeyboard(st, lastLs, chatId)
  }).catch(() => {});

  await bot.sendDocument(ADMIN_CHAT_ID, msg.document.file_id, {
    caption: `📄 *Документ/файл ДЗ от ученика: ${docActor.displayLabel}* (${msg.document.file_name || 'файл'})\n📊 *Готовность ДЗ:* ${updatedProg.pct}%\n${updatedProg.groupBreakdownText ? updatedProg.groupBreakdownText + '\n' : ''}✅ *Сделано:* ${updatedProg.doneList.join(', ')}\n⏳ *Осталось:* ${updatedProg.todoList.join(', ') || 'Ничего'}\n\n📨 *Копия ответа ученику:*\n${studentDocReply}`,
    parse_mode: 'Markdown',
    reply_markup: lastLs ? { inline_keyboard: [[{ text: '✅ Отметить ДЗ проверенным', callback_data: `lesson_hw_checked:${lastLs.id}` }]] } : undefined
  }).catch(async () => {
    await bot.forwardMessage(ADMIN_CHAT_ID, chatId, msg.message_id).catch(() => {});
  });
});

bot.on('photo', async (msg) => {
  var chatId = msg.chat.id;
  if (String(chatId) !== ADMIN_CHAT_ID) {
    const parentFound = await findParentByTgChatId(chatId);
    if (parentFound) {
      const pSt = parentFound.student;
      await bot.sendMessage(chatId, `Здравствуйте! 👋 Я передал ваше сообщение преподавателю Игорю (по ученику *${pSt.name}*).`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📊 Запросить свежий отчёт об успеваемости', callback_data: `parent_req_report:${pSt.id}` }],
            [{ text: '📚 Посмотреть текущее ДЗ ребёнка', callback_data: `parent_view_hw:${pSt.id}` }]
          ]
        }
      }).catch(() => {});
      await bot.sendMessage(ADMIN_CHAT_ID, `👨‍👩‍👧 *Сообщение от родителя ученика ${pSt.name}:*\n💬 "${msg.text || '[Медиа/Голосовое]'}"`, { parse_mode: 'Markdown' }).catch(() => {});
      await bot.forwardMessage(ADMIN_CHAT_ID, chatId, msg.message_id).catch(() => {});
      return;
    }
    const found = await findStudentByTgChatId(chatId);
    if (!found) {
      return bot.sendMessage(chatId, '🔒 Доступ только по ссылке-приглашению преподавателя.');
    }
    // Фото от ученика обрабатывается комплексно (с ИИ-проверкой рукописи, 75% прогрессом и копией учителю) в едином обработчике bot.on('message') ниже
    return;
  }
  var chatId = msg.chat.id;
  const user = await getUser();
  
  // --- ПЕРЕХВАТ DEEP WORK ---
  if (globalDeepWorkUntil && Date.now() < globalDeepWorkUntil) {
    await db.from('inbox').insert({ user_id: user.id, content: 'Фотография от ' + new Date().toLocaleTimeString() });
    return bot.sendMessage(chatId, '🤫 Фото сохранено (помечено в Инбоксе). Возвращайся к работе!');
  }
  // --------------------------

  try {
    const sentMsg = await bot.sendMessage(msg.chat.id, '👀 Изучаю чек...');
    
    // Получаем фото в среднем разрешении, чтобы избежать 504 тайм-аутов на OpenRouter из-за огромного размера base64
    const photoIndex = msg.photo.length > 1 ? msg.photo.length - 2 : 0;
    const fileId = msg.photo[photoIndex].file_id;
    const fileLink = await bot.getFileLink(fileId);
    
    // Скачиваем фото и конвертируем в base64
    const response = await fetch(fileLink);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const imageUrl = `data:image/jpeg;base64,${base64}`;
    
    let userCaption = msg.caption ? `Комментарий пользователя: ${msg.caption}\n` : '';
    
    // Используем gpt-4o напрямую для анализа картинки и вызова функций за один шаг
    const actionPrompt = `ВНИМАНИЕ! КРИТИЧЕСКОЕ ЗАДАНИЕ ПО ОБРАБОТКЕ ФОТО:
Пользователь прислал фотографию. Проанализируй её и выбери ОДНО из действий:

1. Если на фото кассовый чек, счет из ресторана или квитанция об оплате:
   ТЫ СТРОГО ОБЯЗАН ВЫЗВАТЬ ФУНКЦИЮ create_transaction! ЗАПРЕЩЕНО отвечать просто текстом!
   - amount: возьми итоговую сумму из чека (Итого к оплате)
   - category: логичная категория (Продукты, Ресторан, Транспорт, Аптека и т.д.)
   - comment: перечисли ВСЕ купленные товары из чека строго как они написаны на самой БУМАЖКЕ чека, включая их количество и стоимость каждого. ТЫ МОЖЕШЬ использовать физические товары на фоне как ПОДСКАЗКУ, чтобы правильно расшифровать размытый текст на чеке (например, если на фоне лежит упаковка 'Soletto' или сигареты 'Собрание', то ищи похожие по смыслу слова в чеке, чтобы не писать бред вроде 'сырная сарделька' вместо сигарет). НО ВНИМАНИЕ: цены и итоговый список бери ТОЛЬКО с бумаги!

2. Если на фото изображено что-то, подтверждающее полезную привычку пользователя (например: беговые кроссовки на улице, еда для здорового питания, коврик для фитнеса, раскрытая книга, гантели, витамины):
   СНАЧАЛА вызови инструмент get_habits, чтобы узнать список привычек. ЗАТЕМ вызови инструмент log_habit для нужной привычки (чтобы поставить галочку "Выполнено" на сегодня). ОЧЕНЬ ВАЖНО: Если видишь кроссовки или улицу - это бег!

3. Если на фото тетрадь ученика, упражнение по английскому языку, тест или домашнее задание:
   Выступи как топовый преподаватель английского! Проверь каждое предложение/ответ на фото, найди и объясни ошибки, поставь оценку и напиши готовый тёплый отзыв для пересылки ученику.
4. Во всех остальных случаях (мемы, коты, рандомные фото без явной связи с финансами, английским или привычками):
   Ничего не вызывай, просто коротко и дружелюбно прокомментируй фото текстом.

ПОСЛЕ успешного вызова функции, обязательно напиши пользователю красивый ответ, в котором ОБЯЗАТЕЛЬНО перечисли все купленные товары из чека списком с ценами каждого товара, чтобы он видел их в чате!`;

    // Вызываем askAI с картинкой напрямую
    const userPrompt = userCaption ? `Комментарий пользователя к фото: ${userCaption}` : 'Распознай фото по инструкции.';
    const aiResponse = await askAI(actionPrompt + '\\n\\n' + userPrompt, '', imageUrl, false, true, ['create_transaction', 'get_habits', 'log_habit'], true);

    
    // Сохраняем в историю
    await saveMessage('user', userCaption + ' [Фотография чека]');
    await saveMessage('assistant', aiResponse);
    
    try {
      await bot.editMessageText(aiResponse, {
        chat_id: msg.chat.id,
        message_id: sentMsg.message_id,
        parse_mode: 'Markdown'
      });
    } catch (err) {
      console.warn('Telegram Markdown parsing failed, falling back to plain text:', err.message);
      await bot.editMessageText(aiResponse, {
        chat_id: msg.chat.id,
        message_id: sentMsg.message_id
      }).catch(e => console.error('Failed to send fallback message:', e));
    }
  } catch (e) {
    console.error('Photo error:', e);
    bot.sendMessage(msg.chat.id, '❌ Произошла ошибка при распознавании фото: ' + e.message);
  }
});

// /habits — интерактивный список привычек с кнопками
bot.onText(/\/habits/, async (msg) => {
  var chatId = msg.chat.id;
  try {
    const habits = await getHabits();
    if (habits.length === 0) {
      return bot.sendMessage(chatId, '🌱 У тебя пока нет активных привычек. Добавь их в веб-интерфейсе!');
    }

    const todayLogs = await getHabitLogsToday();
    const doneHabitIds = new Set(todayLogs.filter(l => l.status === 'done').map(l => l.habit_id));

    let text = '🔥 *Твои привычки на сегодня:*\n\n';
    const keyboard = typeof prepButtons !== 'undefined' ? [...prepButtons] : [];

    habits.forEach(h => {
      const isDone = doneHabitIds.has(h.id);
      const statusEmoji = isDone ? '✅' : '⬜';
      text += `${statusEmoji} ${h.name}\n`;
      keyboard.push([{
        text: `${statusEmoji} ${h.name}`,
        callback_data: `habit:${h.id}:${isDone ? 'undone' : 'done'}`
      }]);
    });

    await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: keyboard
      }
    }).catch(() => {
      bot.sendMessage(chatId, text, {
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    });
  } catch (e) {
    bot.sendMessage(chatId, '❌ Ошибка при получении привычек: ' + e.message);
  }
});

// Обработка кликов по кнопкам (коллбеки)
bot.on('callback_query', async (query) => {
  const data = query.data;
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;

  if (data && data.startsWith('habit:')) {
    const [_, habitId, action] = data.split(':');
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Minsk' });

    try {
      if (action === 'done') {
        await logHabit(habitId, today, 'done');
      } else {
        await logHabit(habitId, today, 'missed');
      }

      await bot.answerCallbackQuery(query.id, { 
        text: action === 'done' ? 'Привычка выполнена! 💪' : 'Привычка отменена.' 
      });

      // Перерисовываем список привычек
      const habits = await getHabits();
      const todayLogs = await getHabitLogsToday();
      const doneHabitIds = new Set(todayLogs.filter(l => l.status === 'done').map(l => l.habit_id));

      let text = '🔥 *Твои привычки на сегодня:*\n\n';
      const keyboard = typeof prepButtons !== 'undefined' ? [...prepButtons] : [];

      habits.forEach(h => {
        const isDone = doneHabitIds.has(h.id);
        const statusEmoji = isDone ? '✅' : '⬜';
        text += `${statusEmoji} ${h.name}\n`;
        keyboard.push([{
          text: `${statusEmoji} ${h.name}`,
          callback_data: `habit:${h.id}:${isDone ? 'undone' : 'done'}`
        }]);
      });

      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard
        }
      }).catch(async () => {
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: keyboard
          }
        }).catch(e => console.error('Failed to edit habit message:', e));
      });

    } catch (e) {
      console.error('Callback query habit error:', e);
      bot.answerCallbackQuery(query.id, { 
        text: '❌ Ошибка: ' + e.message, 
        show_alert: true 
      });
    }
  } else if (data === 'finance_refresh') {
    try {
      await bot.answerCallbackQuery(query.id, { text: 'Данные обновлены! 🔄' });
      await sendFinanceSummary(chatId, messageId);
    } catch (e) {
      console.error('Callback query finance error:', e);
    }
  } else if (data === 'focus_stop') {
    try {
      globalDeepWorkUntil = null;
      if (deepWorkTimeout) clearTimeout(deepWorkTimeout);
      await bot.answerCallbackQuery(query.id, { text: 'Фокусировка отменена!' });
      await bot.editMessageText('🧠 Режим Deep Work досрочно завершен.', {
        chat_id: chatId,
        message_id: messageId
      }).catch(e => console.error(e));
    } catch (e) {
      console.error('Callback query focus_stop error:', e);
    }
  } else if (data && data.startsWith('focus_start:')) {
    const mins = parseInt(data.split(':')[1], 10);
    try {
      await bot.answerCallbackQuery(query.id, { text: `Запускаем на ${mins} мин! 🚀` });
      await bot.deleteMessage(chatId, messageId).catch(() => {});
      await startDeepWorkMode(chatId, mins);
    } catch (e) {
      console.error('Callback query focus_start error:', e);
    }
  } else if (data === 'lessons_refresh') {
    try {
      await bot.answerCallbackQuery(query.id, { text: 'Список уроков обновлен! 🔄' });
      await sendLessonsSummary(chatId, messageId);
    } catch (e) {
      console.error('Callback query lessons_refresh error:', e);
    }
  } else if (data === 'tasks_pulse_refresh') {
    try {
      await bot.answerCallbackQuery(query.id, { text: 'Сводка задач обновлена! 🔄' });
      await sendTaskPulseReminder('⏰ *Пульс задач: День и Неделя*', chatId, messageId);
    } catch (e) {
      console.error('Callback query tasks_pulse_refresh error:', e);
    }
  } else if (data === 'tasks_close_overdue') {
    try {
      const overdueList = await getOverdueTasks();
      for (const ot of overdueList) {
        await completeTask(ot.id);
      }
      await bot.answerCallbackQuery(query.id, { text: `✅ Закрыто хвостов: ${overdueList.length}!` });
      await sendTaskPulseReminder('⏰ *Пульс задач: День и Неделя*', chatId, messageId);
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && data.startsWith('task_done:')) {
    const taskId = data.split(':')[1];
    try {
      const t = await completeTask(taskId);
      await bot.answerCallbackQuery(query.id, { text: `✅ Выполнено: ${t?.title || 'Задача'}!` });
      await sendTaskPulseReminder('⏰ *Пульс задач: День и Неделя*', chatId, messageId).catch(() => {});
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && data.startsWith('task_tomorrow:')) {
    const taskId = data.split(':')[1];
    try {
      const tomorrow = getMinskDateString(1);
      const { data: t } = await db.from('tasks').update({ deadline: tomorrow }).eq('id', taskId).select().single();
      await bot.answerCallbackQuery(query.id, { text: `⏭ Перенесено на завтра (${tomorrow})` });
      await sendTaskPulseReminder('⏰ *Пульс задач: День и Неделя*', chatId, messageId).catch(() => {});
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && data.startsWith('teacher_reply_st:')) {
    const studentId = data.split(':')[1];
    try {
      const { data: st } = await db.from('students').select('*').eq('id', studentId).maybeSingle();
      if (!st) return bot.answerCallbackQuery(query.id, { text: 'Ученик не найден', show_alert: true });
      pendingTeacherReplyToStudent.set(String(chatId), {
        studentId: st.id,
        studentName: st.name,
        expiresAt: Date.now() + 10 * 60000
      });
      await bot.answerCallbackQuery(query.id, { text: `🎤 Запиши голосовое или текст для ${st.name}` });
      await bot.sendMessage(chatId, `🎤 *Режим ответа ученику: ${st.name}*\n\nЗапиши сюда *голосовое сообщение*, *кружочек*, пришли *скриншот* или напиши *текст* — я мгновенно перешлю его лично ученику *${st.name}* от твоего имени!`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'teacher_reply_cancel' }]]
        }
      }).catch(() => {});
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data === 'teacher_reply_cancel') {
    pendingTeacherReplyToStudent.delete(String(chatId));
    await bot.answerCallbackQuery(query.id, { text: 'Отменено' });
    await bot.editMessageText('❌ Отправка комментария ученику отменена.', { chat_id: chatId, message_id: messageId }).catch(() => {});
  } else if (data && data.startsWith('switch_to_parent:')) {
    const studentId = data.split(':')[1];
    try {
      const { data: st } = await db.from('students').select('*').eq('id', studentId).maybeSingle();
      if (!st) return bot.answerCallbackQuery(query.id, { text: 'Профиль не найден', show_alert: true });
      const doss = parseStudentDossierBot(st);
      if (String(doss.tgId).trim() === String(chatId).trim()) {
        doss.tgId = '';
        doss.tgUser = '';
      }
      doss.parentTgId = String(chatId);
      if (query.from?.username) doss.parentTgUser = '@' + query.from.username;
      const newSched = serializeStudentDossierBot(doss);
      await db.from('students').update({ schedule: newSched }).eq('id', st.id);
      await bot.answerCallbackQuery(query.id, { text: '👨‍👩‍👧 Переключено в режим Родителя!' });
      const welcomeParent = `Здравствуйте! 👋\nРежим успешно переключён: теперь вы подключены как *Родитель* к электронному дневнику успеваемости ученика *${st.name}* по английскому языку (преподаватель — Игорь) 🇬🇧\n\nСюда я буду автоматически присылать:\n• 📝 *Отчёты после каждого проведённого урока* (тема, успехи, домашнее задание)\n• 📊 *Аналитику прогресса и выученных тем*\n\nВы можете в любой момент нажать кнопки ниже, чтобы посмотреть актуальное домашнее задание ребёнка или запросить свежий отчёт об успеваемости:`;
      await bot.sendMessage(chatId, welcomeParent, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📊 Запросить свежий отчёт об успеваемости', callback_data: `parent_req_report:${st.id}` }],
            [{ text: '📚 Посмотреть текущее ДЗ ребёнка', callback_data: `parent_view_hw:${st.id}` }]
          ]
        }
      }).catch(() => bot.sendMessage(chatId, welcomeParent));
      await bot.sendMessage(ADMIN_CHAT_ID, `👨‍👩‍👧 Аккаунт (${doss.parentTgUser || 'ID: ' + chatId}) переключился в режим *Родителя* ученика *${st.name}*!`, { parse_mode: 'Markdown' }).catch(() => {});
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && data.startsWith('parent_req_report:')) {
    const studentId = data.split(':')[1];
    try {
      const { data: st } = await db.from('students').select('*').eq('id', studentId).maybeSingle();
      if (!st) return bot.answerCallbackQuery(query.id, { text: 'Профиль не найден', show_alert: true });
      await bot.answerCallbackQuery(query.id, { text: '📊 Формирую отчёт об успеваемости...' });
      const doss = parseStudentDossierBot(st);
      const { data: recentLs } = await db.from('lessons').select('*').eq('student_id', st.id).eq('status', 'Проведен').order('date', { ascending: false }).limit(8);
      const historyLines = (recentLs || []).map(l => `- ${new Date(l.date).toLocaleDateString('ru-RU')}: ${l.topic || 'Практика'} ${(l.homework || '').includes('[ДЗ_ПРОВЕРЕНО]') || (l.homework || '').includes('[ДЗ_СДАНО]') ? '(ДЗ выполнено ✅)' : ''}`).join('\n');
      const prompt = `Ты — преподаватель английского Игорь. Составь структурированный, доброжелательный "📊 Отчёт об успеваемости" для родителей ученика ${st.name} (${st.grade || ''}).\nПройденные уроки:\n${historyLines || 'Занятия только начались'}\nТекущий учебник/программа: ${doss.unit || 'по уровню'}.\nАктивный словарь: ${doss.vocab || 'по темам уроков'}.\nЗоны роста (над чем работаем): ${doss.errors || 'разговорная практика и грамматика'}.\nУдарный режим выполнения ДЗ: ${doss.streak || 0} подряд.\nСтруктура:\n1. 🌟 Пройденные темы и главные успехи\n2. 📈 Над чем сейчас работаем особенно внимательно\n3. 🎯 План на ближайшие занятия\nПиши тепло, профессионально, до 1200 символов.`;
      const planRes = await executeFunctionCall('generate_lesson_plan', { prompt });
      const repText = planRes.generated_plan || `📊 *Сводка по ученику ${st.name}:*\nПройдено уроков в выборке: ${(recentLs || []).length}.\nУдарный режим ДЗ: 🔥 ${doss.streak || 0}`;
      await bot.sendMessage(chatId, repText, { parse_mode: 'Markdown' }).catch(() => bot.sendMessage(chatId, repText));
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && data.startsWith('parent_view_hw:')) {
    const studentId = data.split(':')[1];
    try {
      const { data: st } = await db.from('students').select('*').eq('id', studentId).maybeSingle();
      if (!st) return bot.answerCallbackQuery(query.id, { text: 'Профиль не найден', show_alert: true });
      const lastLs = await getLatestLessonWithMaterials(st.id);
      await bot.answerCallbackQuery(query.id, { text: '📚 Загружаю данные о ДЗ...' });
      if (!lastLs) return bot.sendMessage(chatId, `По ученику *${st.name}* пока нет записанных уроков.`, { parse_mode: 'Markdown' });
      const { cleanHw: noCardsHw, cards } = extractAttachedCards(lastLs.homework || '');
      const isDone = noCardsHw.includes('[ДЗ_СДАНО]') || noCardsHw.includes('[ДЗ_ПРОВЕРЕНО]');
      const cleanHw = noCardsHw.split('\\n[МАТЕРИАЛЫ]:')[0].replace('[ДЗ_ПРОВЕРЕНО]', '').replace('[ДЗ_СДАНО]', '').replace('[ОТПРАВИТЬ_В_ТГ]', '').replace('[ОТПРАВИТЬ_РОДИТЕЛЮ_В_ТГ]', '').trim();
      const dStr = new Date(lastLs.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
      
      let msg = `📚 *Текущее домашнее задание (${st.name}):*\n📅 Урок от: ${dStr}\n📖 *Тема:* ${lastLs.topic || 'Английский язык'}\n📌 *Задание:* ${cleanHw || 'Без письменного задания'}`;
      if (cards.length > 0) msg += `\n🖼 *Прикреплено карточек:* ${cards.length} шт. (отправляю ниже)`;
      msg += `\n\nСтатус выполнения: ${isDone ? '✅ *Уже выполнено / сдано ребёнком!*' : '⏳ *В процессе выполнения*'}`;
      
      await bot.sendMessage(chatId, msg, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔤 5 слов урока ребёнка', callback_data: `student_words:${st.id}` }, { text: '📝 Проверить ребёнка (тестик)', callback_data: `student_poll_quiz:${st.id}` }]
          ]
        }
      }).catch(() => bot.sendMessage(chatId, msg));

      if (cards.length > 0) {
        await sendCardsToChat(chatId, cards, `🖼 Карточка к ДЗ (${st.name})`);
      }
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && data.startsWith('teacher_send_parent_rep:')) {
    const lessonId = data.split(':')[1];
    try {
      const { data: ls } = await db.from('lessons').select('*, students(*)').eq('id', lessonId).maybeSingle();
      const st = ls?.students;
      if (!st) return bot.answerCallbackQuery(query.id, { text: 'Ученик не найден', show_alert: true });
      const doss = parseStudentDossierBot(st);
      if (!doss.parentTgId) {
        const botUser = BOT_USERNAME || (await bot.getMe().then(m => m.username).catch(() => ''));
        const link = `https://t.me/${botUser}?start=pr_${st.id}`;
        await bot.answerCallbackQuery(query.id, { text: 'Родитель ещё не привязан к боту!' });
        return bot.sendMessage(chatId, `⚠️ Родитель ученика *${st.name}* ещё не нажал Start в боте.\nПерешли родителю эту ссылку один раз:\n\`${link}\``, { parse_mode: 'Markdown' });
      }
      await bot.answerCallbackQuery(query.id, { text: '👨‍👩‍👧 Генерирую и отправляю отчёт родителю...' });
      const sendRes = await sendParentLessonReportBot(st, ls);
      if (sendRes.sent) {
        await bot.sendMessage(chatId, `👨‍👩‍👧 Отчёт по уроку успешно отправлен родителю ученика *${st.name}* в Telegram!`, { parse_mode: 'Markdown' });
      } else {
        await bot.sendMessage(chatId, `❌ Ошибка отправки родителю: ${sendRes.reason}`);
      }
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }

  } else if (data && (data.startsWith('student_words:') || data === 'student_words')) {
    const studentId = data.includes(':') ? data.split(':')[1] : null;
    try {
      let st = null;
      if (studentId) {
        const { data: sData } = await db.from('students').select('*').eq('id', studentId).maybeSingle();
        st = sData;
      }
      if (!st) {
        const sFound = await findStudentByTgChatId(chatId);
        st = sFound?.student;
      }
      if (!st) {
        const pFound = await findParentByTgChatId(chatId);
        st = pFound?.student;
      }
      if (!st) return bot.answerCallbackQuery(query.id, { text: 'Профиль не найден', show_alert: true });

      const actor = resolveStudentActor(st, chatId, query.from);
      await bot.answerCallbackQuery(query.id, { text: `🔤 Загружаю 5 новых слов для ${actor.name}...` });
      const doss = parseStudentDossierBot(st);
      const lastLs = await getLatestLessonWithMaterials(st.id);
      const materialsText = extractAllLessonMaterials(lastLs, st);

      const prog = getPracticeProgress(st.id, lastLs?.id, actor.tagKey);
      prog.wordsBatch++;

      const wordsPrompt = `Ты — первоклассный методист английского языка для ${actor.name} (${st.grade || '6 класс'}).
СТРОГО ИСПОЛЬЗУЙ МАТЕРИАЛЫ, СЛОВАРЬ И СЦЕНАРИЙ УРОКА:
${materialsText || `Активный словарь: "${doss.vocab || ''}"\nТема урока: "${lastLs?.topic || 'English'}"`}

Ученик уже выучил следующие слова урока: ${prog.seenWords.length > 0 ? prog.seenWords.join(', ') : 'ещё не начинал'}.

ТВОЯ ЗАДАЧА:
Выбери РОВНО 5 СЛЕДУЮЩИХ НОВЫХ слов или словосочетаний из материалов урока (порция #${prog.wordsBatch}), которые ещё НЕ встречались в списке выше!
Если все ключевые слова сценария уже пройдены, напиши в первой строке: "🎉 Все ключевые слова урока пройдены! Повторяем с 1-й порции с новыми примерами."

ПРАВИЛА ОФОРМЛЕНИЯ (СТРОГО):
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать звездочки markdown (** или *)! Никаких звездочек!
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ таблицы (|---|). Только чистый нумерованный список!
- Формат:
🔤 5 слов урока (${actor.name}) — Порция ${prog.wordsBatch}:
1. Word [транскрипция] — русский перевод
   Пример: Short english sentence (Русский перевод в скобках)
...
В конце добавь вопрос: "Какое слово тебе понравилось больше всего? Напиши мне в ответ предложение с ним!"`;

      const genRes = await executeFunctionCall('generate_lesson_plan', { prompt: wordsPrompt });
      const rawText = genRes.generated_plan || '1. Explore [ɪkˈsplɔː] — Исследовать\n2. Challenge [ˈtʃælɪndʒ] — Вызов';

      // Parse and track seen words
      const extractedWords = [];
      const lines = rawText.split('\n');
      for (const line of lines) {
        const m = line.match(/^\d+\.\s+([A-Za-z\s-]+)(?:\[|$|—)/);
        if (m && m[1]) {
          const w = m[1].trim();
          if (!prog.seenWords.includes(w)) prog.seenWords.push(w);
          extractedWords.push(w);
        }
      }

      prog.completedSteps.words = true;
      const hwStatus = getHwCompletionSummary(st, lastLs, chatId, query.from);
      await persistHwProgressPercent(lastLs, hwStatus.pct, actor, st);
      const submitBtnLabel = hwStatus.canSubmit
        ? `✅ Я сделал(а) ДЗ! (Готово ${hwStatus.pct}%)`
        : `🔒 Сдать ДЗ (готово ${hwStatus.pct}% из 75%)`;

      const kb = [
        [{ text: '📝 Пройти тестик (3 вопроса)', callback_data: `student_poll_quiz:${st.id}` }],
        [{ text: '🃏 Флеш-карточки', callback_data: `student_flashcards:${st.id}:0` }],
        [{ text: '🔤 Следующие 5 слов урока', callback_data: `student_words:${st.id}` }],
        [{ text: submitBtnLabel, callback_data: `student_hw_done:${lastLs?.id || ''}` }]
      ];
      await sendCleanMessage(chatId, rawText, { reply_markup: { inline_keyboard: kb } });

      // Send audio pronunciation via Google TTS
      if (extractedWords.length > 0) {
        await sendTtsAudio(chatId, extractedWords.join('. ') + '.', `Произношение слов (порция ${prog.wordsBatch})`, '🔊 Послушай, как звучат эти слова на английском');
      }

      // Full verbatim copy + readiness report to Igor (teacher)
      await sendCleanMessage(ADMIN_CHAT_ID,
        `👀 [Копия для преподавателя — ${actor.displayLabel} нажал(а) «🔤 Слова урока» (Порция #${prog.wordsBatch})]:\n` +
        `📊 Готовность ДЗ: ${hwStatus.pct}% (${hwStatus.canSubmit ? 'Готов к сдаче ✅' : 'Нужно минимум 75% 🔒'})\n` +
        `${hwStatus.groupBreakdownText ? `👥 В группе:\n${hwStatus.groupBreakdownText}\n` : ''}` +
        `✅ Что уже сделано:\n• ${hwStatus.doneText}\n` +
        `⏳ Что ещё осталось:\n• ${hwStatus.leftText}\n\n` +
        `📩 Полный текст, отправленный ученику:\n${rawText}`
      ).catch(() => {});
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && (data.startsWith('student_verbs:') || data === 'student_verbs')) {
    const studentId = data.includes(':') ? data.split(':')[1] : null;
    try {
      let st = null;
      if (studentId) {
        const { data: sData } = await db.from('students').select('*').eq('id', studentId).maybeSingle();
        st = sData;
      }
      if (!st) {
        const sFound = await findStudentByTgChatId(chatId);
        st = sFound?.student;
      }
      if (!st) {
        const pFound = await findParentByTgChatId(chatId);
        st = pFound?.student;
      }
      if (!st) return bot.answerCallbackQuery(query.id, { text: 'Профиль не найден', show_alert: true });

      const actor = resolveStudentActor(st, chatId, query.from);
      await bot.answerCallbackQuery(query.id, { text: `⚡ Загружаю 5 новых глаголов для ${actor.name}...` });
      const doss = parseStudentDossierBot(st);
      const lastLs = await getLatestLessonWithMaterials(st.id);
      const materialsText = extractAllLessonMaterials(lastLs, st);

      const prog = getPracticeProgress(st.id, lastLs?.id, actor.tagKey);
      prog.verbsBatch++;

      const verbsPrompt = `Ты — преподаватель английского для ${actor.name} (${st.grade || '6 класс'}).
СТРОГО ИСПОЛЬЗУЙ ГЛАГОЛЫ, СЛОВАРЬ И МАТЕРИАЛЫ ИЗ УРОКА:
${materialsText || `Тема: "${lastLs?.topic || 'English Verbs'}"`}

Ученик уже повторил следующие глаголы: ${prog.seenVerbs.length > 0 ? prog.seenVerbs.join(', ') : 'ещё не начинал'}.

ТВОЯ ЗАДАЧА:
Выбери РОВНО 5 СЛЕДУЮЩИХ НОВЫХ неправильных или ключевых глаголов из материалов урока (порция #${prog.verbsBatch}), которые ещё НЕ встречались выше!
Иди последовательно: Группа 1 (V2=V3: have, make, find, hear, catch, get), затем Группа 2 (V1=V3: become, come, run), затем Группа 3 (3 разные формы: be, go, see, do, eat, fly, ride, drive, take, swim, write).
Если все глаголы сценария пройдены, напиши: "🎉 Все неправильные глаголы урока пройдены! Повторяем с 1-й группы."

ПРАВИЛА ОФОРМЛЕНИЯ (СТРОГО):
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать звездочки markdown (** или *)!
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ таблицы!
- Формат:
⚡ 5 глаголов урока (${actor.name}) — Порция ${prog.verbsBatch}:
1. V1 – V2 – V3 [транскрипция] — русский перевод
   Пример: Short sentence (Русский перевод)
...
В конце: "Попробуй составить одно предложение с любым глаголом и пришли мне!"`;

      const genRes = await executeFunctionCall('generate_lesson_plan', { prompt: verbsPrompt });
      const rawText = genRes.generated_plan || '1. make – made – made [meɪk] — делать / создавать';

      // Parse and track seen verbs
      const lines = rawText.split('\n');
      for (const line of lines) {
        const m = line.match(/^\d+\.\s+([A-Za-z]+)/);
        if (m && m[1]) {
          const v = m[1].trim();
          if (!prog.seenVerbs.includes(v)) prog.seenVerbs.push(v);
        }
      }

      prog.completedSteps.grammar = true;
      const hwStatus = getHwCompletionSummary(st, lastLs, chatId, query.from);
      await persistHwProgressPercent(lastLs, hwStatus.pct, actor, st);
      const submitBtnLabel = hwStatus.canSubmit
        ? `✅ Я сделал(а) ДЗ! (Готово ${hwStatus.pct}%)`
        : `🔒 Сдать ДЗ (готово ${hwStatus.pct}% из 75%)`;

      const kb = [
        [{ text: '📝 Пройти тестик по уроку', callback_data: `student_poll_quiz:${st.id}` }],
        [{ text: '🔤 5 слов урока', callback_data: `student_words:${st.id}` }],
        [{ text: '⚡ Ещё 5 глаголов', callback_data: `student_verbs:${st.id}` }],
        [{ text: submitBtnLabel, callback_data: `student_hw_done:${lastLs?.id || ''}` }]
      ];
      await sendCleanMessage(chatId, rawText, { reply_markup: { inline_keyboard: kb } });

      // Full verbatim copy + readiness report to Igor (teacher)
      await sendCleanMessage(ADMIN_CHAT_ID,
        `👀 [Копия для преподавателя — ${actor.displayLabel} нажал(а) «⚡ 5 глаголов» (Порция #${prog.verbsBatch})]:\n` +
        `📊 Готовность ДЗ: ${hwStatus.pct}% (${hwStatus.canSubmit ? 'Готов к сдаче ✅' : 'Нужно минимум 75% 🔒'})\n` +
        `${hwStatus.groupBreakdownText ? `👥 В группе:\n${hwStatus.groupBreakdownText}\n` : ''}` +
        `✅ Что уже сделано:\n• ${hwStatus.doneText}\n` +
        `⏳ Что ещё осталось:\n• ${hwStatus.leftText}\n\n` +
        `📩 Полный текст, отправленный ученику:\n${rawText}`
      ).catch(() => {});
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && (data.startsWith('student_grammar_rule:') || data === 'student_grammar_rule')) {
    const studentId = data.includes(':') ? data.split(':')[1] : null;
    try {
      let st = null;
      if (studentId) {
        const { data: sData } = await db.from('students').select('*').eq('id', studentId).maybeSingle();
        st = sData;
      }
      if (!st) {
        const sFound = await findStudentByTgChatId(chatId);
        st = sFound?.student;
      }
      if (!st) {
        const pFound = await findParentByTgChatId(chatId);
        st = pFound?.student;
      }
      if (!st) return bot.answerCallbackQuery(query.id, { text: 'Профиль не найден', show_alert: true });

      const actor = resolveStudentActor(st, chatId, query.from);
      await bot.answerCallbackQuery(query.id, { text: `🧩 Загружаю грамматику для ${actor.name}...` });
      const doss = parseStudentDossierBot(st);
      const lastLs = await getLatestLessonWithMaterials(st.id);
      const materialsText = extractAllLessonMaterials(lastLs, st);
      const topic = ((lastLs?.topic || '') + ' ' + (lastLs?._mergedTopic || '') + ' ' + (st.name || '')).toLowerCase();
      const textContent = (materialsText + ' ' + (doss.errors || '')).toLowerCase();

      let ruleTitle = '🧩 Грамматическое правило урока';
      let ruleFocus = 'ключевое правило урока';
      if (topic.includes('местоимен') || topic.includes('pronoun') || topic.includes('whose') || topic.includes('owner') || topic.includes("'s") || textContent.includes('притяжательн')) {
        ruleTitle = '🧩 Чей это питомец? Притяжательные местоимения (my, your, his, her, its, our, their) и правило \'s';
        ruleFocus = 'притяжательные местоимения (my, your, his, her, its, our, their), вопрос Whose is it? и притяжательный падеж \'s (например: Tom\'s dog, Emma\'s cat)';
      } else if (topic.includes('сравнен') || topic.includes('compar')) {
        ruleTitle = '⚡ Степени сравнения прилагательных (Degrees of Comparison)';
        ruleFocus = 'степени сравнения: fast - faster - the fastest, interesting - more interesting - the most interesting';
      } else if (topic.includes('артикл') || topic.includes('article') || topic.includes(' the ')) {
        ruleTitle = '⚡ Артикли (the vs a/an vs без артикля)';
        ruleFocus = 'употребление the с морями, океанами, реками vs Lake без the';
      } else if (topic.includes('shopping') || topic.includes('магазин')) {
        ruleTitle = '🛒 Разговорные фразы в магазине (Shopping phrases)';
        ruleFocus = 'фразы в магазине: How much is...?, Can I have...?, I would like..., try it/them on';
      }

      const prompt = `Ты — добрый, увлекательный преподаватель английского для ${actor.name} (${st.grade || '4-6 класс'}).
Тема урока: "${lastLs?.topic || 'English'}".
Грамматический фокус: ${ruleFocus}.
Материалы урока и сценарий:
"${materialsText.slice(0, 900)}".

ТВОЯ ЗАДАЧА:
1. Объясни это правило максимально просто, понятно и с юмором для школьника (не более 5-6 строк).
2. Дай 3 наглядных примера с разбором:
   1. Пример 1 (вопрос и ответ на английском + перевод на русский)
   2. Пример 2
   3. Пример 3
3. В конце дай 1 мини-задание на самопроверку: "Напиши мне в ответ, как сказать по-английски: [...]"

ПРАВИЛА ОФОРМЛЕНИЯ (СТРОГО):
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать звездочки markdown (** или *)! Никаких звездочек!
- Только чистый текст с эмодзи и отступами!`;

      const genRes = await executeFunctionCall('generate_lesson_plan', { prompt });
      const rawText = genRes.generated_plan || `${ruleTitle}\n\nПовтори материалы урока и составь предложение!`;

      const prog = getPracticeProgress(st.id, lastLs?.id, actor.tagKey);
      prog.completedSteps.grammar = true;
      const hwStatus = getHwCompletionSummary(st, lastLs, chatId, query.from);
      await persistHwProgressPercent(lastLs, hwStatus.pct, actor, st);
      const submitBtnLabel = hwStatus.canSubmit
        ? `✅ Я сделал(а) ДЗ! (Готово ${hwStatus.pct}%)`
        : `🔒 Сдать ДЗ (готово ${hwStatus.pct}% из 75%)`;

      const kb = [
        [{ text: '📝 Пройти тестик по уроку', callback_data: `student_poll_quiz:${st.id}` }],
        [{ text: '🔤 Слова урока', callback_data: `student_words:${st.id}` }],
        [{ text: submitBtnLabel, callback_data: `student_hw_done:${lastLs?.id || ''}` }]
      ];

      const fullGrammarMsg = `${ruleTitle}\n\n${rawText}`;
      await sendCleanMessage(chatId, fullGrammarMsg, { reply_markup: { inline_keyboard: kb } });

      await sendCleanMessage(ADMIN_CHAT_ID,
        `👀 [Копия для преподавателя — ${actor.displayLabel} открыл(а) разбор грамматики]:\n` +
        `📊 Готовность ДЗ: ${hwStatus.pct}% (${hwStatus.canSubmit ? 'Готов к сдаче ✅' : 'Нужно минимум 75% 🔒'})\n` +
        `${hwStatus.groupBreakdownText ? `👥 В группе:\n${hwStatus.groupBreakdownText}\n` : ''}` +
        `✅ Что уже сделано:\n• ${hwStatus.doneText}\n` +
        `⏳ Что ещё осталось:\n• ${hwStatus.leftText}\n\n` +
        `📩 Полный текст объяснения и задания, отправленный ученику:\n${fullGrammarMsg}`
      ).catch(() => {});
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && (data.startsWith('student_poll_quiz:') || data === 'student_poll_quiz')) {
    const studentId = data.includes(':') ? data.split(':')[1] : null;
    try {
      let st = null;
      if (studentId) {
        const { data: sData } = await db.from('students').select('*').eq('id', studentId).maybeSingle();
        st = sData;
      }
      if (!st) {
        const sFound = await findStudentByTgChatId(chatId);
        st = sFound?.student;
      }
      if (!st) {
        const pFound = await findParentByTgChatId(chatId);
        st = pFound?.student;
      }
      if (!st) return bot.answerCallbackQuery(query.id, { text: 'Профиль не найден', show_alert: true });

      const actor = resolveStudentActor(st, chatId, query.from);
      await bot.answerCallbackQuery(query.id, { text: `📝 Создаю мини-тест для ${actor.name}...` });
      const doss = parseStudentDossierBot(st);
      const lastLs = await getLatestLessonWithMaterials(st.id);
      const materialsText = extractAllLessonMaterials(lastLs, st);

      const prog = getPracticeProgress(st.id, lastLs?.id, actor.tagKey);
      prog.quizRound++;

      const pollPrompt = `Ты — методист по английскому для ${actor.name} (${st.grade || 'школьник'}).
СОСТАВЬ ТЕСТ СТРОГО ПО МАТЕРИАЛАМ, СЛОВАРЮ И СЦЕНАРИЮ ЭТОГО УРОКА:
${materialsText || `Тема урока: "${lastLs?.topic || 'English'}"`}
Словарь и ошибки: "${doss.vocab || ''} | ${doss.errors || ''}".
Раунд тестирования: #${prog.quizRound}.

ТВОЯ ЗАДАЧА:
Составь МИНИ-ТЕСТ РОВНО ИЗ 3 РАЗНЫХ ВОПРОСОВ (Telegram Quiz Polls) СТРОГО ПО МАТЕРИАЛАМ УРОКА ВЫШЕ ДЛЯ ЭТОГО УЧЕНИКА:
- Вопрос 1: Новое слово или фраза по теме урока (с контекстным переводом или выбором верного слова).
- Вопрос 2: Главное грамматическое правило этого урока (например: притяжательные местоимения my/his/her/their/'s, если тема про них; или фразы в магазине; или степени сравнения).
- Вопрос 3: Практическая фраза/ситуация по материалам урока.
Каждый новый раунд меняй вопросы, не повторяйся!

Верни СТРОГО валидный JSON массив из 3 объектов без markdown-обертки:
[
  {
    "question": "1/3. Вопрос с пропуском или выбором варианта (до 250 символов)?",
    "options": ["Вариант A", "Вариант B", "Вариант C"],
    "correct_id": 0,
    "explanation": "Объяснение правила на русском (до 200 символов)"
  },
  {
    "question": "2/3. Второй вопрос...?",
    "options": ["Вариант A", "Вариант B", "Вариант C"],
    "correct_id": 1,
    "explanation": "Объяснение правила..."
  },
  {
    "question": "3/3. Третий вопрос...?",
    "options": ["Вариант A", "Вариант B", "Вариант C"],
    "correct_id": 0,
    "explanation": "Объяснение правила..."
  }
]`;

      const genRes = await executeFunctionCall('generate_lesson_plan', { prompt: pollPrompt });
      let quizList = null;
      try {
        const jsonMatch = genRes.generated_plan.match(/\[[\s\S]*\]/);
        if (jsonMatch) quizList = JSON.parse(jsonMatch[0]);
      } catch (err) {}

      if (!Array.isArray(quizList) || quizList.length === 0) {
        const topLow = ((lastLs?.topic || '') + ' ' + (lastLs?._mergedTopic || '') + ' ' + (st.name || '')).toLowerCase();
        if (topLow.includes('местоимен') || topLow.includes('pronoun') || topLow.includes('whose') || topLow.includes('owner') || topLow.includes("'s")) {
          quizList = [
            {
              question: "1/3. Look! This is Tom. It is ___ dog.",
              options: ["his", "her", "their"],
              correct_id: 0,
              explanation: "Tom — мальчик (он/he), поэтому 'его собака' — his dog!"
            },
            {
              question: "2/3. Whose cat is this? — It's ___ cat.",
              options: ["Emma's", "Emmas", "Emma is"],
              correct_id: 0,
              explanation: "Притяжательный падеж образуется с апострофом: Emma's cat (кошка Эммы)!"
            },
            {
              question: "3/3. We love our house. ___ roof is red.",
              options: ["Its", "It's", "Their"],
              correct_id: 0,
              explanation: "Для неодушевленных предметов (house) притяжательное местоимение — Its (его крыша)!"
            }
          ];
        } else if (topLow.includes('shop') || topLow.includes('магазин')) {
          quizList = [
            {
              question: "1/3. ___ is this T-shirt? — It's 15 pounds.",
              options: ["How much", "How many", "How old"],
              correct_id: 0,
              explanation: "О цене спрашиваем: How much is...?"
            },
            {
              question: "2/3. Can I ___ this jacket on, please?",
              options: ["try", "wear", "put"],
              correct_id: 0,
              explanation: "Примерить одежду — try on!"
            },
            {
              question: "3/3. I'd like a kilo ___ apples, please.",
              options: ["of", "to", "for"],
              correct_id: 0,
              explanation: "Килограмм яблок — a kilo of apples!"
            }
          ];
        } else {
          quizList = [
            {
              question: "1/3. Choose the correct form: She ___ her suitcase ten minutes ago.",
              options: ["packed", "has packed", "packs"],
              correct_id: 0,
              explanation: "Ago указывает на точное время в прошлом -> Past Simple (packed)!"
            },
            {
              question: "2/3. He is not at home now. He has ___ to Africa.",
              options: ["gone", "been", "went"],
              correct_id: 0,
              explanation: "Gone to значит 'уехал и сейчас ещё там'! Been to — 'съездил и вернулся'."
            },
            {
              question: "3/3. In Bielaviezhskaja Pushcha there are many wild ___.",
              options: ["wolves", "wolfs", "wolfes"],
              correct_id: 0,
              explanation: "Множественное число от wolf — wolves (f меняется на ves)!"
            }
          ];
        }
      }

      await bot.sendMessage(chatId, `🎯 <b>Мини-тест по уроку для ${actor.name} (Раунд ${prog.quizRound}):</b>\nОтвечай прямо на вопросы викторины ниже 👇`, { parse_mode: 'HTML' });

      const pollSummaryForTeacher = [];
      for (let i = 0; i < quizList.length; i++) {
        const q = quizList[i];
        if (q.options && q.options.length >= 2) {
          const opts = q.options.slice(0, 4);
          const cId = Number(q.correct_id) || 0;
          const sentPoll = await bot.sendPoll(chatId, q.question, opts, {
            type: 'quiz',
            correct_option_id: cId,
            explanation: (q.explanation || 'Молодец!').slice(0, 200),
            is_anonymous: false
          });
          if (sentPoll?.poll?.id) {
            activePolls.set(sentPoll.poll.id, {
              studentId: st.id,
              studentName: st.name,
              actorName: actor.name,
              actorLabel: actor.displayLabel,
              actorTag: actor.tagKey,
              lessonId: lastLs?.id || '',
              chatId: chatId,
              question: q.question,
              options: opts,
              correctId: cId,
              explanation: q.explanation || ''
            });
          }
          pollSummaryForTeacher.push(
            `${q.question}\n   Варианты: ${opts.map((o, idx) => idx === cId ? `[${o} ✅]` : o).join(' / ')}\n   Пояснение бота: ${q.explanation || '—'}`
          );
          if (i < quizList.length - 1) {
            await new Promise(r => setTimeout(r, 400));
          }
        }
      }

      const hwStatus = getHwCompletionSummary(st, lastLs, chatId, query.from);
      await sendCleanMessage(ADMIN_CHAT_ID,
        `👀 [Копия для преподавателя — ${actor.displayLabel} запустил(а) «📝 Тестик по уроку» (Раунд #${prog.quizRound})]:\n` +
        `📚 Тема: ${lastLs?.topic || 'Английский'}\n` +
        `📊 Текущая готовность ДЗ: ${hwStatus.pct}% (ответит на вопросы — получит +25%)\n` +
        `${hwStatus.groupBreakdownText ? `👥 В группе:\n${hwStatus.groupBreakdownText}\n` : ''}\n` +
        `📩 Вопросы, отправленные ученику:\n\n` +
        pollSummaryForTeacher.join('\n\n')
      ).catch(() => {});
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && (data.startsWith('student_game:') || data === 'student_game')) {
    const studentId = data.includes(':') ? data.split(':')[1] : null;
    try {
      let st = null;
      if (studentId) {
        const { data: sData } = await db.from('students').select('*').eq('id', studentId).maybeSingle();
        st = sData;
      }
      if (!st) {
        const sFound = await findStudentByTgChatId(chatId);
        st = sFound?.student;
      }
      if (!st) return bot.answerCallbackQuery(query.id, { text: 'Профиль не найден', show_alert: true });

      const actor = resolveStudentActor(st, chatId, query.from);
      await bot.answerCallbackQuery(query.id, { text: `🎮 Запускаю мини-игру для ${actor.name}...` });
      const doss = parseStudentDossierBot(st);
      const lastLs = await getLatestLessonWithMaterials(st.id);
      const materialsText = extractAllLessonMaterials(lastLs, st);

      const gamePrompt = `Ты — геймифицированный ИИ-тренер английского для ${actor.name} (${st.grade || '6 класс'}).
Интересы: "${doss.interests || 'игры, кино, приключения'}".
МАТЕРИАЛЫ УРОКА, СЛОВА И ТЕМА:
${materialsText || `Слова: "${doss.vocab || 'mystery, puzzle, hero, power'}"`}

Предложи 1 классную 2-минутную игру или загадку на английском языке (Word Detective или English Riddle) СТРОГО С ИСПОЛЬЗОВАНИЕМ СЛОВ ИЛИ ТЕМЫ УРОКА ВЫШЕ.
Короткий сюжет (3-4 строки) + загадка на английском с переводом ключевых слов.
НЕ пиши ответ сразу! Напиши: "Напиши свою отгадку сюда в чат, и проверим!"

ПРАВИЛА ОФОРМЛЕНИЯ (СТРОГО):
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать звездочки markdown (** или *)! Никаких звездочек в тексте!
- Оформляй заголовок эмодзи, списки через дефис или точку •`;

      const genRes = await executeFunctionCall('generate_lesson_plan', { prompt: gamePrompt });
      const text = genRes.generated_plan || '🎮 English Riddle Time!\nWhat has keys but no locks, space but no room, and you can enter but never go outside?\n(Напиши свою догадку в ответном сообщении!)';

      const prog = getPracticeProgress(st.id, lastLs?.id, actor.tagKey);
      prog.completedSteps.grammar = true;
      const hwStatus = getHwCompletionSummary(st, lastLs, chatId, query.from);
      await persistHwProgressPercent(lastLs, hwStatus.pct, actor, st);

      await sendCleanMessage(chatId, `🎮 <b>Мини-игра для ${actor.name}:</b>\n\n${text}`, {
        reply_markup: buildStudentKeyboard(st, lastLs, chatId)
      });

      await sendCleanMessage(ADMIN_CHAT_ID,
        `👀 [Копия для преподавателя — ${actor.displayLabel} запустил(а) «🎮 Мини-игру»]:\n` +
        `📊 Готовность ДЗ: ${hwStatus.pct}% (${hwStatus.canSubmit ? 'Готов к сдаче ✅' : 'Нужно минимум 75% 🔒'})\n` +
        `${hwStatus.groupBreakdownText ? `👥 В группе:\n${hwStatus.groupBreakdownText}\n` : ''}` +
        `✅ Что уже сделано:\n• ${hwStatus.doneText}\n` +
        `⏳ Что ещё осталось:\n• ${hwStatus.leftText}\n\n` +
        `📩 Полный текст игры, отправленный ученику:\n${text}`
      ).catch(() => {});
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && (data.startsWith('student_flashcards:') || data.startsWith('flip_card:') || data.startsWith('card_known:'))) {
    const parts = data.split(':');
    const action = parts[0];
    const studentId = parts[1];
    let idx = parseInt(parts[2] || '0', 10);
    try {
      let st = null;
      if (studentId) {
        const { data: sData } = await db.from('students').select('*').eq('id', studentId).maybeSingle();
        st = sData;
      }
      if (!st) {
        const sFound = await findStudentByTgChatId(chatId);
        st = sFound?.student;
      }
      if (!st) return bot.answerCallbackQuery(query.id, { text: 'Профиль не найден', show_alert: true });

      const actor = resolveStudentActor(st, chatId, query.from);
      const lastLs = await getLatestLessonWithMaterials(st.id);
      const doss = parseStudentDossierBot(st);
      const materialsText = extractAllLessonMaterials(lastLs, st);
      const cards = getLessonFlashcards(materialsText, lastLs?.homework || '', lastLs?._mergedTopic || lastLs?.topic || '', doss.vocab || '');
      if (idx >= cards.length) idx = 0;
      if (idx < 0) idx = 0;
      const c = cards[idx];
      const prog = getPracticeProgress(st.id, lastLs?.id, actor.tagKey);

      if (action === 'card_known') {
        prog.cardsKnown = (prog.cardsKnown || 0) + 1;
        if (prog.cardsKnown >= 2) {
          prog.completedSteps.words = true;
        }
        const hwStatus = getHwCompletionSummary(st, lastLs, chatId, query.from);
        await persistHwProgressPercent(lastLs, hwStatus.pct, actor, st);
        await incrementStudentStreakBot(st);
        const userName = actor.name || query.from?.first_name || 'Ученик';
        const totalXp = addStudentXp(st.id, lastLs?.id, query.from?.id, userName, 5);
        await bot.answerCallbackQuery(query.id, { text: `🎉 Отлично, ${userName}! +5 XP (Готовность ДЗ: ${hwStatus.pct}%)!` });
        if (c) {
          await sendCleanMessage(ADMIN_CHAT_ID,
            `🃏 [Копия для преподавателя — ${actor.displayLabel} (${userName}) нажал(а) «✅ Знал(а) карточку»]:\n` +
            `🇬🇧 Слово: ${c.en} ${c.ipa || ''} — ${c.ru}\n` +
            `${c.ex ? `💡 Пример: ${c.ex}\n` : ''}` +
            `⭐ Опыт: +5 XP (Всего: ${totalXp} XP)\n` +
            `📊 Готовность ДЗ: ${hwStatus.pct}% (${hwStatus.canSubmit ? 'Готов к сдаче ✅' : 'Нужно минимум 75% 🔒'})\n` +
            `${hwStatus.groupBreakdownText ? `👥 В группе:\n${hwStatus.groupBreakdownText}\n` : ''}` +
            `✅ Сделано:\n• ${hwStatus.doneText}\n` +
            `⏳ Осталось:\n• ${hwStatus.leftText}`
          ).catch(() => {});
        }
      } else {
        await bot.answerCallbackQuery(query.id);
      }

      const hwStatusNow = getHwCompletionSummary(st, lastLs, chatId, query.from);
      const submitBtnLabel = hwStatusNow.canSubmit
        ? `✅ Я сделал(а) ДЗ! (Готово ${hwStatusNow.pct}%)`
        : `🔒 Сдать ДЗ (готово ${hwStatusNow.pct}% из 75%)`;

      if (action === 'flip_card') {
        const cardHtml = `🃏 <b>Флеш-карточка ${idx + 1} из ${cards.length}:</b>\n\n🇬🇧 <b>${c.en}</b> ${c.ipa || ''}\n\n🇷🇺 <b>Перевод:</b> ${c.ru}\n${c.ex ? `💡 <i>Пример: ${c.ex}</i>` : ''}`;
        const kb = [
          [
            { text: '✅ Знал(а)! (+5 XP)', callback_data: `card_known:${st.id}:${(idx + 1) % cards.length}` },
            { text: '🔄 Повторить позже', callback_data: `student_flashcards:${st.id}:${(idx + 1) % cards.length}` }
          ],
          [
            { text: '🔊 Озвучить слово', callback_data: `say_word:${st.id}:${encodeURIComponent(c.en)}` },
            { text: '🔤 5 слов урока', callback_data: `student_words:${st.id}` }
          ],
          [{ text: submitBtnLabel, callback_data: `student_hw_done:${lastLs?.id || ''}` }]
        ];
        if (query.message) {
          await bot.editMessageText(cardHtml, {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: kb }
          }).catch(() => {
            return sendCleanMessage(chatId, cardHtml, { reply_markup: { inline_keyboard: kb } });
          });
        } else {
          await sendCleanMessage(chatId, cardHtml, { reply_markup: { inline_keyboard: kb } });
        }
      } else {
        // Show front of card
        const cardHtml = `🃏 <b>Флеш-карточка ${idx + 1} из ${cards.length}:</b>\n\n🇬🇧 <b>${c.en}</b> ${c.ipa || ''}\n\n<i>Вспомни перевод про себя, а затем нажми кнопку ниже!</i> 👇`;
        const kb = [
          [{ text: '👀 Перевернуть карточку', callback_data: `flip_card:${st.id}:${idx}` }],
          [
            { text: '➡️ Следующая', callback_data: `student_flashcards:${st.id}:${(idx + 1) % cards.length}` },
            { text: '🔤 5 слов урока', callback_data: `student_words:${st.id}` }
          ],
          [{ text: submitBtnLabel, callback_data: `student_hw_done:${lastLs?.id || ''}` }]
        ];
        if (query.message && action !== 'card_known') {
          await bot.editMessageText(cardHtml, {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: kb }
          }).catch(() => {
            return sendCleanMessage(chatId, cardHtml, { reply_markup: { inline_keyboard: kb } });
          });
        } else {
          await sendCleanMessage(chatId, cardHtml, { reply_markup: { inline_keyboard: kb } });
        }
      }
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && data.startsWith('say_word:')) {
    const parts = data.split(':');
    const word = decodeURIComponent(parts[2] || '');
    await bot.answerCallbackQuery(query.id, { text: `🔊 Озвучиваю: ${word}` });
    await sendTtsAudio(chatId, word, word, `🔊 Произношение: ${word}`);
  } else if (data && (data.startsWith('student_vocab_bank:') || data === 'student_vocab_bank')) {
    const studentId = data.includes(':') ? data.split(':')[1] : null;
    try {
      let st = null;
      if (studentId) {
        const { data: sData } = await db.from('students').select('*').eq('id', studentId).maybeSingle();
        st = sData;
      }
      if (!st) {
        const sFound = await findStudentByTgChatId(chatId);
        st = sFound?.student;
      }
      if (!st) {
        const pFound = await findParentByTgChatId(chatId);
        st = pFound?.student;
      }
      if (!st) return bot.answerCallbackQuery(query.id, { text: 'Профиль не найден', show_alert: true });

      const actor = resolveStudentActor(st, chatId, query.from);
      const streakInfo = await recordStudentDailyActivity(st, actor);

      await bot.answerCallbackQuery(query.id, { text: `📚 Открываю словарик ${actor.name}...` });
      const bank = await getStudentVocabularyBank(st);

      let text = `📚 *ПЕРСОНАЛЬНЫЙ СЛОВАРЬ: ${actor.name.toUpperCase()}*\n`;
      text += `🔥 Ударный режим: *${streakInfo.streak} дн. подряд* ${streakInfo.alreadyActiveToday ? '✅' : '⚡'}\n`;
      text += `🎯 Всего слов в копилке: *${bank.length}*\n\n`;

      if (bank.length === 0) {
        text += `_Словарик пока формируется. Слова с твоих уроков и карточек будут автоматически сохраняться сюда!_\n\n`;
      } else {
        text += `*Слова из твоих последних занятий:*\n`;
        const slice = bank.slice(0, 12);
        slice.forEach((item, i) => {
          const ipaPart = item.ipa ? ` [${item.ipa}]` : '';
          const trPart = item.translation ? ` — ${item.translation}` : '';
          text += `${i + 1}. *${item.word}*${ipaPart}${trPart}\n`;
        });
        if (bank.length > 12) {
          text += `_...и ещё ${bank.length - 12} слов в твоей базе!_\n`;
        }
        text += `\n💡 _Совет: тренируй слова во флеш-карточках каждый день, чтобы поддерживать огонёк 🔥!_`;
      }

      const kb = [
        [{ text: '🃏 Тренировать флеш-карточки', callback_data: `student_flashcards:${st.id}:0` }],
        [{ text: '📝 Тестик по словам', callback_data: `student_poll_quiz:${st.id}` }],
        [{ text: '🔤 5 новых слов урока', callback_data: `student_words:${st.id}` }],
        [{ text: '🔥 Мой ударный режим (Streak)', callback_data: `student_streak_info:${st.id}` }]
      ];

      await sendCleanMessage(chatId, text, { reply_markup: { inline_keyboard: kb } });
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && (data.startsWith('student_streak_info:') || data === 'student_streak_info')) {
    const studentId = data.includes(':') ? data.split(':')[1] : null;
    try {
      let st = null;
      if (studentId) {
        const { data: sData } = await db.from('students').select('*').eq('id', studentId).maybeSingle();
        st = sData;
      }
      if (!st) {
        const sFound = await findStudentByTgChatId(chatId);
        st = sFound?.student;
      }
      if (!st) return bot.answerCallbackQuery(query.id, { text: 'Профиль не найден', show_alert: true });

      const actor = resolveStudentActor(st, chatId, query.from);
      const streakInfo = await recordStudentDailyActivity(st, actor);

      await bot.answerCallbackQuery(query.id, { text: `🔥 Стрик: ${streakInfo.streak} дн.` });

      let text = `🔥 *УДАРНЫЙ РЕЖИМ (STREAK): ${actor.name.toUpperCase()}* 🔥\n\n`;
      text += `🏆 Твоя серия активности: *${streakInfo.streak} дней подряд*!\n`;
      text += `⚡ Статус на сегодня: *${streakInfo.alreadyActiveToday ? '✅ Огонёк уже горит и защищён!' : '🔥 Огонёк активен!'}*\n\n`;
      text += `💡 *Как работает ударный режим Duolingo:*\n`;
      text += `• Заходи в бот каждый день хотя бы на 1 минуту.\n`;
      text += `• Повторяй слова, листай флеш-карточки или проходи тестик.\n`;
      text += `• Если пропустить день — серия может сгореть в полночь 😱\n\n`;
      text += `👇 Закрепи свой результат на сегодня:`;

      const kb = [
        [{ text: '📚 Открыть мой словарик', callback_data: `student_vocab_bank:${st.id}` }],
        [{ text: '🃏 Флеш-карточки со словами', callback_data: `student_flashcards:${st.id}:0` }],
        [{ text: '📝 Пройти мини-тестик', callback_data: `student_poll_quiz:${st.id}` }]
      ];

      await sendCleanMessage(chatId, text, { reply_markup: { inline_keyboard: kb } });
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && data.startsWith('send_parsed_rep:')) {
    const parts = data.split(':');
    const stId = parts[1];
    try {
      const { data: st } = await db.from('students').select('*').eq('id', stId).maybeSingle();
      if (!st) return bot.answerCallbackQuery(query.id, { text: 'Ученик не найден', show_alert: true });
      const doss = parseStudentDossierBot(st);
      if (!doss.parentTgId) {
        return bot.answerCallbackQuery(query.id, { text: 'Родитель ещё не подключён к боту!', show_alert: true });
      }
      await bot.answerCallbackQuery(query.id, { text: '👨‍👩‍👧 Отправляю отчёт родителю...' });
      const repText = query.message?.text || '';
      const repMatch = repText.match(/👨‍👩‍👧 *Отчёт для родителей:*\n([sS]*)/);
      const toSend = repMatch ? repMatch[1].trim() : repText;

      await bot.sendMessage(doss.parentTgId, toSend, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📚 Посмотреть текущее ДЗ ребёнка', callback_data: `parent_view_hw:${st.id}` }]
          ]
        }
      }).catch(() => bot.sendMessage(doss.parentTgId, toSend));

      await bot.sendMessage(chatId, `✅ Отчёт успешно доставлен родителю ученика *${st.name}* в Telegram!`, { parse_mode: 'Markdown' });
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }

  } else if (data === 'student_quiz') {
    try {
      const pFound = await findParentByTgChatId(chatId);
      if (pFound) {
        return bot.sendMessage(chatId, `Здравствуйте! 👋 Вы находитесь в режиме *Родителя* ученика *${pFound.student.name}*. Используйте кнопки дневника для родителей:`, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📊 Запросить свежий отчёт об успеваемости', callback_data: `parent_req_report:${pFound.student.id}` }],
              [{ text: '📚 Посмотреть текущее ДЗ ребёнка', callback_data: `parent_view_hw:${pFound.student.id}` }]
            ]
          }
        });
      }
      const found = await findStudentByTgChatId(chatId);
      if (!found) return bot.answerCallbackQuery(query.id, { text: 'Профиль ученика не найден', show_alert: true });
      const st = found.student;
      const doss = found.dossier;
      await bot.answerCallbackQuery(query.id, { text: '🎯 Готовлю персональный мини-квиз...' });
      const lastLs = await getLatestLessonWithMaterials(st.id);
      const quizPrompt = `Ты — дружелюбный игровой ИИ-тренер по английскому для ученика ${st.name} (${st.grade || ''}).\nСловарь ученика: ${doss.vocab || 'общая лексика по уровню'}.\nТипичные ошибки: ${doss.errors || 'грамматика времени'}.\nИнтересы: ${doss.interests || 'игры, фильмы, путешествия'}.\nПоследняя тема: ${lastLs?.topic || 'English practice'}.\n\nСоставь КОМПАКТНЫЙ (до 800 символов) увлекательный мини-квиз из 3 коротких вопросов (1: выбрать правильный вариант A/B/C, 2: вставить пропущенное слово в предложение по интересам ученика, 3: перевести короткую фразу на английский). НЕ пиши ответы сразу! Скажи ученику: "Напиши ответы 1, 2, 3 в ответном сообщении (или скажи голосом!), и я сразу проверю!"`;
      const planRes = await executeFunctionCall('generate_lesson_plan', { prompt: quizPrompt });
      const quizText = planRes.generated_plan || '1. Choose: I (was/were) happy yesterday.\n2. Translate: Я люблю путешествовать.\n3. Make a sentence with your favourite hobby!';
      activeStudentQuizzes.set(String(chatId), { quizText, studentName: st.name, studentId: st.id, lessonId: lastLs?.id || '' });
      await bot.sendMessage(chatId, `🎯 *Мини-тренажёр слов (${st.name}):*\n\n${quizText}`, { parse_mode: 'Markdown' }).catch(() => bot.sendMessage(chatId, quizText));
      await sendCleanMessage(ADMIN_CHAT_ID, `👀 [Копия для преподавателя — ${st.name} открыл(а) «🎯 Мини-тренажёр слов»]:\n\n${quizText}`).catch(() => {});
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && data.startsWith('student_school_hw:')) {
    const studentId = data.split(':')[1];
    try {
      let st = null;
      if (studentId) {
        const { data: sData } = await db.from('students').select('*').eq('id', studentId).maybeSingle();
        st = sData;
      }
      if (!st) {
        const found = await findStudentByTgChatId(chatId);
        st = found?.student;
      }
      if (!st) return bot.answerCallbackQuery(query.id, { text: 'Профиль не найден', show_alert: true });
      const studentName = query.from?.first_name || st.name;
      activeSchoolHwRequests.set(String(chatId), { studentId: st.id, studentName, timestamp: Date.now() });
      await bot.answerCallbackQuery(query.id, { text: '🎒 Жду фото или текст задания!' });
      const promptMsg = `🎒 *Помощь со школьным ДЗ (${studentName}):*\n\nСфотографируй страницу учебника или тетради (или напиши текст упражнения) прямо сюда в чат 📸✏️.\n\nЯ отправлю его Игорю, и как только он подтвердит — подробно разберу для тебя правила и помогу всё понять!`;
      await bot.sendMessage(chatId, promptMsg, { parse_mode: 'Markdown' });
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && (data.startsWith('approve_shw:') || data.startsWith('reject_shw:') || data.startsWith('defer_shw:'))) {
    const parts = data.split(':');
    const action = parts[0];
    const reqId = parts[1];
    const req = pendingSchoolHwApprovals.get(reqId);
    if (!req) return bot.answerCallbackQuery(query.id, { text: 'Запрос устарел или уже обработан', show_alert: true });
    pendingSchoolHwApprovals.delete(reqId);

    if (action === 'reject_shw') {
      await bot.answerCallbackQuery(query.id, { text: '❌ Отклонено' });
      await bot.editMessageReplyMarkup({ inline_keyboard: [[{ text: '❌ Отклонено (решать самостоятельно)', callback_data: 'noop' }]] }, { chat_id: chatId, message_id: query.message.message_id }).catch(() => {});
      await bot.sendMessage(req.chatId, `💡 *Привет, ${req.studentName}!* Игорь посмотрел твоё школьное задание и предлагает сначала попробовать решить его самостоятельно по правилам в тетрадке. Попробуй сам(а), а если останутся вопросы — запиши их, и мы разберём их на уроке! 💪`, { parse_mode: 'Markdown' }).catch(() => {});
      return;
    }

    if (action === 'defer_shw') {
      await bot.answerCallbackQuery(query.id, { text: '👨‍🏫 Разберём на уроке' });
      await bot.editMessageReplyMarkup({ inline_keyboard: [[{ text: '👨‍🏫 Перенесено на урок', callback_data: 'noop' }]] }, { chat_id: chatId, message_id: query.message.message_id }).catch(() => {});
      await bot.sendMessage(req.chatId, `📌 *Отличный вопрос, ${req.studentName}!* Игорь посмотрел задание — тема важная, поэтому мы подробно разберём её прямо на нашем уроке! 👍`, { parse_mode: 'Markdown' }).catch(() => {});
      return;
    }

    if (action === 'approve_shw') {
      await bot.answerCallbackQuery(query.id, { text: '✅ Одобрено! Генерирую разбор правил...' });
      await bot.editMessageReplyMarkup({ inline_keyboard: [[{ text: '✅ Одобрено (ИИ объяснил правила)', callback_data: 'noop' }]] }, { chat_id: chatId, message_id: query.message.message_id }).catch(() => {});

      const explainPrompt = `Ты — добрый, понятный и первоклассный преподаватель английского языка для ученика ${req.studentName} (${req.student.grade || '6 класс'}).
Ученик попросил помочь со ШКОЛЬНЫМ домашним заданием.
Преподаватель Игорь посмотрел задание и разрешил объяснить.
ЗАДАНИЕ УЧЕНИКА:
"${req.text || req.caption || 'Школьное упражнение'}"

ТВОЯ ЗАДАЧА:
Объясни ученику всё максимально наглядно, просто и поддерживающе:
1. 💡 В чём суть задания и перевод (если есть незнакомые слова).
2. 📖 Правило простыми словами (на русском): формулы, подсказки-маркеры (почему именно это время/форма/артикль, а не другое).
3. ✏️ Пошаговый разбор и готовое решение каждого пункта с кратким объяснением в скобках.
4. 🎯 Лайфхак или совет, как легко запомнить это правило.

Пиши дружелюбно (обращайся на "ты"), без сложных академических терминов, используй эмодзи для наглядности.
КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать звездочки markdown (** или *)! Пиши чистый текст без звездочек!`;

      const planRes = await executeFunctionCall('generate_lesson_plan', { prompt: explainPrompt });
      const explanation = planRes.generated_plan || 'Не удалось составить разбор.';

      const studentMsg = `🎓 *Игорь одобрил разбор твоего школьного задания!* 🌟\n\n${explanation}\n\n_Если что-то осталось непонятным — напиши мне, разберём подробнее!_ 💪`;
      await sendCleanMessage(req.chatId, studentMsg);

      const adminCopy = `👀 *[Копия ответа ученику ${req.studentName} по школьному ДЗ]:*\n\n${explanation}`;
      await sendCleanMessage(ADMIN_CHAT_ID, adminCopy);
      return;
    }
  } else if (data === 'student_my_hw') {
    try {
      const pFound = await findParentByTgChatId(chatId);
      if (pFound) {
        return bot.sendMessage(chatId, `Здравствуйте! 👋 Вы находитесь в режиме *Родителя* ученика *${pFound.student.name}*. Используйте кнопки дневника для родителей:`, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📊 Запросить свежий отчёт об успеваемости', callback_data: `parent_req_report:${pFound.student.id}` }],
              [{ text: '📚 Посмотреть текущее ДЗ ребёнка', callback_data: `parent_view_hw:${pFound.student.id}` }]
            ]
          }
        });
      }
      const found = await findStudentByTgChatId(chatId);
      if (!found) {
        return bot.answerCallbackQuery(query.id, { text: 'Профиль ученика не найден', show_alert: true });
      }
      const st = found.student;
      const lastLs = await getLatestLessonWithMaterials(st.id);
      await bot.answerCallbackQuery(query.id, { text: '📚 Загружаю домашнее задание...' });
      if (!lastLs || !lastLs.homework) {
        return bot.sendMessage(chatId, `🎉 *${st.name}*, сейчас активного домашнего задания нет! Отдыхай или повтори слова прошлых уроков 🇬🇧`, { parse_mode: 'Markdown' });
      }
      await sendHomeworkToStudentBot(st, lastLs, false);
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
    } else if (data && data.startsWith('student_hw_done:')) {
    const lessonId = data.split(':')[1];
    try {
      let ls = null;
      if (lessonId) {
        const { data: lsRow } = await db.from('lessons').select('*, students(*)').eq('id', lessonId).maybeSingle();
        ls = lsRow;
      }
      let st = ls?.students;
      if (!st) {
        const sFound = await findStudentByTgChatId(chatId);
        st = sFound?.student;
        if (st && !ls) ls = await getLatestLessonWithMaterials(st.id);
      }
      const stName = st?.name || 'Ученик';
      const isAlreadySubmitted = (ls?.homework || '').includes('[ДЗ_СДАНО]') || (ls?.homework || '').includes('[ДЗ_ПРОВЕРЕНО]');

      if (isAlreadySubmitted) {
        await bot.answerCallbackQuery(query.id, { text: '✅ Твоё ДЗ уже принято и находится на контроле!' });
        return bot.sendMessage(chatId, `👍 *Отлично, ${stName}!* Твоё задание уже отправлено на проверку Игорю. Если хочешь прислать ещё фото или дополнение — просто отправь прямо сюда в чат!`, { parse_mode: 'Markdown' });
      }

      const actor = resolveStudentActor(st, chatId, query.from);
      const hwStatus = getHwCompletionSummary(st, ls, chatId, query.from);
      const actorLabel = actor.shortName || st?.name || 'Ученик';

      // 75% GATE: Кнопка сдачи ДЗ срабатывает ТОЛЬКО если выполнено >= 75% (либо письменное задание, либо все интерактивные карточки/тесты)
      if (!hwStatus.canSubmit) {
        await bot.answerCallbackQuery(query.id, {
          text: `🔒 Пока выполнено ${hwStatus.pct}% из 75%! Доделай письменное задание или карточки ниже.`,
          show_alert: true
        });

        const gateMsg = `🔒 *Кнопка сдачи ДЗ пока закрыта (${actorLabel}) — выполнено ${hwStatus.pct}% из 75%*\n\n` +
          `Чтобы сдать домашнее задание, нужно набрать минимум *75%*:\n\n` +
          `✅ *Что ты уже сделал(а):*\n• ${hwStatus.doneText}\n\n` +
          `⏳ *Что осталось сделать (выбери любой путь):*\n` +
          `1️⃣ *Быстрый путь (даёт сразу +75%):* Пришли сюда в чат 📸 *фото тетрадки* или 💬 *напиши ответы на письменное задание текстом*!\n` +
          `2️⃣ *Интерактивный путь (по кнопкам ниже):*\n• ${hwStatus.leftText}\n\n` +
          `👇 Нажми на кнопки ниже или пришли свой ответ в чат — и кнопка сдачи сразу откроется! 🚀`;

        const kbMarkup = st ? buildStudentKeyboard(st, ls, chatId) : undefined;
        await bot.sendMessage(chatId, gateMsg, { parse_mode: 'Markdown', reply_markup: kbMarkup }).catch(() => bot.sendMessage(chatId, gateMsg));

        const groupExtra = hwStatus.groupBreakdownText ? `\n\n${hwStatus.groupBreakdownText}` : '';
        await sendCleanMessage(ADMIN_CHAT_ID,
          `🔒 [Контроль 75% ДЗ] ${actor.displayLabel} нажал(а) кнопку «Сдать ДЗ», но пока набрано ${hwStatus.pct}% (нужно минимум 75%).\n` +
          `Бот заблокировал преждевременную сдачу и показал ученику чек-лист:\n` +
          `✅ Сделано:\n• ${hwStatus.doneText}\n` +
          `⏳ Осталось:\n• ${hwStatus.leftText}${groupExtra}`
        ).catch(() => {});
        return;
      }

      // Если ученик набрал >= 75% (прошёл все карточки/тесты или прислал письменное) -> засчитываем сдачу ДЗ!
      const newStreak = st ? await incrementStudentStreakBot(st) : 1;
      if (ls) {
        let updatedHw = ls.homework || '';
        const tag = actor.tagKey ? `[ДЗ_СДАНО_${actor.tagKey}]` : '[ДЗ_СДАНО]';
        if (!updatedHw.includes(tag) && !updatedHw.includes('[ДЗ_ПРОВЕРЕНО]')) {
          updatedHw = `${tag} ${updatedHw}`.trim();
          ls.homework = updatedHw;
          await db.from('lessons').update({ homework: updatedHw }).eq('id', ls.id);
        }
      }

      await bot.answerCallbackQuery(query.id, { text: `🎉 Ура! ДЗ (${hwStatus.pct}%) официально сдано!` });

      const congratsMsg = `🎉 *Ура, ${actorLabel}! Твоё домашнее задание выполнено на ${hwStatus.pct}% и официально принято!* ✅\n\n` +
        `✅ *Выполнено:*\n• ${hwStatus.doneText}\n\n` +
        `🔥 *Твой ударный режим (Streak): ${newStreak} ДЗ подряд! (+15 XP)* 🏆\n` +
        `Я уже передал твой отчёт Игорю. Если захочешь прислать ещё фото тетрадки или спросить что-то по теме — пиши прямо сюда!`;

      await bot.sendMessage(chatId, congratsMsg, { parse_mode: 'Markdown' }).catch(() => bot.sendMessage(chatId, congratsMsg));

      const teacherDoneKb = [];
      if (ls?.id) teacherDoneKb.push([{ text: '✅ Отметить ДЗ проверенным', callback_data: `lesson_hw_checked:${ls.id}` }]);
      if (st?.id) teacherDoneKb.push([{ text: `🎤 Ответить ученику (${actorLabel})`, callback_data: `teacher_reply_st:${st.id}` }]);

      const groupExtra = hwStatus.groupBreakdownText ? `\n\n${hwStatus.groupBreakdownText}` : '';
      await sendCleanMessage(ADMIN_CHAT_ID,
        `🎉 [ДЗ СДАНО ≥75%] ${actor.displayLabel} набрал(а) ${hwStatus.pct}% и нажал(а) «✅ Я сделал(а) ДЗ!» (Стрик: 🔥 ${newStreak})\n\n` +
        `✅ Что выполнено учеником:\n• ${hwStatus.doneText}\n\n` +
        `⏳ Что не сделано / осталось:\n• ${hwStatus.leftText}${groupExtra}`,
        { reply_markup: teacherDoneKb.length ? { inline_keyboard: teacherDoneKb } : undefined }
      ).catch(() => {});
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && data.startsWith('teacher_invite_st:')) {
    const studentId = data.split(':')[1];
    try {
      const { data: st } = await db.from('students').select('*').eq('id', studentId).maybeSingle();
      if (!st) return bot.answerCallbackQuery(query.id, { text: 'Ученик не найден', show_alert: true });
      const botUser = BOT_USERNAME || (await bot.getMe().then(m => m.username).catch(() => ''));
      const link = `https://t.me/${botUser}?start=st_${st.id}`;
      const doss = parseStudentDossierBot(st);
      await bot.answerCallbackQuery(query.id, { text: '🔗 Ссылка привязки готова!' });
      const statusLine = doss.tgId ? `🟢 *Статус:* Уже подключён (${doss.tgUser || 'ID ' + doss.tgId})\n\n` : `⚪ *Статус:* Ещё не подключён к боту\n\n`;
      const msg = `🔗 *Привязка Telegram для ученика: ${st.name}*\n${statusLine}Перешли ученику это сообщение (или саму ссылку):\n\n\`\`\`\nПривет! Подключись, пожалуйста, к моему боту по английскому языку (нажми Start / Запустить) — туда будет приходить домашка, слова урока и напоминалки:\n${link}\n\`\`\``;
      await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' }).catch(() => bot.sendMessage(chatId, link));
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && data.startsWith('teacher_send_hw:')) {
    const lessonId = data.split(':')[1];
    try {
      const { data: ls } = await db.from('lessons').select('*, students(*)').eq('id', lessonId).maybeSingle();
      const st = ls?.students;
      if (!st) return bot.answerCallbackQuery(query.id, { text: 'Ученик не найден', show_alert: true });
      const doss = parseStudentDossierBot(st);
      if (!doss.tgId) {
        const botUser = BOT_USERNAME || (await bot.getMe().then(m => m.username).catch(() => ''));
        const link = `https://t.me/${botUser}?start=st_${st.id}`;
        await bot.answerCallbackQuery(query.id, { text: 'Ученик ещё не привязан к боту!' });
        return bot.sendMessage(chatId, `⚠️ *${st.name}* ещё не нажал(а) Start в боте.\nСкинь ученику эту ссылку один раз:\n\`${link}\``, { parse_mode: 'Markdown' });
      }
      let targetLesson = ls;
      if (!targetLesson.homework) {
        const { data: prev } = await db.from('lessons').select('*').eq('student_id', st.id).eq('status', 'Проведен').order('date', { ascending: false }).limit(1).maybeSingle();
        if (prev && prev.homework) targetLesson = prev;
      }
      if (!targetLesson || !targetLesson.homework) {
        return bot.answerCallbackQuery(query.id, { text: 'У ученика пока не записано ДЗ!', show_alert: true });
      }
      const nextDateStr = ls.status === 'Запланирован' ? new Date(ls.date).toLocaleString('ru-RU', { timeZone: 'Europe/Minsk', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
      const sendRes = await sendHomeworkToStudentBot(st, targetLesson, true, nextDateStr);
      if (sendRes.sent) {
        await bot.answerCallbackQuery(query.id, { text: `📨 ДЗ отправлено ${st.name}!` });
        await bot.sendMessage(chatId, `📨 Напоминание с домашним заданием успешно отправлено в личку *${st.name}*!`, { parse_mode: 'Markdown' });
      } else {
        await bot.answerCallbackQuery(query.id, { text: 'Ошибка отправки: ' + sendRes.reason, show_alert: true });
      }
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && data.startsWith('lesson_hw_checked:')) {
    const prevId = data.split(':')[1];
    try {
      const { data: prevLs } = await db.from('lessons').select('*').eq('id', prevId).maybeSingle();
      if (prevLs && !(prevLs.homework || '').includes('[ДЗ_ПРОВЕРЕНО]')) {
        await db.from('lessons').update({ homework: `[ДЗ_ПРОВЕРЕНО] ${prevLs.homework || ''}`.trim() }).eq('id', prevId);
      }
      await bot.answerCallbackQuery(query.id, { text: '✅ ДЗ отмечено проверенным!' });
      await bot.sendMessage(chatId, '✅ Домашнее задание отмечено как проверенное!');
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && data.startsWith('lesson_prep:')) {
    const lessonId = data.split(':')[1];
    try {
      await bot.answerCallbackQuery(query.id, { text: '🎲 Готовлю разминку и блиц-опрос по ДЗ...' });
      const { data: ls } = await db.from('lessons').select('*, students(*)').eq('id', lessonId).maybeSingle();
      const st = ls?.students;
      const doss = parseStudentDossierBot(st);
      const hwWarmupErrors = extractHwWarmupErrorsFromDossier(doss);
      const { data: prevList } = await db.from('lessons').select('*').eq('student_id', ls?.student_id).eq('status', 'Проведен').order('date', { ascending: false }).limit(1);
      const prev = prevList?.[0];
      const prompt = `Ученик: ${st?.name || 'Ученик'} (${st?.grade || ''}). Интересы: ${doss.interests || 'не указаны'}. Слабые места: ${doss.errors || 'не указаны'}.
Ошибки ученика в последнем сданном ДЗ в Telegram: "${hwWarmupErrors || 'нет записей'}".
Прошлая тема: "${prev?.topic || 'не указана'}", Прошлое ДЗ: "${prev?.homework || 'не было'}". Тема сегодня: "${ls?.topic || 'Продолжение'}".
Составь КОМПАКТНО (до 1500 символов):
1) 🎯 Работа над ошибками из ДЗ (2–3 конкретных примера именно по тем местам, где ученик ошибся в домашке, с правильными ответами в скобках)
2) 🎲 5-минутная разминка (Warm-up: 3 живых вопроса на говорение с учётом интересов и прошлой темы)
3) 🔍 Блиц-проверка прошлого правила (3 коротких предложения на перевод сходу с ответами в скобках).`;
      const planRes = await executeFunctionCall('generate_lesson_plan', { prompt });
      const fullPlanText = `🇬🇧 *Шпаргалка к уроку (${st?.name || 'Ученик'}):*\n\n${planRes.generated_plan || 'Готово'}`;
      const chunks = fullPlanText.match(/[\s\S]{1,3500}/g) || [fullPlanText];
      for (const ch of chunks) {
        await bot.sendMessage(chatId, ch, { parse_mode: 'Markdown' }).catch(() => bot.sendMessage(chatId, ch));
      }
      if (false) {
      const planRes = await executeFunctionCall('generate_lesson_plan', { prompt });
      await bot.sendMessage(chatId, `🇬🇧 *Шпаргалка к уроку (${st?.name || 'Ученик'}):*\n\n${planRes.generated_plan || 'Готово'}`, { parse_mode: 'Markdown' }).catch(() => bot.sendMessage(chatId, planRes.generated_plan || 'Готово')); }
    } catch (e) {
      bot.sendMessage(chatId, '❌ Ошибка подготовки урока: ' + e.message);
    }
  } else if (data && data.startsWith('lesson_perplexity:')) {
    const lessonId = data.split(':')[1];
    try {
      await bot.answerCallbackQuery(query.id, { text: '🔮 Собираю промпт для Perplexity Space...' });
      const { data: ls } = await db.from('lessons').select('*, students(*)').eq('id', lessonId).maybeSingle();
      const st = ls?.students || { name: 'Ученик', grade: '' };
      const doss = parseStudentDossierBot(st);
      const { data: condList } = await db.from('lessons').select('*').eq('student_id', ls?.student_id).eq('status', 'Проведен').order('date', { ascending: false }).limit(15);
      const prev = condList?.[0];
      const baseMs = ls?.date ? new Date(ls.date).getTime() : Date.now();
      const ebb = (condList || []).find(c => c.topic && (baseMs - new Date(c.date).getTime() >= 10 * 86400000) && (baseMs - new Date(c.date).getTime() <= 25 * 86400000));
      const prevHwClean = prev ? ((prev.homework || '').split('\\n[МАТЕРИАЛЫ]:')[0].replace('[ДЗ_ПРОВЕРЕНО]', '').trim()) : '';
      const masterPrompt = [
        `Привет! Готовим и проводим интерактивный урок английского языка.`,
        `👤 Ученик: ${st.name} (${st.grade || 'уровень не указан'})`,
        doss.unit ? `📖 Учебник / Программа: ${doss.unit}` : '',
        doss.interests ? `🎯 Интересы ученика (используй во всех примерах!): ${doss.interests}` : '',
        doss.errors ? `⚠️ Типичные ошибки (включи ловушки на эти правила!): ${doss.errors}` : '',
        doss.vocab ? `📚 Активный словарь на отработку: ${doss.vocab}` : '',
        prev ? `⏪ Прошлый урок (${new Date(prev.date).toLocaleDateString('ru-RU')}): Тема "${prev.topic || 'Практика'}"${prevHwClean ? `, Заданное ДЗ: "${prevHwClean}"` : ''}` : '',
        ebb ? `🔄 Повторение по Эббингаузу (~2 недели назад, ${new Date(ebb.date).toLocaleDateString('ru-RU')}): "${ebb.topic}" — вплети 2 вопроса на повторение!` : '',
        `\n🎯 ТЕМА СЕГОДНЯШНЕГО УРОКА: ${ls?.topic || 'Продолжение по программе + разговорная практика'}`,
        `\nСгенерируй структурированный материал для урока:`,
        `1. 🔥 Warm-up (5 мин): 3 живых вопроса по интересам ученика + быстрая проверка прошлого ДЗ и 2 вопроса по теме 2-недельной давности.`,
        `2. 💡 Основной блок: наглядное правило + 5-6 упражнений в контексте интересов ученика (с ловушками на его ошибки).`,
        `3. 🗣 Speaking / Roleplay: короткая игровая ситуация для вывода в речь.`,
        `4. 🏠 Домашнее задание на 10-15 минут (отдельным блоком без ответов, а ключи вынеси в самый низ).`
      ].filter(Boolean).join('\n');
      const spaceUrl = (doss.perplexity && doss.perplexity.startsWith('http')) ? doss.perplexity : 'https://www.perplexity.ai/';
      const msgText = `🔮 *Мастер-промпт для Perplexity Space (${st.name}):*\n_Нажми на блок кода ниже (скопируется в 1 тап) и вставь в Perplexity:_ \n\n\`\`\`\n${masterPrompt}\n\`\`\``;
      await bot.sendMessage(chatId, msgText, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🚀 Открыть Perplexity Space', url: spaceUrl }]] }
      }).catch(() => bot.sendMessage(chatId, masterPrompt));
    } catch (e) {
      bot.sendMessage(chatId, '❌ Ошибка сборки промпта Perplexity: ' + e.message);
    }
  } else if (data && data.startsWith('lesson_game:')) {
    const lessonId = data.split(':')[1];
    try {
      await bot.answerCallbackQuery(query.id, { text: '🎮 Генерирую игру на 5 минут...' });
      const { data: ls } = await db.from('lessons').select('*, students(*)').eq('id', lessonId).maybeSingle();
      const st = ls?.students || { name: 'Ученик', grade: '' };
      const doss = parseStudentDossierBot(st);
      const prompt = `Ученик: ${st.name} (${st.grade || ''}). Интересы: ${doss.interests || 'разные'}. Ошибки: ${doss.errors || 'не указаны'}. Словарь: ${doss.vocab || 'по теме'}. Тема урока: "${ls?.topic || 'Английский язык'}".\nДо конца урока осталось 5 минут! Создай КОМПАКТНО (до 1200 символов) живую устную мини-игру на 5 минут (Детектив/Алиби, Taboo по 3 подсказкам, 2 правды 1 ложь или Блиц-аукцион ошибок) с готовыми репликами и ответами в скобках!`;
      const planRes = await executeFunctionCall('generate_lesson_plan', { prompt });
      const textOut = `🎮 *Экстренная игра на 5 минут (${st.name}):*\n\n${planRes.generated_plan || 'Готово'}`;
      await bot.sendMessage(chatId, textOut, { parse_mode: 'Markdown' }).catch(() => bot.sendMessage(chatId, textOut));
    } catch (e) {
      bot.sendMessage(chatId, '❌ Ошибка генерации игры: ' + e.message);
    }
  } else if (data && data.startsWith('lesson_remind_text:')) {
    const lessonId = data.split(':')[1];
    try {
      await bot.answerCallbackQuery(query.id, { text: '📲 Готовлю деликатное напоминание...' });
      const { data: ls } = await db.from('lessons').select('*, students(name, price)').eq('id', lessonId).maybeSingle();
      const stName = ls?.students?.name || 'Ученик';
      const price = ls?.students?.price || 0;
      const dStr = ls?.date ? new Date(ls.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : 'прошедшее занятие';
      const msg = `📲 *Текст для пересылки (${stName}):*\n\n\`\`\`\nЗдравствуйте! Подскажите, пожалуйста, получилось ли перевести оплату за занятие по английскому за ${dStr}${price ? ` (${price} BYN)` : ''}? Возможно, я пропустил уведомление от банка 🙏 Спасибо!\n\`\`\``;
      await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' }).catch(() => bot.sendMessage(chatId, msg));
    } catch (e) {
      bot.sendMessage(chatId, '❌ Ошибка: ' + e.message);
    }
  } else if (data && data.startsWith('lesson_done_paid:')) {
    const lessonId = data.split(':')[1];
    try {
      const { data: lesson } = await db.from('lessons').select('*, students(name, price)').eq('id', lessonId).single();
      await db.from('lessons').update({ status: 'Проведен', paid: true }).eq('id', lessonId);
      const price = lesson?.students?.price ? parseFloat(lesson.students.price) : 0;
      const stName = lesson?.students?.name || 'Ученик';
      if (price > 0) {
        await createTransaction(price, 'income', 'Уроки (Английский)', `Оплата урока: ${stName}`, 'Карта');
      }
      await bot.answerCallbackQuery(query.id, { text: `✅ Урок проведён, +${price} BYN в доход!` });
      if (lesson?.students) {
        await sendHomeworkToStudentBot(lesson.students, lesson, false).catch(() => {});
        await sendParentLessonReportBot(lesson.students, lesson).catch(() => {});
      }
      await bot.editMessageText(`✅ Урок с *${stName}* отмечен как проведённый и оплаченный (+${price} BYN)!`, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '👨‍👩‍👧 Отправить отчёт родителю', callback_data: `teacher_send_parent_rep:${lessonId}` }]] } }).catch(() => {});
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && data.startsWith('lesson_done_unpaid:')) {
    const lessonId = data.split(':')[1];
    try {
      const { data: lesson } = await db.from('lessons').select('*, students(name)').eq('id', lessonId).single();
      await db.from('lessons').update({ status: 'Проведен', paid: false }).eq('id', lessonId);
      const stName = lesson?.students?.name || 'Ученик';
      await bot.answerCallbackQuery(query.id, { text: '⏳ Урок проведён (ждёт оплаты)' });
      if (lesson?.students) {
        await sendHomeworkToStudentBot(lesson.students, lesson, false).catch(() => {});
        await sendParentLessonReportBot(lesson.students, lesson).catch(() => {});
      }
      await bot.editMessageText(`⏳ Урок с *${stName}* проведён (ожидает оплаты).`, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '👨‍👩‍👧 Отправить отчёт родителю', callback_data: `teacher_send_parent_rep:${lessonId}` }]] } }).catch(() => {});
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && data.startsWith('lesson_cancel:')) {
    const lessonId = data.split(':')[1];
    try {
      await db.from('lessons').update({ status: 'Отменен' }).eq('id', lessonId);
      await bot.answerCallbackQuery(query.id, { text: '❌ Урок отменён' });
      await bot.editMessageText('❌ Урок отменён.', { chat_id: chatId, message_id: messageId }).catch(() => {});
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && data.startsWith('url_conveyor:')) {
    const urlKey = data.split(':')[1];
    const url = recentUrls.get(urlKey);
    if (!url) return bot.answerCallbackQuery(query.id, { text: 'Ссылка устарела, отправь её ещё раз', show_alert: true });
    await bot.answerCallbackQuery(query.id, { text: '🚀 Запускаю конвейер AI-Connect...' });
    await bot.editMessageText(`⏳ Читаю статью и готовлю пакет контента для *AI-Connect* и *HR-портала*...`, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' }).catch(() => {});
    try {
      const postRes = await executeFunctionCall('generate_channel_post', { url });
      const kbRes = await executeFunctionCall('save_link_to_knowledge_base', { url });
      const out = `📢 *Пост для Telegram-канала AI-Connect:*\n\n${postRes.post || postRes.error}\n\n━━━━━━━━━━━━━━\n🧠 *База знаний / HR-портал:* ${kbRes.message || kbRes.error}`;
      await bot.sendMessage(chatId, out, { parse_mode: 'Markdown' }).catch(() => bot.sendMessage(chatId, out));
    } catch (e) {
      await bot.sendMessage(chatId, '❌ Ошибка конвейера: ' + e.message);
    }
  } else if (data && data.startsWith('url_kb:')) {
    const urlKey = data.split(':')[1];
    const url = recentUrls.get(urlKey);
    if (!url) return bot.answerCallbackQuery(query.id, { text: 'Ссылка устарела, отправь её ещё раз', show_alert: true });
    await bot.answerCallbackQuery(query.id, { text: '🧠 Сохраняю выжимку в Базу знаний...' });
    try {
      const kbRes = await executeFunctionCall('save_link_to_knowledge_base', { url });
      await bot.editMessageText(`🧠 ${kbRes.message || kbRes.error}`, { chat_id: chatId, message_id: messageId }).catch(() => {});
    } catch (e) {
      await bot.sendMessage(chatId, '❌ Ошибка: ' + e.message);
    }
  } else if (data && data.startsWith('lesson_pay:')) {
    const lessonId = data.split(':')[1];
    try {
      const { data: lesson, error: errFetch } = await db.from('lessons')
        .select('*, students(name, price)')
        .eq('id', lessonId)
        .single();
      
      if (errFetch || !lesson) throw new Error('Урок не найден.');

      await db.from('lessons').update({ paid: true }).eq('id', lessonId);

      const price = lesson.students?.price ? parseFloat(lesson.students.price) : 0;
      const studentName = lesson.students?.name || 'Ученик';
      if (price > 0) {
        await createTransaction(price, 'income', 'Уроки (Английский)', `Оплата урока: ${studentName}`, 'Карта');
      }

      await bot.answerCallbackQuery(query.id, { text: `Оплата ${price} BYN успешно записана! 💰` });
      await sendLessonsSummary(chatId, messageId);
    } catch (e) {
      console.error('Callback query lesson_pay error:', e);
      bot.answerCallbackQuery(query.id, { text: '❌ Ошибка: ' + e.message, show_alert: true });
    }
  }
});


// Обработка ответов учеников на мини-тесты (Quiz Polls) в Telegram
bot.on('poll_answer', async (answer) => {
  try {
    const pollInfo = activePolls.get(answer.poll_id);
    if (!pollInfo) return;
    const chosenIdx = answer.option_ids?.[0];
    const isCorrect = chosenIdx === pollInfo.correctId;
    const chosenText = (chosenIdx !== undefined && pollInfo.options[chosenIdx]) ? pollInfo.options[chosenIdx] : 'Не выбран';
    const correctText = pollInfo.options[pollInfo.correctId] || '';
    const userDisplay = answer.user ? `${answer.user.first_name || ''} ${answer.user.last_name || ''} (@${answer.user.username || ''})`.trim() : pollInfo.studentName;

    let st = null;
    let lastLs = null;
    if (pollInfo.studentId) {
      const { data: sRow } = await db.from('students').select('*').eq('id', pollInfo.studentId).maybeSingle();
      st = sRow;
      lastLs = await getLatestLessonWithMaterials(pollInfo.studentId);
    }

    const actor = resolveStudentActor(st, pollInfo.chatId, answer.user);

    const prog = getPracticeProgress(pollInfo.studentId || pollInfo.studentName, pollInfo.lessonId || lastLs?.id, actor.tagKey);
    prog.pollsAnswered = (prog.pollsAnswered || 0) + 1;
    if (isCorrect) prog.pollsCorrect = (prog.pollsCorrect || 0) + 1;
    if (prog.pollsAnswered >= 2) {
      prog.completedSteps.quiz = true;
    }

    const hwStatus = st ? getHwCompletionSummary(st, lastLs, pollInfo.chatId, answer.user) : { pct: 25, canSubmit: false, doneText: 'Тестик', leftText: 'Письменное задание' };
    if (lastLs) {
      await persistHwProgressPercent(lastLs, hwStatus.pct, actor, st);
    }

    // Если ученик ошибся — отправляем ему в чат понятное объяснение правила!
    let studentExplanationSent = '';
    if (!isCorrect && pollInfo.chatId) {
      studentExplanationSent = `💡 Разбор вопроса:\n«${pollInfo.question}»\n\n❌ Твой ответ: ${chosenText}\n✅ Правильный ответ: ${correctText}\n📖 Почему так: ${pollInfo.explanation || 'Запомни эту конструкцию из нашего урока!'}`;
      await sendCleanMessage(pollInfo.chatId, studentExplanationSent).catch(() => {});
    }

    // Когда ученик ответил на все 3 вопроса раунда — присылаем обновлённый статус готовности ДЗ и клавиатуру
    if (prog.pollsAnswered % 3 === 0 && pollInfo.chatId && st) {
      const roundMsg = `🏁 Мини-тест пройден! Верных ответов: ${prog.pollsCorrect} из ${prog.pollsAnswered}.\n📊 Твоя готовность ДЗ сейчас: ${hwStatus.pct}% ${hwStatus.canSubmit ? '— кнопка «✅ Я сделал(а) ДЗ!» разблокирована! 🎉' : '(для сдачи нужно минимум 75%)'}`;
      await sendCleanMessage(pollInfo.chatId, roundMsg, {
        reply_markup: buildStudentKeyboard(st, lastLs, pollInfo.chatId)
      }).catch(() => {});
    }

    const emoji = isCorrect ? '✅' : '❌';
    const alertMsg = `${emoji} <b>Результат мини-теста ученика:</b>\n\n` +
      `👤 <b>Ученик:</b> ${actor.displayLabel} (${userDisplay})\n` +
      `❓ <b>Вопрос:</b> ${pollInfo.question}\n` +
      `👉 <b>Ответ ученика:</b> ${chosenText} ${isCorrect ? '✅ (Верно!)' : `❌ (Ошибка! Правильно: ${correctText})`}\n` +
      (pollInfo.explanation ? `💡 <b>Как бот объяснил ученику:</b> ${pollInfo.explanation}\n` : '') +
      `\n📊 <b>Готовность ДЗ сейчас:</b> ${hwStatus.pct}% (${hwStatus.canSubmit ? 'Готов к сдаче ✅' : 'Ещё не достиг 75% 🔒'})\n` +
      `${hwStatus.groupBreakdownText ? `👥 <b>В группе:</b>\n${hwStatus.groupBreakdownText}\n` : ''}` +
      `✅ <b>Что сделано:</b>\n• ${hwStatus.doneText}\n` +
      `⏳ <b>Что осталось:</b>\n• ${hwStatus.leftText}`;

    await bot.sendMessage(ADMIN_CHAT_ID, alertMsg, { parse_mode: 'HTML' }).catch(() => {});
  } catch (err) {
    console.error('poll_answer notification error:', err);
  }
});

// /finance и /budget — финансовый отчет за текущий месяц
bot.onText(/\/(finance|budget)/, async (msg) => {
  var chatId = msg.chat.id;
  await sendFinanceSummary(chatId);
});

async function sendFinanceSummary(chatId, messageId = null) {
  try {
    const stats = await getMonthlyFinances();
    const settings = await getSettings();
    const limit = settings && settings.monthlyLimit ? parseFloat(settings.monthlyLimit) : null;

    const now = new Date();
    const monthName = now.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    let text = `📊 *Финансовый отчет за ${capitalizedMonth}:*\n\n`;
    text += `💰 *Доходы:* ${stats.income.toFixed(2)} BYN\n`;
    text += `💸 *Расходы:* ${stats.expense.toFixed(2)} BYN\n`;
    const curMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const subs = Array.isArray(settings?.subscriptions) ? settings.subscriptions : [];
    const unpaidSubs = subs.filter(s => s.lastPaidMonth !== curMonthKey).reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0);
    if (unpaidSubs > 0) {
      text += `📅 *Обязательные платежи (осталось):* ${unpaidSubs.toFixed(2)} BYN\n`;
      text += `🛡 *Свободный баланс (после обяз.):* ${(stats.income - stats.expense - unpaidSubs).toFixed(2)} BYN\n`;
    }

    if (limit) {
      const remaining = limit - stats.expense;
      text += `🎯 *Лимит:* ${limit.toFixed(2)} BYN\n`;
      if (remaining >= 0) {
        text += `🟢 *Осталось:* ${remaining.toFixed(2)} BYN\n`;
      } else {
        text += `🔴 *Превышение лимита:* ${Math.abs(remaining).toFixed(2)} BYN! 🤬\n`;
      }
    }

    text += `\n🗂 *Расходы по категориям:*\n`;
    const sortedCategories = Object.entries(stats.categories)
      .sort((a, b) => b[1] - a[1]);

    if (sortedCategories.length === 0) {
      text += `_Расходов в этом месяце пока нет._\n`;
    } else {
      sortedCategories.forEach(([cat, val]) => {
        text += `  • ${cat}: *${val.toFixed(2)} BYN*\n`;
      });
    }

    const keyboard = [[{ text: '🔄 Обновить данные', callback_data: 'finance_refresh' }]];

    if (messageId) {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      }).catch(async () => {
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: keyboard }
        }).catch(e => console.error('Failed to edit finance message:', e));
      });
    } else {
      await bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      }).catch(() => {
        bot.sendMessage(chatId, text, {
          reply_markup: { inline_keyboard: keyboard }
        });
      });
    }
  } catch (e) {
    if (messageId) {
      bot.sendMessage(chatId, '❌ Ошибка обновления отчета: ' + e.message);
    } else {
      bot.sendMessage(chatId, '❌ Ошибка формирования отчета: ' + e.message);
    }
  }
}

// /focus и /deepwork — управление режимом фокусировки
bot.onText(/\/(focus|deepwork)/, async (msg) => {
  var chatId = msg.chat.id;
  const text = msg.text || '';
  
  const match = text.match(/\d+/);
  const mins = match ? parseInt(match[0], 10) : null;

  if (mins) {
    await startDeepWorkMode(chatId, mins);
  } else {
    if (globalDeepWorkUntil && Date.now() < globalDeepWorkUntil) {
      const remainingMins = Math.round((globalDeepWorkUntil - Date.now()) / 60000);
      const keyboard = [[{ text: '🛑 Завершить досрочно', callback_data: 'focus_stop' }]];
      
      await bot.sendMessage(chatId, `🧠 Ты сейчас в режиме *Deep Work*. Осталось работать примерно ${remainingMins} мин.`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      }).catch(() => {
        bot.sendMessage(chatId, `🧠 Ты сейчас в режиме Deep Work. Осталось работать примерно ${remainingMins} мин.`, {
          reply_markup: { inline_keyboard: keyboard }
        });
      });
    } else {
      const keyboard = [
        [
          { text: '⏱ 25 минут', callback_data: 'focus_start:25' },
          { text: '⏱ 45 минут', callback_data: 'focus_start:45' }
        ],
        [
          { text: '⏱ 60 минут', callback_data: 'focus_start:60' },
          { text: '⏱ 90 минут', callback_data: 'focus_start:90' }
        ]
      ];
      await bot.sendMessage(chatId, `🧠 Режим *Deep Work* (фокусировка) не активен. Выбери время, чтобы запустить его:`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      }).catch(() => {
        bot.sendMessage(chatId, `🧠 Режим Deep Work (фокусировка) не активен. Выбери время, чтобы запустить его:`, {
          reply_markup: { inline_keyboard: keyboard }
        });
      });
    }
  }
});

async function startDeepWorkMode(chatId, mins) {
  globalDeepWorkUntil = Date.now() + mins * 60 * 1000;
  
  if (deepWorkTimeout) clearTimeout(deepWorkTimeout);
  deepWorkTimeout = setTimeout(() => {
    globalDeepWorkUntil = null;
    bot.sendMessage(chatId, '⏳ Режим Deep Work завершен! Как успехи? Напоминаю, что во время работы ты мог присылать мне сообщения — они все ждут тебя во вкладке Инбокс в веб-интерфейсе.').catch(e => console.error(e));
  }, mins * 60 * 1000);

  const keyboard = [[{ text: '🛑 Завершить досрочно', callback_data: 'focus_stop' }]];

  await bot.sendMessage(chatId, `🧠 Режим *Deep Work* успешно активирован на ${mins} минут! Все входящие сообщения будут тихо сохранены во входящие (Inbox). Удачи! 🚀`, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  }).catch(() => {
    bot.sendMessage(chatId, `🧠 Режим Deep Work успешно активирован на ${mins} минут! Все входящие сообщения будут тихо сохранены во входящие (Inbox). Удачи! 🚀`, {
      reply_markup: { inline_keyboard: keyboard }
    });
  });
}

// /lessons — список занятий и долгов (репетиторство)
bot.onText(/\/lessons/, async (msg) => {
  var chatId = msg.chat.id;
  await sendLessonsSummary(chatId);
});

async function sendLessonsSummary(chatId, messageId = null) {
  try {
    const { data: upcoming } = await db.from('lessons')
      .select('*, students(name, price)')
      .eq('status', 'Запланирован')
      .order('date', { ascending: true })
      .limit(5);

    const { data: unpaid } = await db.from('lessons')
      .select('*, students(name, price)')
      .eq('status', 'Проведен')
      .eq('paid', false)
      .order('date', { ascending: true });

    let text = '📚 *Репетиторство и уроки:*\n\n';

    const { data: allConducted } = await db.from('lessons').select('*').eq('status', 'Проведен').order('date', { ascending: false });
    const prepButtons = [];
    text += '🕐 *Предстоящие занятия:*\n';
    if (!upcoming || upcoming.length === 0) {
      text += '  _Нет запланированных уроков._\n';
    } else {
      upcoming.forEach(l => {
        const date = new Date(l.date);
        const dateStr = date.toLocaleString('ru-RU', {
          timeZone: 'Europe/Minsk',
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
        text += `  • *${l.students?.name || 'Ученик'}* — ${dateStr}\n`;
        if (l.topic) text += `    _Тема: ${l.topic}_\n`;
        const prev = (allConducted || []).find(c => c.student_id === l.student_id);
        if (prev) {
          const prevHw = (prev.homework || '').split('\\n[МАТЕРИАЛЫ]:')[0].trim();
          const isChecked = prevHw.includes('[ДЗ_ПРОВЕРЕНО]');
          const cleanHw = prevHw.replace('[ДЗ_ПРОВЕРЕНО]', '').trim();
          if (prev.topic) text += `    ⏪ _Прошлый раз: ${prev.topic}_\n`;
          if (cleanHw) text += `    📌 *Проверить ДЗ:* ${cleanHw} ${isChecked ? '✅' : '⚠️'}\n`;
        }
        prepButtons.push([
          { text: `🔮 Perplexity: ${l.students?.name || 'Ученик'}`, callback_data: `lesson_perplexity:${l.id}` },
          { text: `🎲 Разминка + ДЗ`, callback_data: `lesson_prep:${l.id}` },
          { text: `📨 Напомнить ДЗ`, callback_data: `teacher_send_hw:${l.id}` },
          { text: `🔗 ТГ ученика`, callback_data: `teacher_invite_st:${l.student_id}` }
        ]);
      });
    }

    text += '\n🔴 *Неоплаченные проведенные уроки:*\n';
    const keyboard = typeof prepButtons !== 'undefined' ? [...prepButtons] : [];

    if (!unpaid || unpaid.length === 0) {
      text += '  _Все проведенные уроки оплачены! 🎉_\n';
    } else {
      let totalDebt = 0;
      unpaid.forEach(l => {
        const date = new Date(l.date);
        const dateStr = date.toLocaleDateString('ru-RU', {
          timeZone: 'Europe/Minsk',
          day: 'numeric', month: 'short'
        });
        const price = l.students?.price ? parseFloat(l.students.price) : 0;
        totalDebt += price;
        text += `  • *${l.students?.name || 'Ученик'}* (${dateStr}) — *${price} BYN*\n`;
        
        keyboard.push([{
          text: `💰 Оплатить: ${l.students?.name} (${dateStr})`,
          callback_data: `lesson_pay:${l.id}`
        }]);
      });
      text += `\n💰 *Общая сумма долга:* ${totalDebt.toFixed(2)} BYN\n`;
    }

    keyboard.push([{ text: '🔄 Обновить список', callback_data: 'lessons_refresh' }]);

    if (messageId) {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      }).catch(async () => {
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: keyboard }
        }).catch(e => console.error('Failed to edit lessons message:', e));
      });
    } else {
      await bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      }).catch(() => {
        bot.sendMessage(chatId, text, {
          reply_markup: { inline_keyboard: keyboard }
        });
      });
    }
  } catch (e) {
    const errorMsg = '❌ Ошибка при получении уроков: ' + e.message;
    if (messageId) {
      bot.sendMessage(chatId, errorMsg);
    } else {
      bot.sendMessage(chatId, errorMsg);
    }
  }
}

// /tasks — список задач
bot.onText(/\/tasks/, async (msg) => {
  var chatId = msg.chat.id;
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
    const taskButtons = tasks.slice(0, 5).map(t => ([
      { text: `✅ ${t.title.substring(0, 18)}`, callback_data: `task_done:${t.id}` },
      { text: `⏭ Завтра`, callback_data: `task_tomorrow:${t.id}` }
    ]));
    return bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: taskButtons } }).catch(() => {
      bot.sendMessage(chatId, text, { reply_markup: { inline_keyboard: taskButtons } });
    });
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' }).catch(() => {
      bot.sendMessage(chatId, text);
    });
  } catch(e) {
    bot.sendMessage(chatId, '❌ Ошибка загрузки задач: ' + e.message);
  }
});

// /level — RPG Статистика
bot.onText(/\/level/, async (msg) => {
  var chatId = msg.chat.id;
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

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' }).catch(() => {
      bot.sendMessage(chatId, text);
    });
  } catch(e) {
    bot.sendMessage(chatId, '❌ Ошибка загрузки статистики: ' + e.message);
  }
});

// /today — план на сегодня и неделю
bot.onText(/\/today/, async (msg) => {
  var chatId = msg.chat.id;
  try {
    return await sendTaskPulseReminder('📅 *План задач: День и Неделя*', chatId);
  } catch(e) {
    bot.sendMessage(chatId, '❌ Ошибка: ' + e.message);
  }
});

// /briefing — утренний брифинг вручную
bot.onText(/\/briefing/, async (msg) => {
  var chatId = msg.chat.id;
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
  var chatId = msg.chat.id;
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
  var chatId = msg.chat.id;
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

// /words, /vocab, /слова — Личный интерактивный словарь ученика
bot.onText(/\/(words|dictionary|vocab|слова|словарик)/i, async (msg) => {
  const chatId = msg.chat.id;
  const sFound = await findStudentByTgChatId(chatId);
  if (!sFound) {
    return bot.sendMessage(chatId, '📚 Персональный словарик доступен подключенным ученикам английского языка!');
  }
  const st = sFound.student;
  const actor = resolveStudentActor(st, chatId, msg.from);
  const streakInfo = await recordStudentDailyActivity(st, actor);
  const bank = await getStudentVocabularyBank(st);

  let text = `📚 *ПЕРСОНАЛЬНЫЙ СЛОВАРЬ: ${actor.name.toUpperCase()}*\n`;
  text += `🔥 Ударный режим: *${streakInfo.streak} дн. подряд* ${streakInfo.alreadyActiveToday ? '✅' : '⚡'}\n`;
  text += `🎯 Всего слов в копилке: *${bank.length}*\n\n`;

  if (bank.length === 0) {
    text += `_Словарик пока формируется. Слова с уроков будут появляться здесь автоматически!_\n\n`;
  } else {
    text += `*Слова из твоих уроков:*\n`;
    const slice = bank.slice(0, 12);
    slice.forEach((item, i) => {
      const ipaPart = item.ipa ? ` [${item.ipa}]` : '';
      const trPart = item.translation ? ` — ${item.translation}` : '';
      text += `${i + 1}. *${item.word}*${ipaPart}${trPart}\n`;
    });
    if (bank.length > 12) {
      text += `_...и ещё ${bank.length - 12} слов в твоей базе!_\n`;
    }
  }

  const kb = [
    [{ text: '🃏 Тренировать флеш-карточки', callback_data: `student_flashcards:${st.id}:0` }],
    [{ text: '📝 Тестик по словам', callback_data: `student_poll_quiz:${st.id}` }],
    [{ text: '🔤 5 новых слов урока', callback_data: `student_words:${st.id}` }],
    [{ text: '🔥 Мой стрик', callback_data: `student_streak_info:${st.id}` }]
  ];
  await sendCleanMessage(chatId, text, { reply_markup: { inline_keyboard: kb } });
});

// /streak, /fire, /стрик — Ударный режим Duolingo
bot.onText(/\/(streak|fire|стрик|огон)/i, async (msg) => {
  const chatId = msg.chat.id;
  const sFound = await findStudentByTgChatId(chatId);
  if (!sFound) {
    return bot.sendMessage(chatId, '🔥 Ударный режим доступен подключенным ученикам английского языка!');
  }
  const st = sFound.student;
  const actor = resolveStudentActor(st, chatId, msg.from);
  const streakInfo = await recordStudentDailyActivity(st, actor);

  let text = `🔥 *УДАРНЫЙ РЕЖИМ (STREAK): ${actor.name.toUpperCase()}* 🔥\n\n`;
  text += `🏆 Твоя серия активности: *${streakInfo.streak} дней подряд*!\n`;
  text += `⚡ Статус на сегодня: *${streakInfo.alreadyActiveToday ? '✅ Огонёк уже горит и защищён!' : '🔥 Огонёк активен!'}*\n\n`;
  text += `💡 *Как сохранить огонёк:*\n`;
  text += `Заходи каждый день хотя бы на 1 минуту — повторяй слова, проходи мини-квизы или выполняй ДЗ. Огонёк растёт каждый день! 🚀\n\n`;
  text += `👇 Потренируйся прямо сейчас:`;

  const kb = [
    [{ text: '📚 Мой словарик', callback_data: `student_vocab_bank:${st.id}` }],
    [{ text: '🃏 Флеш-карточки со словами', callback_data: `student_flashcards:${st.id}:0` }],
    [{ text: '📝 Пройти мини-тестик', callback_data: `student_poll_quiz:${st.id}` }]
  ];
  await sendCleanMessage(chatId, text, { reply_markup: { inline_keyboard: kb } });
});

// Любое текстовое или голосовое сообщение — отправляем в ИИ
bot.on('message', async (msg) => {
  if (msg.text?.startsWith('/')) return; // Команды обрабатываются выше
  var chatId = msg.chat.id;

  // Автоматически запоминаем chat_id
  if (!CHAT_ID) CHAT_ID = ADMIN_CHAT_ID;
  if (String(chatId) !== ADMIN_CHAT_ID) {
    const parentFound = await findParentByTgChatId(chatId);
    if (parentFound) {
      const pSt = parentFound.student;
      await bot.sendMessage(chatId, `Здравствуйте! 👋 Я передал ваше сообщение преподавателю Игорю (по ученику *${pSt.name}*).`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📊 Запросить свежий отчёт об успеваемости', callback_data: `parent_req_report:${pSt.id}` }],
            [{ text: '📚 Посмотреть текущее ДЗ ребёнка', callback_data: `parent_view_hw:${pSt.id}` }]
          ]
        }
      }).catch(() => {});
      await bot.sendMessage(ADMIN_CHAT_ID, `👨‍👩‍👧 *Сообщение от родителя ученика ${pSt.name}:*\n💬 "${msg.text || '[Медиа/Голосовое]'}"`, { parse_mode: 'Markdown' }).catch(() => {});
      await bot.forwardMessage(ADMIN_CHAT_ID, chatId, msg.message_id).catch(() => {});
      return;
    }
    const found = await findStudentByTgChatId(chatId);
    if (!found) {
      return bot.sendMessage(chatId, '🔒 Доступ только по ссылке-приглашению преподавателя.');
    }
    const st = found.student;
    const actor = resolveStudentActor(st, chatId, msg.from);
    let studentText = msg.text || '';
    const isPhotoSubmission = !!(msg.photo && msg.photo.length > 0);
    const isVoiceSubmission = !!(msg.voice || msg.video_note);
    
    // Check if this is a School Homework request
    const isSchoolHw = activeSchoolHwRequests.has(String(chatId)) ||
      (msg.caption && /школ|school|в школе|школьн/i.test(msg.caption)) ||
      (studentText && /школ|school|в школе|школьн/i.test(studentText));

    if (isSchoolHw) {
      activeSchoolHwRequests.delete(String(chatId));
      const reqId = 'shw_' + Date.now();
      const studentName = actor.displayLabel;
      const photo = (msg.photo && msg.photo.length > 0) ? msg.photo[msg.photo.length - 1] : null;
      let photoUrl = null;
      if (photo) {
        photoUrl = await bot.getFileLink(photo.file_id).catch(() => null);
      }

      pendingSchoolHwApprovals.set(reqId, {
        chatId,
        student: st,
        studentName,
        photoUrl,
        photoFileId: photo?.file_id,
        text: studentText,
        caption: msg.caption || '',
        createdAt: Date.now()
      });

      // Feedback to student
      await bot.sendMessage(chatId, `📬 *Школьное задание принято, ${actor.name}!* 🎒\nЯ отправил его Игорю на согласование ⏳.\nКак только он посмотрит и подтвердит — я сразу пришлю тебе понятное объяснение правил и пошаговый разбор!`, { parse_mode: 'Markdown' });

      // Notify Igor (Admin)
      const kb = [
        [
          { text: '✅ Одобрить и объяснить (ИИ)', callback_data: `approve_shw:${reqId}` },
          { text: '❌ Сделать самому', callback_data: `reject_shw:${reqId}` }
        ],
        [
          { text: '👨‍🏫 Разберём на уроке', callback_data: `defer_shw:${reqId}` }
        ]
      ];

      if (photo) {
        await bot.sendPhoto(ADMIN_CHAT_ID, photo.file_id, {
          caption: `🎒 *Запрос на разбор школьного ДЗ!*\n👤 *Ученик:* ${actor.displayLabel}${msg.caption ? `\n💬 Комментарий: «${msg.caption}»` : ''}\n\nРазрешить боту разобрать и объяснить правило ученику?`,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: kb }
        }).catch(() => {});
      } else {
        await bot.sendMessage(ADMIN_CHAT_ID, `🎒 *Запрос на разбор школьного ДЗ!*\n👤 *Ученик:* ${actor.displayLabel}\n\n📝 *Текст задания:*\n«${studentText}»\n\nРазрешить боту разобрать и объяснить правило ученику?`, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: kb }
        }).catch(() => {});
      }
      return;
    }
    
    // Vision AI for student notebook photo submission
    if (isPhotoSubmission) {
      try {
        bot.sendChatAction(chatId, 'typing');
        const photoIndex = msg.photo.length > 1 ? msg.photo.length - 2 : 0;
        const largestPhoto = msg.photo[msg.photo.length - 1];
        const photoUrl = await bot.getFileLink(msg.photo[photoIndex].file_id);
        let base64ImageUrl = photoUrl;
        try {
          const pRes = await fetch(photoUrl);
          if (pRes.ok) {
            const pBuf = await pRes.arrayBuffer();
            base64ImageUrl = `data:image/jpeg;base64,${Buffer.from(pBuf).toString('base64')}`;
          }
        } catch (_) {}

        const lastLs = await getLatestLessonWithMaterials(st.id);
        const cleanHw = (lastLs?.homework || '').split('\\n[МАТЕРИАЛЫ]:')[0].replace(/\[ДЗ_ПРОГРЕСС:\d+%\]/g, '').replace('[ДЗ_ПРОВЕРЕНО]', '').replace('[ДЗ_СДАНО]', '').trim();

        const newStreak = await incrementStudentStreakBot(st);
        const prog = getHwCompletionSummary(st, lastLs, chatId, msg.from);
        prog.completedSteps.written = true;
        const updatedProg = getHwCompletionSummary(st, lastLs, chatId, msg.from);
        if (lastLs) {
          await persistHwProgressPercent(lastLs, updatedProg.pct, actor, st);
          await markHwTagForActor(lastLs, 'СДАНО', actor);
        }

        // Student initial feedback + unlocked keyboard
        const photoAckMsg = `📸 *Фото тетрадки принято, ${actor.name}!* 🌟\nЯ проверяю твоё письменное задание и передал его Игорю!\n📊 *Готовность ДЗ: ${updatedProg.pct}%* (кнопка сдачи ДЗ разблокирована!)\n🔥 *Ударный режим (Streak): ${newStreak} ДЗ подряд! (+10 XP)* 🏆`;
        await bot.sendMessage(chatId, photoAckMsg, {
          parse_mode: 'Markdown',
          reply_markup: buildStudentKeyboard(st, lastLs, chatId)
        }).catch(() => {});

        // Forward photo to Igor with readiness status
        await bot.sendPhoto(ADMIN_CHAT_ID, largestPhoto.file_id, {
          caption: `📸 *Домашнее задание от ${actor.displayLabel} (фото тетрадки)*\n${msg.caption ? '💬 Подпись: ' + msg.caption + '\n' : ''}📊 *Готовность ДЗ:* ${updatedProg.pct}% (Доступ к сдаче: ${updatedProg.isReadyToSubmit ? 'ОТКРЫТ ✅' : 'ЗАКРЫТ 🔒'})\n${updatedProg.groupBreakdownText ? `👥 *В группе:*\n${updatedProg.groupBreakdownText}\n` : ''}✅ *Сделано:* ${updatedProg.doneList.join(', ')}\n⏳ *Осталось:* ${updatedProg.todoList.join(', ') || 'Ничего'}\n📌 Заданное ДЗ: _${(cleanHw || 'Без текста').slice(0, 250)}_`,
          parse_mode: 'Markdown'
        }).catch(() => {});

        // Call Vision OCR to transcribe English handwriting, explain mistakes to student, and send full copy to Igor
        try {
          const ocrPrompt = `Ты — чуткий преподаватель английского языка. Ученик ${actor.name} (${st.grade || ''}) прислал фото тетрадки с выполненным домашним заданием.
Заданное ДЗ было: "${cleanHw || 'упражнение из учебника'}".

Напиши понятный и тёплый разбор напрямую для ученика ${actor.name} (на «ты»):
1. 🔍 Что написано в тетрадке (кратко расшифруй ответы по пунктам).
2. ✅ Что сделано правильно (похвали!).
3. 💡 Разбор ошибок и рекомендации: если есть ошибки в правописании или грамматике — покажи правильный вариант и простыми словами объясни правило, почему так пишется.`;

          const ocrAnalysis = await askAI(ocrPrompt, '', base64ImageUrl, true, true, null, true);
          if (ocrAnalysis) {
            await saveHwWarmupErrorsToDossier(st, ocrAnalysis.slice(0, 450)).catch(() => {});
            const studentOcrMsg = `🤖 *Разбор твоего письменного ДЗ по фото, ${actor.name}:*\n\n${ocrAnalysis}`;
            await bot.sendMessage(chatId, studentOcrMsg, {
              parse_mode: 'Markdown',
              reply_markup: buildStudentKeyboard(st, lastLs, chatId)
            }).catch(() => bot.sendMessage(chatId, studentOcrMsg));

            const ocrKb = [];
            if (lastLs) ocrKb.push([{ text: '✅ Отметить ДЗ проверенным', callback_data: `lesson_hw_checked:${lastLs.id}` }]);
            ocrKb.push([{ text: '🎤 Ответить ученику (голосом/текстом)', callback_data: `teacher_reply_st:${st.id}` }]);
            const teacherOcrCopy = `📨 *Копия ИИ-разбора рукописи (отправлено ученику ${actor.displayLabel}):*\n📊 *Готовность ДЗ:* ${updatedProg.pct}%\n${updatedProg.groupBreakdownText ? `👥 *В группе:*\n${updatedProg.groupBreakdownText}\n` : ''}✅ *Сделано:* ${updatedProg.doneList.join(', ')}\n⏳ *Осталось:* ${updatedProg.todoList.join(', ') || 'Ничего'}\n\n${ocrAnalysis}\n\n🎯 _Ключевые ошибки автоматически сохранены в 5-минутку следующего урока!_`;
            await bot.sendMessage(ADMIN_CHAT_ID, teacherOcrCopy, {
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: ocrKb }
            }).catch(() => bot.sendMessage(ADMIN_CHAT_ID, teacherOcrCopy, { reply_markup: { inline_keyboard: ocrKb } }));
          }
        } catch (visionErr) {
          console.error('Vision OCR error:', visionErr.message);
        }
        return;
      } catch (photoErr) {
        console.error('Photo submission error:', photoErr.message);
      }
    }
    if (isVoiceSubmission) {
      try {
        bot.sendChatAction(chatId, 'typing');
        const fId = msg.voice ? msg.voice.file_id : msg.video_note.file_id;
        const fExt = msg.voice ? 'ogg' : 'mp4';
        const fLink = await bot.getFileLink(fId);
        const fRes = await fetch(fLink);
        if (fRes.ok) {
          const fBuf = await fRes.arrayBuffer();
          studentText = (await transcribeAudio(fBuf, `student_${st.id}.${fExt}`)) || '';
        }
      } catch (ve) {
        console.error('Student voice transcribe error:', ve.message);
      }
    }

    if (activeStudentQuizzes.has(String(chatId)) && studentText) {
      const quizObj = activeStudentQuizzes.get(String(chatId));
      activeStudentQuizzes.delete(String(chatId));
      const newStreak = await incrementStudentStreakBot(st);
      const lastLs = await getLatestLessonWithMaterials(st.id);
      const prog = getHwCompletionSummary(st, lastLs, chatId, msg.from);
      prog.completedSteps.quiz = true;
      const updatedProg = getHwCompletionSummary(st, lastLs, chatId, msg.from);
      if (lastLs) await persistHwProgressPercent(lastLs, updatedProg.pct, actor, st);

      const evalPrompt = `Ученик ${actor.name} (${st.grade || ''}) решал твой мини-квиз по английскому:\nКВИЗ:\n${quizObj.quizText}\n\nОТВЕТЫ УЧЕНИКА:\n"${studentText}"\n\nПроверь ответы дружелюбно и понятно (обращайся напрямую к ученику ${actor.name} на "ты", до 800 символов): похвали за правильные ответы, мягко объясни ошибки и правило (если есть) и поздравь с серией 🔥 ${newStreak} выполненных заданий подряд!`;
      const evalRes = await executeFunctionCall('generate_lesson_plan', { prompt: evalPrompt });
      const feedback = evalRes.generated_plan || `Отличная работа, ${actor.name}! 🔥 Твоя серия: ${newStreak}!`;
      const studentQuizReply = `🌟 *Проверка твоего мини-квиза:*\n\n${feedback}\n\n📊 *Готовность ДЗ: ${updatedProg.pct}%*\n🔥 *Твой стрик: ${newStreak} (+10 XP)*`;
      await bot.sendMessage(chatId, studentQuizReply, {
        parse_mode: 'Markdown',
        reply_markup: buildStudentKeyboard(st, lastLs, chatId)
      }).catch(() => bot.sendMessage(chatId, feedback));
      await bot.sendMessage(ADMIN_CHAT_ID, `📨 *Копия: ${actor.displayLabel} решил(а) мини-квиз в боте*\n📊 *Готовность ДЗ:* ${updatedProg.pct}%\n${updatedProg.groupBreakdownText ? `👥 *В группе:*\n${updatedProg.groupBreakdownText}\n` : ''}✅ *Сделано:* ${updatedProg.doneList.join(', ')}\n⏳ *Осталось:* ${updatedProg.todoList.join(', ') || 'Ничего'}\n\n💬 *Ответы ученика:*\n«${studentText}»\n\n🤖 *Что бот ответил и как объяснил ошибки:*\n${feedback}`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🎤 Ответить ученику', callback_data: `teacher_reply_st:${st.id}` }]] }
      }).catch(() => {});
      return;
    }

    const trimmed = studentText.trim();
    const lower = trimmed.toLowerCase();

    const lastLs = await getLatestLessonWithMaterials(st.id);
    const { cleanHw: rawCleanHw, cards } = extractAttachedCards(lastLs?.homework || '');
    const cleanHw = rawCleanHw.split('\\n[МАТЕРИАЛЫ]:')[0]
      .replace(/(?:🔑|🎯)?\s*(?:КЛЮЧИ|ОТВЕТЫ)\s+ДЛЯ\s+(?:ПРЕПОДАВАТЕЛЯ|УЧИТЕЛЯ)[\s\S]*?(?=\n\n|$)/gi, '')
      .replace(/\[(?:ДЕБРИФИНГ|КАСТОМНЫЙ_ОТЧЕТ|ОТЧЕТ_РОДИТЕЛЮ|СЦЕНАРИЙ_УРОКА|ПРЕЗЕНТАЦИЯ)\]:[\s\S]*?\[\/(?:ДЕБРИФИНГ|КАСТОМНЫЙ_ОТЧЕТ|ОТЧЕТ_РОДИТЕЛЮ|СЦЕНАРИЙ_УРОКА|ПРЕЗЕНТАЦИЯ)\]/g, '')
      .replace(/\[ДЗ_ПРОГРЕСС:\d+%\]/g, '')
      .replace('[ДЗ_ПРОВЕРЕНО]', '')
      .replace('[ДЗ_СДАНО]', '')
      .replace('[ОТПРАВИТЬ_В_ТГ]', '')
      .replace('[ОТПРАВИТЬ_РОДИТЕЛЮ_В_ТГ]', '')
      .replace('[ПЕРЕНЕСЕН_В_ТГ]', '')
      .trim();
    const scenario = lastLs?._mergedScenario || extractLessonScenario(lastLs?.homework || '');

    // 1. Быстрый перехват: Ученик прямо просит прислать само ДЗ («а какое дз», «скинь дз», «где дз»)
    const isAskingForHw = /какое\s*(?:то)?\s*дз|скинь\s*(?:мне)?\s*дз|где\s*дз|что\s*задано|какое\s*задание|дай\s*дз|мое\s*дз|напомни\s*дз/i.test(lower);
    if (isAskingForHw && !isVoiceSubmission) {
      if (cards && cards.length > 0) {
        await sendCardsToChat(chatId, cards, '🖼 Карточка к домашнему заданию');
      }
      const progNow = getHwCompletionSummary(st, lastLs, chatId, msg.from);
      const replyHw = cleanHw 
        ? `📚 *Вот твоё домашнее задание, ${actor.name}:*\n📊 *Текущая готовность: ${progNow.pct}%*\n\n${cleanHw}\n\n✍️ *Как сдать:* напиши ответы прямо сюда в чат, сфотографируй тетрадку или пройди интерактивные кнопки ниже до 75%+! 👍`
        : `📚 *Домашнее задание:*\nПовторить слова и правила прошедшего урока. Если нужно уточнить задание — напиши сюда! 👍`;

      const kb = buildStudentKeyboard(st, lastLs, chatId);
      await bot.sendMessage(chatId, replyHw, { parse_mode: 'Markdown', reply_markup: kb }).catch(() => bot.sendMessage(chatId, replyHw));
      await bot.sendMessage(ADMIN_CHAT_ID, `📨 *Копия: ${actor.displayLabel} спросил(а) про ДЗ:* «${studentText}»\n📊 *Готовность ДЗ:* ${progNow.pct}%\n${progNow.groupBreakdownText ? `👥 *В группе:*\n${progNow.groupBreakdownText}\n` : ''}\n🤖 *Отправлено ученику:*\n${replyHw}`, { parse_mode: 'Markdown' }).catch(() => {});
      return;
    }

    // 2. УМНЫЙ ИИ-МАРШРУТИЗАТОР СООБЩЕНИЙ УЧЕНИКА (понимает: сдача ДЗ / вопрос по теме урока / не по теме или орг. вопрос)
    const { data: nextPlannedLs } = await db.from('lessons')
      .select('date, time, topic')
      .eq('student_id', st.id)
      .eq('status', 'Запланирован')
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle();
    const nextLessonInfo = nextPlannedLs ? `${nextPlannedLs.date} в ${nextPlannedLs.time || 'по договорённости'}` : 'пока не назначен в календаре (Игорь уточнит время)';
    const currentProg = getHwCompletionSummary(st, lastLs, chatId, msg.from);

    let aiAnalysis = null;
    try {
      const routerPrompt = `Ты — умный, добрый и внимательный ИИ-помощник преподавателя английского языка Игоря.
Тебе написал ученик: ${actor.displayLabel} (${st.grade || 'школьник'}).
Тема последнего урока: "${lastLs?.topic || 'Английский язык'}".
Заданное ДЗ:
"${cleanHw || 'повторить слова и правила урока'}"
Материалы/сценарий урока:
"${scenario ? scenario.slice(0, 1200) : 'по программе'}"
Следующий запланированный урок: ${nextLessonInfo}.
Текущий прогресс выполнения ДЗ учеником: ${currentProg.pct}% (Сделано: ${currentProg.doneList.join(', ') || 'пока ничего'}; Осталось: ${currentProg.todoList.join(', ') || 'всё готово'}).

СООБЩЕНИЕ УЧЕНИКА (${isVoiceSubmission ? 'Голосовое сообщение' : 'Текст'}):
"${studentText}"

Определи, что именно пишет ученик, и верни СТРОГО валидный JSON без лишнего текста:
1) "intent": выбери ОДНО из трёх:
   - "homework_submission" — если ученик прислал выполнение ДЗ (ответы по пунктам 1, 2, 3, 4, английские предложения, перевод, слова или голосовую практику Speaking, даже если ответ короткий вроде "1. his 2. her 3. their 4. our").
   - "topic_question" — если ученик задаёт вопрос по теме урока, правилу английского, словам или не понимает, как делать задание (например: "а почему тут their?", "я не понял 2 задание", "как переводится слово?").
   - "off_topic_or_chat" — если ученик пишет не по теме урока или организационное сообщение (например: "привет", "спасибо", "я опоздаю на 5 минут", "когда следующий урок?", "я сегодня не смогу", либо просто болтает/шутит).

2) Поля JSON:
{
  "intent": "homework_submission" | "topic_question" | "off_topic_or_chat",
  "is_fully_done": true/false (для homework_submission: выполнены ли все пункты письменного задания),
  "score_percent": число от 0 до 100 (оценка правильности ДЗ для homework_submission),
  "what_is_done": "Что именно ученик уже сделал (конкретно по пунктам)",
  "what_is_left": "Что осталось доделать ученику по ДЗ",
  "errors_made": "Конкретные ошибки ученика с правильным вариантом (или 'Ошибок нет')",
  "warmup_next_lesson": "2-3 коротких предложения для 5-минутки на следующий урок по ошибкам ученика (или пустая строка)",
  "explanation_given": "Краткое резюме для учителя Игоря: какие рекомендации ты дал и как объяснил ошибки/вопрос ученику",
  "student_reply": "Твой прямой ответ ученику ${actor.name} (на 'ты', дружелюбно, понятно, с эмодзи). Если это homework_submission — похвали, разбери каждый пункт, объясни ошибки простыми словами и дай рекомендации. Если topic_question — понятно объясни правило или подскажи решение (но не решай всё ДЗ за него целиком). Если off_topic_or_chat — ответь тепло и естественно по смыслу сообщения (если спрашивает про урок — назови время следующего урока; если предупреждает об опоздании/переносе — скажи, что уже передал информацию Игорю; мягко напомни про ДЗ, если оно ещё не сдано)."
}`;

      const routeRes = await executeFunctionCall('generate_lesson_plan', { prompt: routerPrompt });
      const jsonMatch = routeRes.generated_plan?.match(/\{[\s\S]*\}/);
      if (jsonMatch) aiAnalysis = JSON.parse(jsonMatch[0]);
    } catch (errRoute) {
      console.error('Student AI router error:', errRoute.message);
    }

    const detectedIntent = aiAnalysis?.intent || (
      (isVoiceSubmission || /[a-zA-Z]{2,}/.test(trimmed) || /(?:^|\n)\s*\d+[.)\s]/.test(trimmed))
        ? 'homework_submission'
        : 'off_topic_or_chat'
    );

    // СЦЕНАРИЙ А: Вопрос ученика по теме урока / правилу / ДЗ ИЛИ сообщение не по теме / организационное
    if (detectedIntent === 'topic_question' || detectedIntent === 'off_topic_or_chat') {
      const replyToStudent = aiAnalysis?.student_reply || `👍 Принял твоё сообщение, *${actor.name}*! Я уже передал его преподавателю Игорю.`;
      await bot.sendMessage(chatId, replyToStudent, {
        parse_mode: 'Markdown',
        reply_markup: buildStudentKeyboard(st, lastLs, chatId)
      }).catch(() => bot.sendMessage(chatId, replyToStudent));

      const intentBadge = detectedIntent === 'topic_question'
        ? '❓ *Вопрос ученика ПО ТЕМЕ УРОКА / ДЗ*'
        : '💬 *Сообщение от ученика (орг. вопрос / вне темы)*';

      const teacherCopy = `${intentBadge}: *${actor.displayLabel}*\n📊 *Готовность ДЗ:* ${currentProg.pct}% (Доступ к сдаче: ${currentProg.isReadyToSubmit ? 'ОТКРЫТ ✅' : 'ЗАКРЫТ 🔒'})\n${currentProg.groupBreakdownText ? `👥 *В группе:*\n${currentProg.groupBreakdownText}\n` : ''}✅ *Что сделано по ДЗ:* ${currentProg.doneList.join(', ') || 'Пока не приступал(а)'}\n⏳ *Что осталось:* ${currentProg.todoList.join(', ') || 'Ничего'}\n\n🗣 *Что написал ученик:*\n«${studentText}»\n\n💡 *Как бот объяснил / какие рекомендации дал:*\n${aiAnalysis?.explanation_given || 'Ответил по смыслу сообщения'}\n\n📨 *Полная копия ответа ученику:*\n${replyToStudent}`;

      await bot.sendMessage(ADMIN_CHAT_ID, teacherCopy, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '🎤 Ответить ученику (голосом/текстом)', callback_data: `teacher_reply_st:${st.id}` }]]
        }
      }).catch(() => bot.sendMessage(ADMIN_CHAT_ID, teacherCopy));

      if (msg.voice || msg.video_note) {
        await bot.forwardMessage(ADMIN_CHAT_ID, chatId, msg.message_id).catch(() => {});
      }
      return;
    }

    // СЦЕНАРИЙ Б: Ученик сдаёт выполнение ДЗ (текстом или голосом)
    const newStreak = await incrementStudentStreakBot(st);
    const prog = getHwCompletionSummary(st, lastLs, chatId, msg.from);
    prog.completedSteps.written = true;
    const updatedProg = getHwCompletionSummary(st, lastLs, chatId, msg.from);
    if (lastLs) {
      await persistHwProgressPercent(lastLs, updatedProg.pct, actor, st);
    }

    const warmupNote = aiAnalysis?.warmup_next_lesson || ((aiAnalysis?.errors_made && !/без существенных|ошибок нет|нет ошибок/i.test(aiAnalysis.errors_made)) ? aiAnalysis.errors_made : '');
    if (warmupNote) {
      await saveHwWarmupErrorsToDossier(st, warmupNote).catch(() => {});
    }

    if (aiAnalysis && aiAnalysis.is_fully_done) {
      if (lastLs) {
        await markHwTagForActor(lastLs, 'ПРОВЕРЕНО', actor);
      }

      const studentFullMsg = `🎉 *Отличная работа, ${actor.name}! ДЗ проверено и зачтено!* ✅\n📊 *Готовность ДЗ: ${updatedProg.pct}%*\n\n${aiAnalysis.student_reply || ''}\n\n🔥 *Ударный режим (Streak): ${newStreak} ДЗ подряд! (+15 XP)* 🏆`;
      await bot.sendMessage(chatId, studentFullMsg, {
        parse_mode: 'Markdown',
        reply_markup: buildStudentKeyboard(st, lastLs, chatId)
      }).catch(() => bot.sendMessage(chatId, studentFullMsg));

      const warmupSuffix = warmupNote ? `\n\n🎯 *Добавлено в 5-минутку следующего урока:*\n${warmupNote}` : '';
      const teacherHwReport = `✅ *ИИ ПРОВЕРИЛ И ЗАЧЁЛ ДЗ: ${actor.displayLabel}* (Готовность: ${updatedProg.pct}% / Оценка: ${aiAnalysis.score_percent || 100}%)\n${updatedProg.groupBreakdownText ? `👥 *В группе:*\n${updatedProg.groupBreakdownText}\n` : ''}\n💬 *Ответ ученика:*\n«${studentText}»\n\n✅ *Что сделано:*\n${aiAnalysis.what_is_done || updatedProg.doneList.join(', ')}\n\n⏳ *Что осталось / не сделано:*\n${aiAnalysis.what_is_left || updatedProg.todoList.join(', ') || 'Ничего, всё готово!'}\n\n⚠️ *Ошибки ученика:*\n${aiAnalysis.errors_made || 'Без существенных ошибок'}\n\n💡 *Как объяснил ученику и какие рекомендации дал:*\n${aiAnalysis.explanation_given || 'Похвалил и разобрал задание'}\n\n📨 *Полная копия ответа ученику:*\n${studentFullMsg}${warmupSuffix}`;
      await bot.sendMessage(ADMIN_CHAT_ID, teacherHwReport, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '🎤 Ответить ученику (голосом/текстом)', callback_data: `teacher_reply_st:${st.id}` }]]
        }
      }).catch(() => bot.sendMessage(ADMIN_CHAT_ID, teacherHwReport));

    } else if (aiAnalysis && !aiAnalysis.is_fully_done) {
      if (lastLs) {
        await markHwTagForActor(lastLs, 'СДАНО', actor);
      }

      const studentPartialMsg = `📬 *Ответ принят и проверен, ${actor.name}!*\n📊 *Готовность ДЗ: ${updatedProg.pct}%*\n\n${aiAnalysis.student_reply || ''}\n\n🔥 *Твой стрик: ${newStreak} ДЗ подряд!* Давай доделаем оставшиеся пункты 💪`;
      await bot.sendMessage(chatId, studentPartialMsg, {
        parse_mode: 'Markdown',
        reply_markup: buildStudentKeyboard(st, lastLs, chatId)
      }).catch(() => bot.sendMessage(chatId, studentPartialMsg));

      const warmupSuffix = warmupNote ? `\n\n🎯 *Добавлено в 5-минутку следующего урока:*\n${warmupNote}` : '';
      const teacherPartialReport = `⚠️ *Ученик ${actor.displayLabel} сдал письменное ДЗ ЧАСТИЧНО* (Общая готовность ДЗ: ${updatedProg.pct}% / Качество ответа: ${aiAnalysis.score_percent || 50}%)\n${updatedProg.groupBreakdownText ? `👥 *В группе:*\n${updatedProg.groupBreakdownText}\n` : ''}\n💬 *Ответ ученика:*\n«${studentText}»\n\n✅ *Что сделано:*\n${aiAnalysis.what_is_done || updatedProg.doneList.join(', ')}\n\n⏳ *Что НЕ сделано / осталось:*\n${aiAnalysis.what_is_left || updatedProg.todoList.join(', ')}\n\n⚠️ *Какие ошибки допустил:*\n${aiAnalysis.errors_made || 'Есть неточности'}\n\n💡 *Как объяснил ошибки и какие рекомендации дал:*\n${aiAnalysis.explanation_given || 'Отправлена подсказка'}\n\n📨 *Полная копия ответа ученику:*\n${studentPartialMsg}${warmupSuffix}`;
      const partialKb = [];
      if (lastLs) partialKb.push([{ text: '✅ Всё равно отметить проверенным', callback_data: `lesson_hw_checked:${lastLs.id}` }]);
      partialKb.push([{ text: '🎤 Ответить ученику (голосом/текстом)', callback_data: `teacher_reply_st:${st.id}` }]);
      await bot.sendMessage(ADMIN_CHAT_ID, teacherPartialReport, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: partialKb }
      }).catch(() => bot.sendMessage(ADMIN_CHAT_ID, teacherPartialReport));

    } else {
      if (lastLs) {
        await markHwTagForActor(lastLs, 'СДАНО', actor);
      }
      const fallbackStudentMsg = `✅ Супер, *${actor.name}*! Твой ответ принят и отправлен Игорю на проверку! 🌟\n📊 *Готовность ДЗ: ${updatedProg.pct}%*\n🔥 *Твой стрик: ${newStreak} ДЗ подряд! (+10 XP)*`;
      await bot.sendMessage(chatId, fallbackStudentMsg, {
        parse_mode: 'Markdown',
        reply_markup: buildStudentKeyboard(st, lastLs, chatId)
      }).catch(() => {});
      const fbKb = [];
      if (lastLs) fbKb.push([{ text: '✅ Отметить ДЗ проверенным', callback_data: `lesson_hw_checked:${lastLs.id}` }]);
      fbKb.push([{ text: '🎤 Ответить ученику (голосом/текстом)', callback_data: `teacher_reply_st:${st.id}` }]);
      await bot.sendMessage(ADMIN_CHAT_ID, `📬 *Ответ по ДЗ от ученика ${st.name}:*\n📊 *Готовность ДЗ:* ${updatedProg.pct}%\n✅ *Сделано:* ${updatedProg.doneList.join(', ')}\n⏳ *Осталось:* ${updatedProg.todoList.join(', ') || 'Ничего'}\n\n💬 *Текст ученика:*\n«${studentText}»\n\n📨 *Копия ответа ученику:*\n${fallbackStudentMsg}`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: fbKb }
      }).catch(() => {});
    }
    if (msg.voice || msg.video_note) {
      await bot.forwardMessage(ADMIN_CHAT_ID, chatId, msg.message_id).catch(() => {});
    }
    return;
  }

  // --- ПЕРЕХВАТ ОТВЕТА ПРЕПОДАВАТЕЛЯ УЧЕНИКУ (ГОЛОС / КРУЖОЧЕК / ФОТО / ТЕКСТ) ---
  if (pendingTeacherReplyToStudent.has(String(chatId))) {
    const replyState = pendingTeacherReplyToStudent.get(String(chatId));
    if (Date.now() < replyState.expiresAt) {
      if (msg.text && /^(отмена|\/cancel)$/i.test(msg.text.trim())) {
        pendingTeacherReplyToStudent.delete(String(chatId));
        return bot.sendMessage(chatId, '❌ Отправка комментария ученику отменена.');
      }
      pendingTeacherReplyToStudent.delete(String(chatId));
      try {
        const { data: st } = await db.from('students').select('*').eq('id', replyState.studentId).maybeSingle();
        if (!st) return bot.sendMessage(chatId, '⚠️ Ученик не найден.');
        const doss = parseStudentDossierBot(st);
        const targetIds = (doss.tgId || '').split(',').map(s => s.trim()).filter(Boolean);
        if (targetIds.length === 0) {
          return bot.sendMessage(chatId, `⚠️ У ученика *${st.name}* ещё не привязан Telegram.`, { parse_mode: 'Markdown' });
        }
        for (const tid of targetIds) {
          if (msg.voice) {
            await bot.sendMessage(tid, `👨‍🏫 *Голосовой комментарий от Игоря по твоему ДЗ:*`, { parse_mode: 'Markdown' }).catch(() => {});
            await bot.sendVoice(tid, msg.voice.file_id).catch(() => {});
          } else if (msg.video_note) {
            await bot.sendMessage(tid, `👨‍🏫 *Видео-разбор от Игоря:*`, { parse_mode: 'Markdown' }).catch(() => {});
            await bot.sendVideoNote(tid, msg.video_note.file_id).catch(() => {});
          } else if (msg.photo && msg.photo.length > 0) {
            const pId = msg.photo[msg.photo.length - 1].file_id;
            await bot.sendPhoto(tid, pId, {
              caption: `👨‍🏫 *Комментарий от Игоря:*\n${msg.caption || ''}`,
              parse_mode: 'Markdown'
            }).catch(() => {});
          } else if (msg.text) {
            await bot.sendMessage(tid, `👨‍🏫 *Комментарий от Игоря по твоему ДЗ:*\n\n${msg.text}`, { parse_mode: 'Markdown' }).catch(() => bot.sendMessage(tid, `Комментарий от Игоря:\n\n${msg.text}`));
          }
        }
        return bot.sendMessage(chatId, `✅ Твой комментарий мгновенно доставлен ученику *${st.name}*!`, { parse_mode: 'Markdown' });
      } catch (replyErr) {
        return bot.sendMessage(chatId, '❌ Ошибка отправки комментария ученику: ' + replyErr.message);
      }
    } else {
      pendingTeacherReplyToStudent.delete(String(chatId));
    }
  }

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
      
      bot.sendMessage(chatId, `🎤 *Распознано:* _${transcribed}_`, { parse_mode: 'Markdown' }).catch(() => {
        bot.sendMessage(chatId, `🎤 Распознано: ${transcribed}`);
      });
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
    const urlMatch = textToProcess.trim().match(/^https?:\/\/\S+$/i);
    if (urlMatch) {
      const foundUrl = urlMatch[0];
      const urlKey = String(Date.now()).slice(-7);
      recentUrls.set(urlKey, foundUrl);
      return bot.sendMessage(chatId, `🔗 *Обнаружена ссылка!*\nЧто сделаем с этим материалом?`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📢 Конвейер AI-Connect (Пост + База знаний)', callback_data: `url_conveyor:${urlKey}` }],
            [{ text: '🧠 Только выжимка в Базу знаний', callback_data: `url_kb:${urlKey}` }]
          ]
        }
      });
    }
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
    const errText = (e.message || '') + (e.cause ? ' ' + e.cause.message : '');
    if (errText.includes('Rate limit') || errText.includes('free-models-per-day') || errText.includes('429') || errText.includes('Лимит запросов')) {
      bot.sendMessage(chatId, '⚠️ *Лимит бесплатных запросов нейросети на сегодня исчерпан* (OpenRouter free tier limit).\nВсе кнопки, карточки, интерактивные викторины, расписание и напоминалки работают в штатном режиме без перебоев! Свободная генерация текста через ИИ обновится при сбросе суточного лимита.', { parse_mode: 'Markdown' }).catch(() => {});
    } else {
      let debugInfo = e.message || 'Неизвестная ошибка';
      bot.sendMessage(chatId, '⚠️ Произошла ошибка при обработке сообщения: ' + debugInfo).catch(() => {});
    }
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
- Задачи на неделю (ближайшие 7 дней): ${JSON.stringify(upcoming.map(t => ({ title: t.title, deadline: t.deadline })))}
- События сегодня: ${JSON.stringify(events.map(e => ({ title: e.title, start: e.start_at })))}
- Привычки: ${JSON.stringify(habits.map(h => h.name))}

Сгенерируй утренний брифинг. Формат:
1. Приветствие с датой
2. 🎯 Задачи на сегодня (главный фокус дня + остальные задачи на сегодня)
3. 📅 План задач на эту неделю (перечисли запланированные задачи на ближайшие дни с датами!)
4. 🕐 События из календаря на сегодня (НЕ выдумывай расписание английского, если его нет в событиях!)
5. 🔥 Хвосты с прошлых дней (если есть)
6. Короткая бодрая мотивация
`;

  try {
    return await askAI('Сгенерируй утренний брифинг', contextData, null, true, true);
  } catch (e) {
    console.warn('generateMorningBriefing AI fallback:', e.message);
    const todayStr = new Date().toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk', weekday: 'long', day: 'numeric', month: 'long' });
    let fb = `☀️ *Доброе утро! Сегодня ${todayStr}*\n\n`;
    fb += `🎯 *Задачи на сегодня (${todayTasks.length}):*\n`;
    fb += todayTasks.length ? todayTasks.map((t, i) => `${i + 1}. ${t.title}`).join('\n') + '\n' : '_На сегодня задач нет_\n';
    if (upcoming.length > 0) {
      fb += `\n📅 *План на неделю (${upcoming.length}):*\n` + upcoming.slice(0, 6).map(t => `• ${t.title} _(до ${t.deadline})_`).join('\n') + '\n';
    }
    if (overdue.length > 0) {
      fb += `\n🔥 *Хвосты с прошлых дней (${overdue.length}):*\n` + overdue.slice(0, 5).map(t => `• ⚠️ ${t.title}`).join('\n') + '\n';
    }
    fb += `\n💪 Продуктивного дня и отличного фокуса!`;
    return fb;
  }
}

async function generateEveningReview() {
  const completedToday = await getTasksCompletedToday();
  const todayTasks = await getTasksDueToday();
  const overdue = await getOverdueTasks();
  const habitLogs = await getHabitLogsToday();
  const habits = await getHabits();

  // Fetch tutoring lessons conducted / scheduled today
  const minskDateStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Minsk' });
  const startDayIso = new Date(minskDateStr + 'T00:00:00.000+03:00').toISOString();
  const endDayIso = new Date(minskDateStr + 'T23:59:59.999+03:00').toISOString();
  const { data: todayLessons } = await db.from('lessons')
    .select('*, students(*)')
    .gte('date', startDayIso)
    .lte('date', endDayIso)
    .order('date');
  const conductedLessons = (todayLessons || []).filter(l => l.status === 'Проведен');
  const lessonsDesc = conductedLessons.map(l => `${l.students?.name || 'Ученик'} («${l.topic || 'Английский'}»)`).join(', ');

  const minskDayName = new Date().toLocaleDateString('en-US', { timeZone: 'Europe/Minsk', weekday: 'short' });
  const isWeekend = (minskDayName === 'Sat' || minskDayName === 'Sun');
  if (typeof completedToday !== 'undefined' && isWeekend) {
    const weekendCtx = `СЕГОДНЯ ВЫХОДНОЙ ДЕНЬ (${minskDayName === 'Sat' ? 'Суббота' : 'Воскресенье'}).\nПроведено уроков репетиторства сегодня: ${conductedLessons.length} (${lessonsDesc || 'нет'}).\nВыполнено задач/уроков сегодня: ${completedToday.length} (${JSON.stringify(completedToday.map(t => t.title))}).\nПривычки сегодня: ${habitLogs.length} из ${habits.length}.\nИНСТРУКЦИЯ (РЕЖИМ АНТИ-СТЫД ВЫХОДНОГО ДНЯ):\nСегодня выходной! Никакого шейминга за рабочие задачи РЦПИ. Напиши тёплый, поддерживающий вечерний обзор выходного дня: обязательно похвали за проведённые уроки английского (${conductedLessons.length > 0 ? `отлично поработал с учениками: ${lessonsDesc}` : 'отдыхал'}), похвали за полезные привычки, напомни качественно восстановиться, провести вечер с Кристиной и лечь спать до 23:00.`;
    try {
      return await askAI('Сгенерируй тёплый вечерний обзор выходного дня', weekendCtx, null, true, true);
    } catch (_) {
      return `🌙 *Итоги выходного дня*\n\n✅ Проведено уроков английского: *${conductedLessons.length}* (${lessonsDesc || 'выходной'})\n✅ Закрыто задач сегодня: *${completedToday.length}*\n✅ Привычки: *${habitLogs.length} из ${habits.length}*\n\nОтлично потрудился! Хорошего вечера с Кристиной и отбой до 23:00! 💜`;
    }
  }

  const contextData = `
ДАННЫЕ ДЛЯ ВЕЧЕРНЕГО ОБЗОРА:
- ПРОВЕДЕНО УРОКОВ РЕПЕТИТОРСТВА СЕГОДНЯ: ${conductedLessons.length} (${lessonsDesc || '0'}).
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

  try {
    return await askAI('Сгенерируй вечерний обзор-прожарку', contextData, null, true, true);
  } catch (e) {
    console.warn('generateEveningReview AI fallback:', e.message);
    return `🌙 *Итоги дня*\n\n✅ Выполнено задач сегодня: *${completedToday.length}*\n📚 Уроков английского проведено: *${conductedLessons.length}* ${lessonsDesc ? `(${lessonsDesc})` : ''}\n⏳ Осталось на сегодня: *${todayTasks.length}*\n🔥 Просроченные хвосты: *${overdue.length}*\n💪 Привычки: *${habitLogs.length} из ${habits.length}*\n\nОтдыхай и готовься ко сну до 22:30!`;
  }
}

async function generateWeeklyReview() {
  const stats = await getWeekStats();
  const overdue = await getOverdueTasks();

  const now = new Date();
  const nextWeekEnd = new Date(now.getTime() + 7 * 86400000);
  const { data: upcomingLessons } = await db.from('lessons')
    .select('*, students(name)')
    .eq('status', 'Запланирован')
    .gte('date', now.toISOString())
    .lte('date', nextWeekEnd.toISOString())
    .order('date');

  let tutoringScheduleText = 'Нет запланированных уроков в расписании (уроки создаются преподавателем вручную по договоренности).';
  if (upcomingLessons && upcomingLessons.length > 0) {
    tutoringScheduleText = upcomingLessons.map(l => {
      const dt = new Date(l.date).toLocaleString('ru-RU', { timeZone: 'Europe/Minsk', weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `- ${dt}: ${l.students?.name || 'Ученик'} («${l.topic || 'Английский'}»)`;
    }).join('\n');
  }

  const contextData = `
ЕЖЕНЕДЕЛЬНЫЙ ОБЗОР:
- Задач закрыто за неделю: ${stats.completed}
- Задач создано за неделю: ${stats.created}
- Просрочено: ${overdue.length}

АКТУАЛЬНЫЕ УРОКИ РЕПЕТИТОРСТВА НА СЛЕДУЮЩУЮ НЕДЕЛЮ:
${tutoringScheduleText}

КАТЕГОРИЧЕСКИ ВАЖНО:
- У репетиторства НЕТ автоматического или постоянного расписания! Преподаватель (Игорь) назначает уроки вручную по факту, когда может.
- СТРОГО ЗАПРЕЩЕНО выдумывать или предполагать дни и время уроков (например "Вт 18:00+ — Воронины, Ср 18:00+ — Курочкина")!
- Если в блоке "АКТУАЛЬНЫЕ УРОКИ РЕПЕТИТОРСТВА" уроков нет — вообще не приводи список расписания уроков репетиторства!
- Похвали за достижения недели, подсвети фокус на новую неделю.
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

async function sendTaskPulseReminder(headerTitle = '⏰ *Пульс задач: День и Неделя*', targetChatId = null, editMessageId = null) {
  const destChat = targetChatId || CHAT_ID;
  if (!destChat) return;

  try {
    const todayTasks = await getTasksDueToday();
    const completedToday = await getTasksCompletedToday();
    const upcomingWeek = await getUpcomingDeadlines(7);
    const overdue = await getOverdueTasks();

    const priorityEmoji = { 'Высокий': '🔴', 'Средний': '🟡', 'Низкий': '🟢' };
    const now = new Date();
    const todayStr = now.toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk', weekday: 'short', day: 'numeric', month: 'short' });

    let text = `${headerTitle}\n🗓 _Сегодня: ${todayStr}_\n\n`;

    // 1. Задачи на сегодня
    text += `🎯 *ЗАДАЧИ НА СЕГОДНЯ (${todayTasks.length}):*\n`;
    if (todayTasks.length === 0) {
      if (completedToday.length > 0) {
        text += `✅ Все задачи на сегодня выполнены! (закрыто: ${completedToday.length})\n`;
      } else {
        text += `_На сегодня активных задач нет_\n`;
      }
    } else {
      todayTasks.forEach((t, idx) => {
        const pEmoji = priorityEmoji[t.priority] || '🔸';
        const areaTag = t.area === 'Работа' ? '💼' : '🏠';
        text += `${idx + 1}. ${pEmoji}${areaTag} *${t.title}*\n`;
      });
      if (completedToday.length > 0) {
        text += `_✅ Уже закрыто сегодня: ${completedToday.length}_\n`;
      }
    }

    // 2. План задач на неделю (ближайшие 7 дней)
    text += `\n📅 *ПЛАН ЗАДАЧ НА НЕДЕЛЮ (${upcomingWeek.length}):*\n`;
    if (upcomingWeek.length === 0) {
      text += `_На ближайшие 7 дней задач пока нет_\n`;
    } else {
      const sortedWeek = [...upcomingWeek].sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''));
      sortedWeek.forEach(t => {
        const dObj = new Date(t.deadline + 'T12:00:00Z');
        const dLabel = dObj.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
        const pEmoji = priorityEmoji[t.priority] || '▫️';
        text += `• *${dLabel}:* ${pEmoji} ${t.title}\n`;
      });
    }

    // 3. Просроченные хвосты
    if (overdue.length > 0) {
      text += `\n🔥 *ХВОСТЫ С ПРОШЛЫХ ДНЕЙ (${overdue.length}):*\n`;
      overdue.slice(0, 5).forEach(t => {
        text += `• ⚠️ ${t.title} _(до ${t.deadline})_\n`;
      });
      if (overdue.length > 5) {
        text += `_...и ещё ${overdue.length - 5}_\n`;
      }
    }

    // Интерактивные кнопки для быстрого закрытия/переноса
    const actionable = [...todayTasks, ...overdue.slice(0, 2)].slice(0, 6);
    const inlineKeyboard = actionable.map(t => ([
      { text: `✅ ${t.title.substring(0, 22)}`, callback_data: `task_done:${t.id}` },
      { text: `⏭ На завтра`, callback_data: `task_tomorrow:${t.id}` }
    ]));
    if (overdue.length > 1) {
      inlineKeyboard.push([{ text: `🧹 Закрыть все вчерашние хвосты (${overdue.length})`, callback_data: 'tasks_close_overdue' }]);
    }
    inlineKeyboard.push([
      { text: '🔄 Обновить сводку', callback_data: 'tasks_pulse_refresh' },
      { text: '🍅 Фокус 25 мин', callback_data: 'focus_start:25' }
    ]);

    const opts = {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: inlineKeyboard }
    };

    if (editMessageId) {
      await bot.editMessageText(text, { chat_id: destChat, message_id: editMessageId, ...opts }).catch(async () => {
        await bot.editMessageText(text, { chat_id: destChat, message_id: editMessageId, reply_markup: { inline_keyboard: inlineKeyboard } }).catch(() => {});
      });
    } else {
      await bot.sendMessage(destChat, text, opts).catch(async () => {
        await bot.sendMessage(destChat, text, { reply_markup: { inline_keyboard: inlineKeyboard } }).catch(() => {});
      });
    }
  } catch (err) {
    console.error('sendTaskPulseReminder error:', err.message);
  }
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
  } catch (e) {
    console.error('Cron morning error:', e);
    const todayStr = new Date().toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk', weekday: 'long', day: 'numeric', month: 'long' });
    sendProactiveMessage(`☀️ *Доброе утро! Сегодня ${todayStr}*\n\nНачинаем рабочий день. Проверь актуальные задачи в карточках дня и недели!\n\n_Примечание: автоматический отчёт временно переключён в режим быстрого обзора (${e.message})_`);
  }
}, { timezone: 'UTC' });

// Напоминание перед Deep Work + Задачи на день и неделю: 9:55 по Минску = 6:55 UTC
cron.schedule('55 6 * * 1-5', async () => {
  await sendTaskPulseReminder('🧠 *Через 5 минут — Deep Work (10:00–13:00)!*\nЗакрой мессенджеры и выбери главную задачу из списка:');
}, { timezone: 'UTC' });

// Дневной чек-ин по задачам (12:00 по Минску = 9:00 UTC)
cron.schedule('0 9 * * *', async () => {
  await sendTaskPulseReminder('🕛 *Дневной пульс задач (12:00)*\nСверяем курс по задачам на сегодня и на неделю:');
}, { timezone: 'UTC' });

// [NEW] Обед: 13:00 по Минску = 10:00 UTC
cron.schedule('0 10 * * 1-5', () => {
  sendProactiveMessage('🍔 *Время обеда!* Твое время с 13:00 до 14:00 защищено. Отрывайся от монитора и отдыхай.');
}, { timezone: 'UTC' });

// Послеобеденный фокус по задачам (14:15 по Минску = 11:15 UTC)
cron.schedule('15 11 * * 1-5', async () => {
  await sendTaskPulseReminder('⚡ *Фокус на вторую половину дня (14:15)*\nЧто закрываем после обеда и что в плане на неделю:');
}, { timezone: 'UTC' });

// Финишная прямая рабочего дня (16:45 по Минску = 13:45 UTC)
cron.schedule('45 13 * * 1-5', async () => {
  await sendTaskPulseReminder('🏁 *Финишная прямая рабочего дня (16:45)*\nДо конца работы 1 час — отметь выполненное или перенеси на завтра:');
}, { timezone: 'UTC' });

// Вечерний обзор: 19:30 по Минску = 16:30 UTC
cron.schedule('30 16 * * *', async () => {
  console.log('⏰ Cron: вечерний обзор');
  try {
    const text = await generateEveningReview();
    await saveMessage('assistant', text);
    sendProactiveMessage('🌙 *Вечерний обзор*\n\n' + text);
  } catch (e) {
    console.error('Cron evening error:', e);
    sendProactiveMessage(`🌙 *Вечерний обзор*\n\nДень завершён! Самое время закрыть рабочие программы, выдохнуть и отдохнуть. Отбой до 22:30!\n\n_Примечание: автоматический отчёт временно переключён в режим быстрого обзора (${e.message})_`);
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

// Duolingo-style Streak Saver: 19:15 по Минску = 16:15 UTC
cron.schedule('15 16 * * *', async () => {
  console.log('⏰ Cron: проверка ударного режима учеников (Streak Saver)');
  try {
    const todayMinsk = getMinskDateString(0);
    const { data: students } = await db.from('students').select('*');
    for (const st of (students || [])) {
      const doss = parseStudentDossierBot(st);
      if (!doss.tgId) continue;
      // Если ученик уже занимался сегодня — стрик в безопасности!
      if (doss.lastActiveDate === todayMinsk) continue;

      const targetIds = (doss.tgId || '').split(',').map(s => s.trim()).filter(Boolean);
      const curStreak = parseInt(doss.streak, 10) || 0;

      const fireMsg = curStreak > 1
        ? `🔥⚠️ *ТВОЙ ОГОНЁК РИСКУЕТ ПОГАСНУТЬ!* ⚠️🔥\n\nПривет, *${st.name}*! У тебя горит серия: *${curStreak} дней подряд*! 🚀\nЕсли не позаниматься сегодня, стрик сгорит в полночь!\n\n👇 Повтори 3 слова или открой словарик за 1 минуту, чтобы спасти свой огонёк:`
        : `🔥 *Привет, ${st.name}!* Зажги свой огонёк ударного режима!\nУдели всего 1 минуту в день на английский, чтобы слова запоминались легко и навсегда. 🇬🇧\n\n👇 Потренируйся прямо сейчас:`;

      const kb = [
        [{ text: '📚 Открыть мой словарик', callback_data: `student_vocab_bank:${st.id}` }],
        [{ text: '🃏 Флеш-карточки со словами', callback_data: `student_flashcards:${st.id}:0` }],
        [{ text: '🔤 5 слов урока', callback_data: `student_words:${st.id}` }]
      ];

      for (const tid of targetIds) {
        await bot.sendMessage(tid, fireMsg, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: kb }
        }).catch(() => {});
      }
    }
  } catch (e) {
    console.error('Streak reminder cron error:', e);
  }
}, { timezone: 'UTC' });

// Авто-напоминание ученикам в ТГ о ДЗ за день до урока: 16:30 по Минску = 13:30 UTC
cron.schedule('30 13 * * *', async () => {
  try {
    const tomorrowPrefix = getMinskDateString(1);
    const { data: tomLessons } = await db.from('lessons')
      .select('*, students(*)')
      .eq('status', 'Запланирован')
      .gte('date', tomorrowPrefix + 'T00:00:00.000Z')
      .lte('date', tomorrowPrefix + 'T23:59:59.999Z');
    for (const ls of (tomLessons || [])) {
      const st = ls.students;
      if (!st) continue;
      const doss = parseStudentDossierBot(st);
      if (!doss.tgId) continue;
      const { data: prev } = await db.from('lessons').select('*').eq('student_id', st.id).eq('status', 'Проведен').order('date', { ascending: false }).limit(1).maybeSingle();
      if (!prev || !prev.homework) continue;
      if (prev.homework.includes('[ДЗ_ПРОВЕРЕНО]') || prev.homework.includes('[ДЗ_СДАНО]')) continue;
      const nextStr = new Date(ls.date).toLocaleString('ru-RU', { timeZone: 'Europe/Minsk', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      const res = await sendHomeworkToStudentBot(st, prev, true, `завтра (${nextStr})`);
      if (res.sent && CHAT_ID) {
        bot.sendMessage(CHAT_ID, `🔔 *Авто-напоминание о ДЗ:* отправил *${st.name}* домашнее задание к завтрашнему уроку (${nextStr}).`, { parse_mode: 'Markdown' }).catch(() => {});
      }
    }
  } catch (e) {
    console.error('Cron student HW reminder error:', e);
  }
}, { timezone: 'UTC' });

// Проверка дедлайнов (каждый день в 10:00 = 7:00 UTC)
cron.schedule('0 7 * * *', async () => {
  try {
    const upcoming = await getUpcomingDeadlines(1); // Дедлайн завтра
    for (const task of upcoming) {
      sendProactiveMessage(`⚠️ Завтра дедлайн: *${task.title}*\nЧто осталось сделать?`);
    }
    const twoDaysAgoIso = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { data: oldUnpaid } = await db.from('lessons').select('*, students(name, price)').eq('status', 'Проведен').eq('paid', false).lte('date', twoDaysAgoIso);
    if (oldUnpaid && oldUnpaid.length > 0 && CHAT_ID) {
      for (const ul of oldUnpaid) {
        const stName = ul.students?.name || 'Ученик';
        const price = ul.students?.price || 0;
        const dStr = new Date(ul.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        await bot.sendMessage(CHAT_ID, `⏳ *Контроль оплаты (прошло >48ч):*\nУрок с *${stName}* от ${dStr} (${price} BYN) всё ещё отмечен как неоплаченный.`, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: `💰 Уже оплатили (+${price} BYN)`, callback_data: `lesson_pay:${ul.id}` },
                { text: '📲 Текст напоминания', callback_data: `lesson_remind_text:${ul.id}` }
              ]
            ]
          }
        }).catch(() => {});
      }
    }
    if (false) {
    }
  } catch(e) {
    console.error('Cron deadline check error:', e);
  }
}, { timezone: 'UTC' });

// Ночное удаление дубликатов задач: 3:00 по Минску = 0:00 UTC
cron.schedule('0 0 * * *', async () => {
  console.log('⏰ Cron: удаление дубликатов задач');
  try {
    const deletedCount = await removeDuplicateTasks();
    if (deletedCount > 0) {
      sendProactiveMessage(`🧹 **Уборка задач:** Автоматически удалено дубликатов задач: ${deletedCount}.`);
    }
  } catch(e) {
    console.error('Cron deduplication error:', e);
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
console.log('   🧹 Уборка дубликатов задач: 3:00');

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
    // 2а. Очередь мгновенной отправки ДЗ с веб-сайта ([ОТПРАВИТЬ_В_ТГ]) и напоминание ученику за 3 часа до урока
    const { data: rescheduledLessons } = await db.from('lessons').select('*, students(*)').ilike('homework', '%[ПЕРЕНЕСЕН_В_ТГ]%');
    if (rescheduledLessons && rescheduledLessons.length > 0) {
      for (const rls of rescheduledLessons) {
        const cleanedHw = (rls.homework || '').replace('[ПЕРЕНЕСЕН_В_ТГ]', '').trim();
        await db.from('lessons').update({ homework: cleanedHw }).eq('id', rls.id);
        if (rls.students) {
          const doss = parseStudentDossierBot(rls.students);
          if (doss.tgId) {
            const targetIds = (doss.tgId || '').split(',').map(s => s.trim()).filter(Boolean);
            const newTimeStr = new Date(rls.date).toLocaleString('ru-RU', { timeZone: 'Europe/Minsk', weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
            for (const tid of targetIds) {
              await bot.sendMessage(tid, `🕒 *Привет, ${rls.students.name}!*\nОбрати внимание: время нашего урока английского изменилось!\n📅 *Новое время:* ${newTimeStr}\nДо встречи на занятии! 🇬🇧`, { parse_mode: 'Markdown' }).catch(() => {});
            }
            if (CHAT_ID) {
              bot.sendMessage(CHAT_ID, `🕒 Ученикам *${rls.students.name}* автоматически отправлено уведомление о переносе урока на *${newTimeStr}*!`, { parse_mode: 'Markdown' }).catch(() => {});
            }
          }
        }
      }
    }
    await processLessonQueues();
    const future3hMax = new Date(now.getTime() + 185 * 60000);
    const future3hMin = new Date(now.getTime() + 115 * 60000); // 2–3 часа до начала урока
    const { data: lessons3h } = await db.from('lessons').select('*, students(*)').eq('status', 'Запланирован').gte('date', future3hMin.toISOString()).lte('date', future3hMax.toISOString());
    for (const ls3 of (lessons3h || [])) {
      const key3h = `hw3h_${ls3.id}`;
      if (!notifiedEvents.has(key3h) && ls3.students) {
        notifiedEvents.add(key3h);
        const doss = parseStudentDossierBot(ls3.students);
        if (doss.tgId) {
          const targetIds = (doss.tgId || '').split(',').map(s => s.trim()).filter(Boolean);
          const timeStr = new Date(ls3.date).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Minsk', hour: '2-digit', minute: '2-digit' });
          const { data: prev } = await db.from('lessons').select('*').eq('student_id', ls3.student_id).eq('status', 'Проведен').order('date', { ascending: false }).limit(1).maybeSingle();
          if (prev && prev.homework && !prev.homework.includes('[ДЗ_ПРОВЕРЕНО]') && !prev.homework.includes('[ДЗ_СДАНО]')) {
            const curStreak = parseInt(doss.streak, 10) || 1;
            const streakAlert = `🔥⚠️ *ВНИМАНИЕ, ${ls3.students.name.toUpperCase()}! ТВОЙ СТРИК ПОД УГРОЗОЙ!* ⚠️🔥\n\nДо нашего урока осталось меньше 3 часов (*начало сегодня в ${timeStr}*), а домашнее задание ещё не сдано!\n\n🔥 Твой ударный режим: *${curStreak} ДЗ подряд!*\n⏳ Если не прислать ответ или фото тетради до *${timeStr}*, твой огонёк сгорит! 😱\n\n👇 Скорее выполняй задание ниже и присылай фото тетрадки или ответ прямо сюда в чат, чтобы спасти свой стрик и получить +15 XP! 💪🚀`;
            for (const tid of targetIds) {
              await bot.sendMessage(tid, streakAlert, { parse_mode: 'Markdown' }).catch(() => {});
            }
            await sendHomeworkToStudentBot(ls3.students, prev, true, `сегодня в ${timeStr}`);
            if (CHAT_ID) {
              bot.sendMessage(CHAT_ID, `🔥 Отправил *${ls3.students.name}* триггер «Сгорающий стрик 🔥 ${curStreak}» и ДЗ за 3 часа до сегодняшнего урока в *${timeStr}*!`, { parse_mode: 'Markdown' }).catch(() => {});
            }
          } else {
            const remindMsg = `⏰ *Привет, ${ls3.students.name}!*\nСегодня в *${timeStr}* у нас урок английского с Игорем! 🇬🇧\n\n💡 Повтори 5 слов перед занятием, чтобы размяться и заработать баллы:`;
            const remindKb = [
              [{ text: '🔤 5 слов урока', callback_data: `student_words:${ls3.students.id}` }],
              [{ text: '🃏 Флеш-карточки', callback_data: `student_flashcards:${ls3.students.id}:0` }],
              [{ text: '📝 Тестик по уроку', callback_data: `student_poll_quiz:${ls3.students.id}` }]
            ];
            for (const tid of targetIds) {
              await bot.sendMessage(tid, remindMsg, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: remindKb }
              }).catch(() => {});
            }
            if (CHAT_ID) {
              bot.sendMessage(CHAT_ID, `⏰ Отправил напоминание *${ls3.students.name}* о сегодняшнем уроке в *${timeStr}* (ДЗ уже сдано ✅)!`, { parse_mode: 'Markdown' }).catch(() => {});
            }
          }
        }
      }
    }
    const finishedPast = new Date(now.getTime() - 180 * 60000);
    const finishedFuture = new Date(now.getTime() - 55 * 60000);
    const { data: finishedLessons } = await db.from('lessons')
      .select('*, students(name, price)')
      .eq('status', 'Запланирован')
      .gte('date', finishedPast.toISOString())
      .lte('date', finishedFuture.toISOString());

    if (finishedLessons && finishedLessons.length > 0 && CHAT_ID) {
      for (const ls of finishedLessons) {
        const doneKey = `done_${ls.id}`;
        if (!notifiedEvents.has(doneKey)) {
          notifiedEvents.add(doneKey);
          const stName = ls.students?.name || 'Ученик';
          const price = ls.students?.price || 0;
          bot.sendMessage(CHAT_ID, `🎓 *Урок с ${stName} завершился!*\nКак прошло занятие? Отметь в 1 клик:`, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '✅ Проведён (ожидает оплаты)', callback_data: `lesson_done_unpaid:${ls.id}` }],
                [{ text: `💰 Проведён и сразу оплачен (+${price} BYN)`, callback_data: `lesson_done_paid:${ls.id}` }],
                [{ text: '❌ Отменён', callback_data: `lesson_cancel:${ls.id}` }]
              ]
            }
          }).catch(() => {});
        }
      }
    }
    const future15 = new Date(now.getTime() + 16 * 60000); // 15-16 минут вперед
    const past15 = new Date(now.getTime() + 14 * 60000);

    const { data: lessonsData } = await db.from('lessons')
      .select('*, students(*)')
      .eq('status', 'Запланирован')
      .gte('date', past15.toISOString())
      .lte('date', future15.toISOString());

    if (lessonsData && lessonsData.length > 0) {
      for (const ls of lessonsData) {
        if (!notifiedEvents.has(ls.id)) {
          notifiedEvents.add(ls.id);
          const st = ls.students || {};
          const stName = st.name || 'Ученик';
          const doss = parseStudentDossierBot(st);
          const hwWarmupErrors = extractHwWarmupErrorsFromDossier(doss);
          const { data: prevList } = await db.from('lessons').select('*').eq('student_id', ls.student_id).eq('status', 'Проведен').order('date', { ascending: false }).limit(1);
          const prev = prevList?.[0];
          const prevHwRaw = prev ? ((prev.homework || '').split('\\n[МАТЕРИАЛЫ]:')[0].trim()) : '';
          const isHwChecked = prevHwRaw.includes('[ДЗ_ПРОВЕРЕНО]');
          const prevHwClean = prevHwRaw.replace('[ДЗ_ПРОВЕРЕНО]', '').trim();
          let briefMsg = `👨‍🏫 *ТВОЯ ШПАРГАЛКА ПЕРЕД УРОКОМ (Видно ТОЛЬКО тебе!)*\n` +
            `🔔 *Урок через 15 минут:* *${stName}* (${st.grade || 'уровень не указан'})\n` +
            `🔒 _(Ученик это сообщение НЕ видит — это твоё закрытое методическое досье)_\n\n`;
          if (ls.topic) briefMsg += `📚 *Тема сегодня:* ${ls.topic}\n`;
          if (prev) briefMsg += `⏪ *Прошлый урок (${new Date(prev.date).toLocaleDateString('ru-RU')}):* ${prev.topic || 'Без темы'}\n`;
          if (prevHwClean) briefMsg += `📌 *ПРОВЕРИТЬ ДЗ:* ${prevHwClean} ${isHwChecked ? '✅' : '⚠️'}\n`;
          if (hwWarmupErrors) briefMsg += `\n🎯 *5-МИНУТКА ПО ОШИБКАМ ИЗ СДАННОГО ДЗ:*\n${hwWarmupErrors}\n\n`;
          if (doss.errors) briefMsg += `⚠️ *Слабые места (на что обратить внимание):* ${doss.errors}\n`;
          if (doss.interests) briefMsg += `🎯 *Интересы (для живых примеров):* ${doss.interests}\n`;
          const { data: cond15 } = await db.from('lessons').select('*').eq('student_id', ls.student_id).eq('status', 'Проведен').order('date', { ascending: false }).limit(15);
          const ebbLesson = (cond15 || []).find(c => c.topic && (Date.now() - new Date(c.date).getTime() >= 10 * 86400000) && (Date.now() - new Date(c.date).getTime() <= 25 * 86400000));
          if (ebbLesson) briefMsg += `🔄 *Интервальное повторение (Эббингауз):* повторить «${ebbLesson.topic}»\n`;
          if (doss.unit) briefMsg += `📖 *Учебник/Unit:* ${doss.unit}\n`;
          const kb = [
            [
              { text: '🔮 Промпт для Perplexity', callback_data: `lesson_perplexity:${ls.id}` },
              { text: '🎲 Разминка + ДЗ', callback_data: `lesson_prep:${ls.id}` }
            ],
            [
              { text: '🎮 Игра на 5 минут', callback_data: `lesson_game:${ls.id}` },
              { text: '🎤 Написать/Голосовое ученику', callback_data: `teacher_reply_st:${ls.student_id}` }
            ]
          ];
          if (prev && prevHwClean && !isHwChecked) {
            kb.push([{ text: '✅ Отметить прошлое ДЗ проверенным', callback_data: `lesson_hw_checked:${prev.id}` }]);
          }
          if (ADMIN_CHAT_ID) {
            bot.sendMessage(ADMIN_CHAT_ID, briefMsg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } }).catch(() => {
              bot.sendMessage(CHAT_ID, briefMsg, { reply_markup: { inline_keyboard: kb } }).catch(() => {});
            });
          }
        }
      }
    }
    if (false) { db.from('lessons')
      .select('*, students(name)')
      .eq('status', 'Запланирован')
      .gte('date', past15.toISOString())
      .lte('date', future15.toISOString());

    if (lessonsData && lessonsData.length > 0) {
      for (const ls of lessonsData) {
        if (!notifiedEvents.has(ls.id)) {
          notifiedEvents.add(ls.id);
          const stName = ls.students?.name || 'Ученик';
          sendProactiveMessage(`🔔 **Урок через 15 минут!**\nУченик: ${stName}\n📚 Тема: ${ls.topic || 'Без темы'}\n✏️ ДЗ: ${ls.homework || 'Не задано'}`); }
        }
      }
    }
  } catch (e) {
    console.error('Cron reminders check error:', e);
  }
}, { timezone: 'UTC' });

// ---- HTTP Server for Render Health Checks & Notifications ----
const http = require('http');
const PORT = process.env.PORT || 80;
http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/notify-pomodoro') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { action, taskTitle } = payload;
        
        let message = '';
        if (action === 'start') {
          message = `🍅 **Помодоро запущен!**\nФокус: "${taskTitle || 'Без названия'}"\nУдачи! Не отвлекайся 🚀`;
        } else if (action === 'pause') {
          message = `⏸️ **Помодоро на паузе.**\nФокус: "${taskTitle || 'Без названия'}"`;
        } else if (action === 'complete') {
          message = `🎉 **Помодоро завершен!**\nФокус: "${taskTitle || 'Без названия'}"\nВремя отдохнуть! ☕`;
        } else if (action === 'stop') {
          message = `⏹️ **Помодоро остановлен.**\nФокус: "${taskTitle || 'Без названия'}"`;
        }

        if (message && CHAT_ID) {
          await bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'CHAT_ID not set or action unknown' }));
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Default Health-Check
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
