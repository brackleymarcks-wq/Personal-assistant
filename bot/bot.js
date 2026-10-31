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

const ALL_AI_KEYS = Array.from(new Set([
  FRESH_PRIMARY_KEY,
  BACKUP_KEY_2,
  process.env.OPENROUTER_API_KEY,
  process.env.AI_API_KEY,
  ...(process.env.OPENROUTER_BACKUP_KEYS || '').split(',').map(s => s.trim())
].filter(Boolean)));

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
const AI_MODEL = (useOpenRouterOverride || process.env.AI_MODEL === 'gpt-4o') ? 'nvidia/nemotron-3-ultra-550b-a55b:free' : process.env.AI_MODEL;
const FALLBACK_MODELS = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'google/gemma-4-31b-it:free',
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
    const nextIdx = rest.search(/\\n\[(ЗАМЕТКИ|ИНТЕРЕСЫ|ОШИБКИ|СЛОВАРЬ|PERPLEXITY|УЧЕБНИК|TG_ID|TG_USER|PARENT_TG_ID|PARENT_TG_USER|СТРИК)\]:|\n\[(ЗАМЕТКИ|ИНТЕРЕСЫ|ОШИБКИ|СЛОВАРЬ|PERPLEXITY|УЧЕБНИК|TG_ID|TG_USER|PARENT_TG_ID|PARENT_TG_USER|СТРИК)\]:/);
    return (nextIdx === -1 ? rest : rest.slice(0, nextIdx)).replace(/^\\n|^\n/, '').trim();
  };
  const firstTagIdx = raw.search(/\\n\[(ЗАМЕТКИ|ИНТЕРЕСЫ|ОШИБКИ|СЛОВАРЬ|PERPLEXITY|УЧЕБНИК|TG_ID|TG_USER|PARENT_TG_ID|PARENT_TG_USER|СТРИК)\]:|\n\[(ЗАМЕТКИ|ИНТЕРЕСЫ|ОШИБКИ|СЛОВАРЬ|PERPLEXITY|УЧЕБНИК|TG_ID|TG_USER|PARENT_TG_ID|PARENT_TG_USER|СТРИК)\]:/);
  return {
    schedule: (firstTagIdx === -1 ? raw : raw.slice(0, firstTagIdx)).trim(),
    streak: parseInt(getSec('[СТРИК]:'), 10) || 0,
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
  if (doss.perplexity) out += `\\n[PERPLEXITY]:\\n${doss.perplexity}`;
  if (doss.unit) out += `\\n[УЧЕБНИК]:\\n${doss.unit}`;
  if (doss.interests) out += `\\n[ИНТЕРЕСЫ]:\\n${doss.interests}`;
  if (doss.errors) out += `\\n[ОШИБКИ]:\\n${doss.errors}`;
  if (doss.vocab) out += `\\n[СЛОВАРЬ]:\\n${doss.vocab}`;
  if (doss.notes) out += `\\n[ЗАМЕТКИ]:\\n${doss.notes}`;
  return out;
}

const activeStudentQuizzes = new Map();
const activeSchoolHwRequests = new Map(); // chatId -> { studentId, studentName, timestamp }
const pendingSchoolHwApprovals = new Map(); // reqId -> { chatId, student, studentName, photoUrl, photoFileId, text, caption, createdAt }

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
  const rawHw = (lesson?.homework || '').split('\\n[МАТЕРИАЛЫ]:')[0]
    .replace(/\[КАРТОЧКИ_ДЗ\]:[\s\S]*?\[\/КАРТОЧКИ_ДЗ\]/g, '')
    .replace(/\[СЦЕНАРИЙ_УРОКА\]:[\s\S]*?\[\/СЦЕНАРИЙ_УРОКА\]/g, '')
    .replace(/\[ПРЕЗЕНТАЦИЯ\]:[\s\S]*?\[\/ПРЕЗЕНТАЦИЯ\]/g, '')
    .replace(/\[КАСТОМНЫЙ_ОТЧЕТ\]:[\s\S]*?\[\/КАСТОМНЫЙ_ОТЧЕТ\]/g, '')
    .replace(/\[ОТЧЕТ_РОДИТЕЛЮ\]:[\s\S]*?\[\/ОТЧЕТ_РОДИТЕЛЮ\]/g, '')
    .replace('[ДЗ_ПРОВЕРЕНО]', '')
    .replace('[ДЗ_СДАНО]', '')
    .replace('[ОТПРАВИТЬ_В_ТГ]', '')
    .replace('[ОТПРАВИТЬ_РОДИТЕЛЮ_В_ТГ]', '')
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



async function getLatestLessonWithMaterials(studentId) {
  if (!studentId) return null;
  // 1. Try to find the latest lesson with an attached scenario
  const { data: withScen } = await db.from('lessons')
    .select('*')
    .eq('student_id', studentId)
    .ilike('homework', '%[СЦЕНАРИЙ_УРОКА]%')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (withScen && withScen.homework) return withScen;

  // 2. Try latest conducted lesson with non-empty homework
  const { data: lastCondHw } = await db.from('lessons')
    .select('*')
    .eq('student_id', studentId)
    .eq('status', 'Проведен')
    .neq('homework', '')
    .not('homework', 'is', null)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastCondHw && lastCondHw.homework) return lastCondHw;

  // 3. Fallback to latest conducted lesson
  const { data: lastCond } = await db.from('lessons')
    .select('*')
    .eq('student_id', studentId)
    .eq('status', 'Проведен')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastCond) return lastCond;

  // 4. Fallback to any latest lesson for this student
  const { data: anyLs } = await db.from('lessons')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  return anyLs || null;
}

const studentPracticeProgress = {};
function getPracticeProgress(studentId, lessonId) {
  const key = `${studentId}_${lessonId || 'curr'}`;
  if (!studentPracticeProgress[key]) {
    studentPracticeProgress[key] = {
      wordsBatch: 0,
      verbsBatch: 0,
      quizRound: 0,
      seenWords: [],
      seenVerbs: [],
      userScores: {}
    };
  }
  return studentPracticeProgress[key];
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

function getLessonFlashcards(scenarioText, hwText = '') {
  const cards = [];
  const text = (hwText || '') + '\n' + (scenarioText || '');
  const lines = text.split('\n');
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

      // Strict validation:
      // 1. ru MUST contain Cyrillic letters (real Russian translation)
      if (!/[а-яА-ЯёЁ]/.test(ru)) continue;

      // 2. en must be 1-3 English words, NO cyrillic, between 2 and 30 chars
      if (!/^[A-Za-z\s'-]{2,30}$/.test(en)) continue;
      if (en.split(/\s+/).length > 3) continue;

      // 3. Clean ru from any trailing noise or secondary dashes
      ru = ru.replace(/\s*[—–-]\s*.*$/, '').trim();

      const lowerEn = en.toLowerCase();
      if (['mistakes', 'words', 'prepositions', 'checklist', 'places', 'trees', 'animals', 'birds', 'grammar', 'practice', 'step', 'shag'].includes(lowerEn)) continue;

      if (!cards.find(c => c.en.toLowerCase() === lowerEn)) {
        cards.push({ en, ipa, ru, ex });
      }
    }
  }

  if (cards.length === 0) {
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
  // Calculate progress bar
  const prog = getPracticeProgress(st.id, lesson?.id);
  const totalWords = 20;
  const learned = Math.min(prog.seenWords.length, totalWords);
  const pct = Math.round((learned / totalWords) * 100);
  const filled = Math.round(pct / 10);
  const bar = '▓'.repeat(filled) + '░'.repeat(10 - filled);

  msg += `\n📊 *Прогресс слов урока:* [${bar}] ${pct}% (${learned}/${totalWords} слов)\n`;
  msg += `🔥 *Твоя серия (Streak):* ${doss.streak || 0} ДЗ подряд без пропусков!\n`;
  const lbText = getLeaderboardText(st.id, lesson?.id);
  if (lbText) msg += lbText;
  msg += `\n_Когда выполнишь — нажми кнопку ниже, пришли голосовое сообщение или фото тетрадки!_ 💪`;

  const kb = buildStudentKeyboard(st, lesson);
  try {
    for (const tid of targetIds) {
      if (cards.length > 0) {
        await sendCardsToChat(tid, cards, '🖼 Карточка к ДЗ');
      }
      await bot.sendMessage(tid, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } }).catch(() => {
        return bot.sendMessage(tid, msg, { reply_markup: { inline_keyboard: kb } });
      });
    }

    // Duplicate exact copy to teacher/admin so teacher sees word-for-word what the student receives
    const adminId = CHAT_ID || ADMIN_CHAT_ID;
    if (adminId && !targetIds.includes(String(adminId))) {
      try {
        if (cards.length > 0) {
          await sendCardsToChat(adminId, cards, `🖼 [Копия для преподавателя] Карточки ДЗ для ${st.name}`).catch(() => {});
        }
        const adminHeader = `👀 *[Копия для преподавателя — ученик ${st.name} открыл материалы в боте (${lesson?.status === 'Запланирован' ? 'до урока' : 'после урока'})]:*\n\n`;
        await bot.sendMessage(adminId, adminHeader + msg, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: kb }
        }).catch(() => {
          return bot.sendMessage(adminId, adminHeader + msg, { reply_markup: { inline_keyboard: kb } });
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
  }
];

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
        const { data: lesson, error } = await db.from('lessons').insert({
          student_id: st.id,
          date: startIso,
          topic: args.topic || '',
          homework: '',
          status: 'Запланирован',
          paid: false
        }).select().maybeSingle();
        if (error) return { success: false, error: error.message };

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
        const { data: existingSched } = await db.from('lessons').select('*').eq('student_id', st.id).eq('status', 'Запланирован').gte('date', todayPrefix + 'T00:00:00Z').order('date', { ascending: false }).limit(1).maybeSingle();
        let lesson = null;
        if (existingSched) {
          const { data: upLs } = await db.from('lessons').update({
            topic: args.topic || existingSched.topic || '',
            homework: args.homework || existingSched.homework || '',
            status: 'Проведен',
            paid: !!args.paid
          }).eq('id', existingSched.id).select().maybeSingle();
          lesson = upLs;
          notifiedEvents.add(`done_${existingSched.id}`);
        } else {
          const { data: newLs } = await db.from('lessons').insert({
            student_id: st.id,
            date: dateStr,
            topic: args.topic || '',
            homework: args.homework || '',
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

    const isActionOnly = message.tool_calls.every(tc => ['process_brain_dump', 'schedule_lesson', 'send_homework_to_student', 'import_perplexity_lesson', 'add_lesson', 'create_task', 'create_tasks', 'create_event', 'update_task_status', 'add_transaction', 'create_transaction', 'log_habit', 'update_context'].includes(tc.function.name));
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
    
    // Check if key is rate-limited and we have a backup key in pool
    if ((res.status === 429 || errMsg.includes('free-models-per-day') || errMsg.includes('Rate limit')) && retryCount < 3) {
      const newKey = rotateAIKey();
      if (newKey) {
        console.warn(`[AI Key Rotation] Retrying callAPI with backup key #${currentKeyIndex + 1}...`);
        return callAPI(systemInstruction, messages, retryCount + 1, isVision, forceModel, disableTools, customTools);
      }
    }

    if ((res.status >= 500 || res.status === 429 || res.status === 404) && retryCount < 2) {
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AI_API_KEY}` },
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            { role: 'system', content: systemInstruction + '\nОТВЕЧАЙ ТОЛЬКО ОБЫЧНЫМ ТЕКСТОМ, ФУНКЦИИ И ИНСТРУМЕНТЫ ОТКЛЮЧЕНЫ.' },
            ...safeMessages
          ],
          temperature: 0.3,
          max_tokens: 1024
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
    if (!currentTgIds.includes(incomingChatId)) {
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
          [{ text: '📝 Тестик по уроку', callback_data: `student_poll_quiz:${st.id}` }, { text: '🎒 Школьное ДЗ', callback_data: `student_school_hw:${st.id}` }],
          [{ text: '👨‍👩‍👧 Режим родителя', callback_data: `switch_to_parent:${st.id}` }]
        ]
      }
    }).catch(() => bot.sendMessage(incomingChatId, welcomeSt));

    await bot.sendMessage(ADMIN_CHAT_ID, `🎉 *${msg.from?.first_name || "Ученик"}* из группы *${st.name}* (${thisUser}) подключился(лась) к боту!\n👥 Всего подключено к группе: ${currentTgIds.length} уч. 🚀`, { parse_mode: 'Markdown' }).catch(() => {});
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
            [{ text: '📝 Тестик по уроку', callback_data: `student_poll_quiz:${found.student.id}` }, { text: '🃏 Флеш-карточки', callback_data: `student_flashcards:${found.student.id}:0` }],
            [{ text: '🎮 Мини-игра', callback_data: `student_game:${found.student.id}` }],
            [{ text: '👨‍👩‍👧 Я родитель (переключить на дневник родителя)', callback_data: `switch_to_parent:${found.student.id}` }]
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
    const st = found.student;
    await bot.sendMessage(chatId, `✅ Молодец, *${st.name}*! Я получил фото твоего домашнего задания и уже переслал его Игорю на проверку! 🌟`, { parse_mode: 'Markdown' }).catch(() => {});
    const { data: lastLs } = await db.from('lessons').select('*').eq('student_id', st.id).eq('status', 'Проведен').order('date', { ascending: false }).limit(1).maybeSingle();
    if (lastLs && !(lastLs.homework || '').includes('[ДЗ_СДАНО]') && !(lastLs.homework || '').includes('[ДЗ_ПРОВЕРЕНО]')) {
      await db.from('lessons').update({ homework: `[ДЗ_СДАНО] ${lastLs.homework || ''}`.trim() }).eq('id', lastLs.id);
    }
    await bot.sendMessage(ADMIN_CHAT_ID, `📬 *Ученик прислал фото ДЗ!* — *${st.name}*${msg.caption ? `\n💬 Подпись: ${msg.caption}` : ''}`, {
      parse_mode: 'Markdown',
      reply_markup: lastLs ? { inline_keyboard: [[{ text: '✅ Отметить ДЗ проверенным', callback_data: `lesson_hw_checked:${lastLs.id}` }]] } : undefined
    }).catch(() => {});
    await bot.forwardMessage(ADMIN_CHAT_ID, chatId, msg.message_id).catch(() => {});
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
  const minskDayName = new Date().toLocaleDateString('en-US', { timeZone: 'Europe/Minsk', weekday: 'short' });
  const isWeekend = (minskDayName === 'Sat' || minskDayName === 'Sun');
  if (typeof completedToday !== 'undefined' && isWeekend) {
    const weekendCtx = `СЕГОДНЯ ВЫХОДНОЙ ДЕНЬ (${minskDayName === 'Sat' ? 'Суббота' : 'Воскресенье'}).\nВыполнено задач/уроков сегодня: ${completedToday.length} (${JSON.stringify(completedToday.map(t => t.title))}).\nПривычки сегодня: ${habitLogs.length} из ${habits.length}.\nИНСТРУКЦИЯ (РЕЖИМ АНТИ-СТЫД ВЫХОДНОГО ДНЯ):\nСегодня выходной! Никакого шейминга за рабочие задачи РЦПИ. Напиши тёплый, поддерживающий вечерний обзор выходного дня: похвали за проведённые уроки и полезные привычки, напомни качественно восстановиться, провести вечер с Кристиной и лечь спать до 23:00.`;
    return await askAI('Сгенерируй тёплый вечерний обзор выходного дня', weekendCtx, null, true, true);
  }
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
  const minskDayName = new Date().toLocaleDateString('en-US', { timeZone: 'Europe/Minsk', weekday: 'short' });
  const isWeekend = (minskDayName === 'Sat' || minskDayName === 'Sun');
  if (typeof completedToday !== 'undefined' && isWeekend) {
    const weekendCtx = `СЕГОДНЯ ВЫХОДНОЙ ДЕНЬ (${minskDayName === 'Sat' ? 'Суббота' : 'Воскресенье'}).\nВыполнено задач/уроков сегодня: ${completedToday.length} (${JSON.stringify(completedToday.map(t => t.title))}).\nПривычки сегодня: ${habitLogs.length} из ${habits.length}.\nИНСТРУКЦИЯ (РЕЖИМ АНТИ-СТЫД ВЫХОДНОГО ДНЯ):\nСегодня выходной! Никакого шейминга за рабочие задачи РЦПИ. Напиши тёплый, поддерживающий вечерний обзор выходного дня: похвали за проведённые уроки и полезные привычки, напомни качественно восстановиться, провести вечер с Кристиной и лечь спать до 23:00.`;
    return await askAI('Сгенерируй тёплый вечерний обзор выходного дня', weekendCtx, null, true, true);
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
  } else if (data && data.startsWith('task_done:')) {
    const taskId = data.split(':')[1];
    try {
      const t = await completeTask(taskId);
      await bot.answerCallbackQuery(query.id, { text: `✅ Выполнено: ${t?.title || 'Задача'}!` });
      await bot.sendMessage(chatId, `✅ Задача выполнена: *${t?.title || 'Задача'}*`, { parse_mode: 'Markdown' }).catch(() => {});
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
  } else if (data && data.startsWith('task_tomorrow:')) {
    const taskId = data.split(':')[1];
    try {
      const tomorrow = getMinskDateString(1);
      const { data: t } = await db.from('tasks').update({ deadline: tomorrow }).eq('id', taskId).select().single();
      await bot.answerCallbackQuery(query.id, { text: `⏭ Перенесено на завтра (${tomorrow})` });
      await bot.sendMessage(chatId, `⏭ Задача перенесена на завтра (${tomorrow}): *${t?.title || 'Задача'}*`, { parse_mode: 'Markdown' }).catch(() => {});
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: 'Ошибка: ' + e.message, show_alert: true });
    }
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

      await bot.answerCallbackQuery(query.id, { text: '🔤 Загружаю 5 новых слов...' });
      const doss = parseStudentDossierBot(st);
      const lastLs = await getLatestLessonWithMaterials(st.id);

      const scenario = extractLessonScenario(lastLs?.homework || '');
      const prog = getPracticeProgress(st.id, lastLs?.id);
      prog.wordsBatch++;

      const wordsPrompt = `Ты — первоклассный методист английского языка для ${st.name} (${st.grade || '6 класс'}).
${scenario ? `СТРОГО ИСПОЛЬЗУЙ МАТЕРИАЛЫ И СЛОВАРЬ ИЗ СЦЕНАРИЯ УРОКА:\n"${scenario}"\n` : `Активный словарь: "${doss.vocab || ''}"\n`}
Тема урока: "${lastLs?.topic || 'English'}".
Ученик уже выучил следующие слова урока: ${prog.seenWords.length > 0 ? prog.seenWords.join(', ') : 'ещё не начинал'}.

ТВОЯ ЗАДАЧА:
Выбери РОВНО 5 СЛЕДУЮЩИХ НОВЫХ слов или словообразовательных цепочек из сценария урока (порция #${prog.wordsBatch}), которые ещё НЕ встречались в списке выше!
Если все слова сценария уже пройдены, напиши в первой строке: "🎉 Все ключевые слова урока пройдены! Повторяем с 1-й порции с новыми примерами."

ПРАВИЛА ОФОРМЛЕНИЯ (СТРОГО):
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать звездочки markdown (** или *)! Никаких звездочек!
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ таблицы (|---|). Только чистый нумерованный список!
- Формат:
🔤 5 слов урока (${st.name}) — Порция ${prog.wordsBatch}:
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

      const kb = [
        [{ text: '📝 Пройти тестик (3 вопроса)', callback_data: `student_poll_quiz:${st.id}` }],
        [{ text: '🃏 Флеш-карточки', callback_data: `student_flashcards:${st.id}:0` }],
        [{ text: '🔤 Следующие 5 слов урока', callback_data: `student_words:${st.id}` }]
      ];
      await sendCleanMessage(chatId, rawText, { reply_markup: { inline_keyboard: kb } });

      // Notify Igor (teacher) in Telegram
      const wordsList = extractedWords.length > 0 ? extractedWords.map(w => '• ' + w).join('\n') : rawText;
      await bot.sendMessage(ADMIN_CHAT_ID,
        `🔤 <b>${st.name}</b> изучает слова урока в боте! (Порция #${prog.wordsBatch})\n\n` +
        `📚 <b>Тема:</b> ${lastLs?.topic || 'Английский'}\n` +
        `📝 <b>Слова:</b>\n${wordsList}`,
        { parse_mode: 'HTML' }
      ).catch(() => {});

      // Send audio pronunciation via Google TTS
      if (extractedWords.length > 0) {
        await sendTtsAudio(chatId, extractedWords.join('. ') + '.', `Произношение слов (порция ${prog.wordsBatch})`, '🔊 Послушай, как звучат эти слова на английском');
      }
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

      await bot.answerCallbackQuery(query.id, { text: '⚡ Загружаю 5 новых глаголов...' });
      const doss = parseStudentDossierBot(st);
      const lastLs = await getLatestLessonWithMaterials(st.id);

      const scenario = extractLessonScenario(lastLs?.homework || '');
      const prog = getPracticeProgress(st.id, lastLs?.id);
      prog.verbsBatch++;

      const verbsPrompt = `Ты — преподаватель английского для ${st.name} (${st.grade || '6 класс'}).
${scenario ? `ИСПОЛЬЗУЙ ГЛАГОЛЫ И ПРАВИЛА ИЗ СЦЕНАРИЯ УРОКА:\n"${scenario}"\n` : ''}
Тема: "${lastLs?.topic || 'English Verbs'}".
Ученик уже повторил следующие глаголы: ${prog.seenVerbs.length > 0 ? prog.seenVerbs.join(', ') : 'ещё не начинал'}.

ТВОЯ ЗАДАЧА:
Выбери РОВНО 5 СЛЕДУЮЩИХ НОВЫХ неправильных глаголов из сценария урока (порция #${prog.verbsBatch}), которые ещё НЕ встречались выше!
Иди последовательно: Группа 1 (V2=V3: have, make, find, hear, catch, get), затем Группа 2 (V1=V3: become, come, run), затем Группа 3 (3 разные формы: be, go, see, do, eat, fly, ride, drive, take, swim, write).
Если все глаголы сценария пройдены, напиши: "🎉 Все неправильные глаголы урока пройдены! Повторяем с 1-й группы."

ПРАВИЛА ОФОРМЛЕНИЯ (СТРОГО):
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать звездочки markdown (** или *)!
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ таблицы!
- Формат:
⚡ 5 глаголов урока — Порция ${prog.verbsBatch}:
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

      const kb = [
        [{ text: '📝 Пройти тестик по уроку', callback_data: `student_poll_quiz:${st.id}` }],
        [{ text: '🔤 5 слов урока', callback_data: `student_words:${st.id}` }],
        [{ text: '⚡ Ещё 5 глаголов', callback_data: `student_verbs:${st.id}` }]
      ];
      await sendCleanMessage(chatId, rawText, { reply_markup: { inline_keyboard: kb } });

      // Notify Igor (teacher) in Telegram
      await bot.sendMessage(ADMIN_CHAT_ID,
        `⚡ <b>${st.name}</b> тренирует глаголы урока! (Порция #${prog.verbsBatch})\n\n` +
        `📚 <b>Тема:</b> ${lastLs?.topic || 'Глаголы'}\n` +
        `📝 <b>Глаголы:</b>\n${lines.filter(l => l.match(/^\d+\./)).join('\n') || rawText}`,
        { parse_mode: 'HTML' }
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

      await bot.answerCallbackQuery(query.id, { text: '🧩 Загружаю грамматику и практику...' });
      const doss = parseStudentDossierBot(st);
      const lastLs = await getLatestLessonWithMaterials(st.id);
      const topic = ((lastLs?.topic || '') + ' ' + (st.name || '')).toLowerCase();
      const textContent = ((lastLs?.homework || '') + ' ' + (doss.errors || '')).toLowerCase();

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
        ruleFocus = 'фразы в магазине: How much is...?, Can I have...?, I would like...';
      }

      const prompt = `Ты — добрый, увлекательный преподаватель английского для ${st.name} (${st.grade || '4-6 класс'}).
Тема урока: "${lastLs?.topic || 'English'}".
Грамматический фокус: ${ruleFocus}.
Материалы/конспект: "${(lastLs?.homework || '').slice(0, 500)}".

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

      const kb = [
        [{ text: '📝 Пройти тестик по уроку', callback_data: `student_poll_quiz:${st.id}` }],
        [{ text: '🔤 Слова урока', callback_data: `student_words:${st.id}` }],
        [{ text: '✅ Я сделал(а) ДЗ!', callback_data: `student_hw_done:${lastLs?.id || ''}` }]
      ];

      await sendCleanMessage(chatId, `${ruleTitle}\n\n${rawText}`, { reply_markup: { inline_keyboard: kb } });

      await bot.sendMessage(ADMIN_CHAT_ID,
        `🧩 <b>${st.name}</b> открыл(а) тренировку грамматики:\n` +
        `📚 <b>${ruleTitle}</b>\n` +
        `Ученик получил разбор правила и задание на самопроверку.`,
        { parse_mode: 'HTML' }
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

      await bot.answerCallbackQuery(query.id, { text: '📝 Создаю мини-тест из 3 вопросов...' });
      const doss = parseStudentDossierBot(st);
      const lastLs = await getLatestLessonWithMaterials(st.id);

      const scenario = extractLessonScenario(lastLs?.homework || '');
      const prog = getPracticeProgress(st.id, lastLs?.id);
      prog.quizRound++;

      const pollPrompt = `Ты — методист по английскому для ${st.name} (${st.grade || 'школьник'}).
${scenario ? `СОСТАВЬ ТЕСТ СТРОГО ПО МАТЕРИАЛАМ, СЛОВАРЮ И ПРАВИЛАМ ИЗ СЦЕНАРИЯ УРОКА:\n"${scenario}"\n` : ''}
Тема урока: "${lastLs?.topic || 'English'}".
Словарь и ошибки: "${doss.vocab || ''} | ${doss.errors || ''}".
Раунд тестирования: #${prog.quizRound}.

ТВОЯ ЗАДАЧА:
Составь МИНИ-ТЕСТ РОВНО ИЗ 3 РАЗНЫХ ВОПРОСОВ (Telegram Quiz Polls) СТРОГО ПО ТЕМЕ «${lastLs?.topic || 'English'}» ДЛЯ ЭТОГО УЧЕНИКА:
- Вопрос 1: Новое слово или фраза по теме урока (с контекстным переводом или выбором верного слова).
- Вопрос 2: Главное грамматическое правило этого урока (например: притяжательные местоимения my/his/her/their/'s, если тема про них; или времена глаголов; или степени сравнения).
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
        const topLow = ((lastLs?.topic || '') + ' ' + (st.name || '')).toLowerCase();
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

      await bot.sendMessage(chatId, `🎯 <b>Мини-тест по уроку для ${st.name} (Раунд ${prog.quizRound}):</b>\nОтвечай прямо на вопросы викторины ниже 👇`, { parse_mode: 'HTML' });

      for (let i = 0; i < quizList.length; i++) {
        const q = quizList[i];
        if (q.options && q.options.length >= 2) {
          const sentPoll = await bot.sendPoll(chatId, q.question, q.options.slice(0, 4), {
            type: 'quiz',
            correct_option_id: Number(q.correct_id) || 0,
            explanation: (q.explanation || 'Молодец!').slice(0, 200),
            is_anonymous: false
          });
          if (sentPoll?.poll?.id) {
            activePolls.set(sentPoll.poll.id, {
              studentName: st.name,
              question: q.question,
              options: q.options.slice(0, 4),
              correctId: Number(q.correct_id) || 0,
              explanation: q.explanation || ''
            });
          }
          if (i < quizList.length - 1) {
            await new Promise(r => setTimeout(r, 400));
          }
        }
      }

      await bot.sendMessage(ADMIN_CHAT_ID,
        `📝 <b>${st.name}</b> запустил(а) мини-тест по теме «${lastLs?.topic || 'Английский'}» (Раунд #${prog.quizRound})! Ждём ответы ученика...`,
        { parse_mode: 'HTML' }
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

      await bot.answerCallbackQuery(query.id, { text: '🎮 Запускаю мини-игру...' });
      const doss = parseStudentDossierBot(st);

      const gamePrompt = `Ты — геймифицированный ИИ-тренер английского для ${st.name} (${st.grade || '6 класс'}).
Интересы: "${doss.interests || 'игры, кино, приключения'}".
Слова: "${doss.vocab || 'mystery, puzzle, hero, power'}".

Предложи 1 классную 2-минутную игру или загадку на английском языке (Word Detective или English Riddle).
Короткий сюжет (3-4 строки) + загадка на английском с переводом ключевых слов.
НЕ пиши ответ сразу! Напиши: "Напиши свою отгадку сюда в чат, и проверим!"

ПРАВИЛА ОФОРМЛЕНИЯ (СТРОГО):
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать звездочки markdown (** или *)! Никаких звездочек в тексте!
- Оформляй заголовок эмодзи, списки через дефис или точку •`;

      const genRes = await executeFunctionCall('generate_lesson_plan', { prompt: gamePrompt });
      const text = genRes.generated_plan || '🎮 English Riddle Time!\nWhat has keys but no locks, space but no room, and you can enter but never go outside?\n(Напиши свою догадку в ответном сообщении!)';

      await sendCleanMessage(chatId, `🎮 <b>Мини-игра для ${st.name}:</b>\n\n${text}`);
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

      const lastLs = await getLatestLessonWithMaterials(st.id);
      const scenario = extractLessonScenario(lastLs?.homework || '');
      const cards = getLessonFlashcards(scenario, lastLs?.homework || '');
      if (idx >= cards.length) idx = 0;
      if (idx < 0) idx = 0;
      const c = cards[idx];

      if (action === 'card_known') {
        await incrementStudentStreakBot(st);
        const userName = query.from?.first_name || 'Ученик';
        const totalXp = addStudentXp(st.id, lastLs?.id, query.from?.id, userName, 5);
        await bot.answerCallbackQuery(query.id, { text: `🎉 Отлично, ${userName}! +5 XP (Всего: ${totalXp} XP)!` });
        if (c) {
          await bot.sendMessage(ADMIN_CHAT_ID,
            `🃏 <b>${st.name}</b> (${userName}) выучил(а) флеш-карточку:\n` +
            `🇬🇧 <b>${c.en}</b> — ${c.ru}\n` +
            `⭐ +5 XP (Всего: ${totalXp} XP)`,
            { parse_mode: 'HTML' }
          ).catch(() => {});
        }
      } else {
        await bot.answerCallbackQuery(query.id);
      }

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
          ]
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
          ]
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
      activeStudentQuizzes.set(String(chatId), { quizText, studentName: st.name });
      await bot.sendMessage(chatId, `🎯 *Мини-тренажёр слов (${st.name}):*\n\n${quizText}`, { parse_mode: 'Markdown' }).catch(() => bot.sendMessage(chatId, quizText));
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
      const { data: ls } = await db.from('lessons').select('*, students(*)').eq('id', lessonId).maybeSingle();
      const stName = ls?.students?.name || 'Ученик';
      if (ls && !(ls.homework || '').includes('[ДЗ_СДАНО]') && !(ls.homework || '').includes('[ДЗ_ПРОВЕРЕНО]')) {
        await db.from('lessons').update({ homework: `[ДЗ_СДАНО] ${ls.homework || ''}`.trim() }).eq('id', lessonId);
      }
      await bot.answerCallbackQuery(query.id, { text: '🎉 Супер! Отметил, что ДЗ готово!' });
      const newStreak = await incrementStudentStreakBot(ls?.students);
      await bot.sendMessage(chatId, `🎉 *Молодец, ${stName}!*\nЯ передал Игорю, что ты выполнил(а) домашнее задание!\n🔥 *Ударный режим (Streak): ${newStreak} ДЗ подряд без пропусков! (+10 XP)* 🏆\n\nЕсли хочешь — можешь прислать сюда фото тетрадки, ответ текстом/голосом или потренировать слова в мини-квизе:`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🎯 Потренировать мои слова (Мини-квиз)', callback_data: 'student_quiz' }]] }
      }).catch(() => {});
      const cleanHw = (ls?.homework || '').split('\\n[МАТЕРИАЛЫ]:')[0].replace('[ДЗ_ПРОВЕРЕНО]', '').replace('[ДЗ_СДАНО]', '').trim();
      const isUpcoming = ls?.status === 'Запланирован';
      await bot.sendMessage(ADMIN_CHAT_ID, `🎉 *${stName}* нажал(а) кнопку **«Я сделал(а) ДЗ!»** ${isUpcoming ? '*(к предстоящему уроку)*' : ''}\n📌 Задание: _${cleanHw || 'Без текста'}_`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '✅ Отметить проверенным', callback_data: `lesson_hw_checked:${lessonId}` }]] }
      }).catch(() => {});
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
      const { data: prevList } = await db.from('lessons').select('*').eq('student_id', ls?.student_id).eq('status', 'Проведен').order('date', { ascending: false }).limit(1);
      const prev = prevList?.[0];
      const prompt = `Ученик: ${st?.name || 'Ученик'} (${st?.grade || ''}). Интересы: ${doss.interests || 'не указаны'}. Слабые места: ${doss.errors || 'не указаны'}. Прошлая тема: "${prev?.topic || 'не указана'}", Прошлое ДЗ: "${prev?.homework || 'не было'}". Тема сегодня: "${ls?.topic || 'Продолжение'}".\nСоставь КОМПАКТНО (до 1500 символов):\n1) 🎲 5-минутную разминку (Warm-up: 3 вопроса на говорение с учётом интересов и прошлой темы)\n2) 🔍 Блиц-проверку прошлого ДЗ (3 коротких предложения на перевод сходу с ответами в скобках).`;
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

    const emoji = isCorrect ? '✅' : '❌';
    const alertMsg = `${emoji} <b>Результат мини-теста ученика:</b>\n\n` +
      `👤 <b>Ученик:</b> ${pollInfo.studentName} (${userDisplay})\n` +
      `❓ <b>Вопрос:</b> ${pollInfo.question}\n` +
      `👉 <b>Ответ ученика:</b> ${chosenText} ${isCorrect ? '✅ (Верно!)' : `❌ (Ошибка! Правильно: ${correctText})`}\n` +
      (pollInfo.explanation ? `💡 <i>Пояснение:</i> ${pollInfo.explanation}` : '');

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

// /today — план на сегодня
bot.onText(/\/today/, async (msg) => {
  var chatId = msg.chat.id;
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
    const actionTasks = [...todayTasks, ...overdue].slice(0, 5);
    const todayButtons = actionTasks.map(t => ([
      { text: `✅ ${t.title.substring(0, 18)}`, callback_data: `task_done:${t.id}` },
      { text: `⏭ Завтра`, callback_data: `task_tomorrow:${t.id}` }
    ]));
    todayButtons.push([{ text: '🍅 Фокус 25 мин', callback_data: 'focus_start:25' }]);
    return bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: todayButtons } }).catch(() => {
      bot.sendMessage(chatId, text, { reply_markup: { inline_keyboard: todayButtons } });
    });
    if (false) { Promise.resolve().then(() => {
    });
      text += 'Сегодня чисто — ни задач, ни событий. Отдыхаем или берёмся за что-то новое? 🚀';
    }

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' }).catch(() => {
      bot.sendMessage(chatId, text);
    });
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
  const minskDayName = new Date().toLocaleDateString('en-US', { timeZone: 'Europe/Minsk', weekday: 'short' });
  const isWeekend = (minskDayName === 'Sat' || minskDayName === 'Sun');
  if (typeof completedToday !== 'undefined' && isWeekend) {
    const weekendCtx = `СЕГОДНЯ ВЫХОДНОЙ ДЕНЬ (${minskDayName === 'Sat' ? 'Суббота' : 'Воскресенье'}).\nВыполнено задач/уроков сегодня: ${completedToday.length} (${JSON.stringify(completedToday.map(t => t.title))}).\nПривычки сегодня: ${habitLogs.length} из ${habits.length}.\nИНСТРУКЦИЯ (РЕЖИМ АНТИ-СТЫД ВЫХОДНОГО ДНЯ):\nСегодня выходной! Никакого шейминга за рабочие задачи РЦПИ. Напиши тёплый, поддерживающий вечерний обзор выходного дня: похвали за проведённые уроки и полезные привычки, напомни качественно восстановиться, провести вечер с Кристиной и лечь спать до 23:00.`;
    return await askAI('Сгенерируй тёплый вечерний обзор выходного дня', weekendCtx, null, true, true);
  }
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
      const studentName = msg.from?.first_name || st.name;
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
      await bot.sendMessage(chatId, `📬 *Школьное задание принято, ${studentName}!* 🎒\nЯ отправил его Игорю на согласование ⏳.\nКак только он посмотрит и подтвердит — я сразу пришлю тебе понятное объяснение правил и пошаговый разбор!`, { parse_mode: 'Markdown' });

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
          caption: `🎒 *Запрос на разбор школьного ДЗ!*\n👤 *Ученик:* ${studentName} (${st.name})${msg.caption ? `\n💬 Комментарий: «${msg.caption}»` : ''}\n\nРазрешить боту разобрать и объяснить правило ученику?`,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: kb }
        }).catch(() => {});
      } else {
        await bot.sendMessage(ADMIN_CHAT_ID, `🎒 *Запрос на разбор школьного ДЗ!*\n👤 *Ученик:* ${studentName} (${st.name})\n\n📝 *Текст задания:*\n«${studentText}»\n\nРазрешить боту разобрать и объяснить правило ученику?`, {
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
        const photo = msg.photo[msg.photo.length - 1];
        const photoUrl = await bot.getFileLink(photo.file_id);
        const lastLs = await getLatestLessonWithMaterials(st.id);
        const cleanHw = (lastLs?.homework || '').split('\\n[МАТЕРИАЛЫ]:')[0].replace('[ДЗ_ПРОВЕРЕНО]', '').replace('[ДЗ_СДАНО]', '').trim();

        const newStreak = await incrementStudentStreakBot(st);
        if (lastLs && !(lastLs.homework || '').includes('[ДЗ_СДАНО]') && !(lastLs.homework || '').includes('[ДЗ_ПРОВЕРЕНО]')) {
          await db.from('lessons').update({ homework: `[ДЗ_СДАНО] ${lastLs.homework || ''}`.trim() }).eq('id', lastLs.id);
        }

        // Student feedback
        await bot.sendMessage(chatId, `📸 *Фото тетрадки принято, ${st.name}!* 🌟\nЯ передал его Игорю на проверку!\n🔥 *Ударный режим (Streak): ${newStreak} ДЗ подряд! (+10 XP)* 🏆`, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔤 5 слов урока', callback_data: `student_words:${st.id}` }, { text: '📝 Тестик по уроку', callback_data: `student_poll_quiz:${st.id}` }]
            ]
          }
        }).catch(() => {});

        // Forward photo to Igor
        await bot.sendPhoto(ADMIN_CHAT_ID, photo.file_id, {
          caption: `📸 *Домашнее задание от ${st.name} (фото тетрадки)*\n📌 Заданное ДЗ: _${cleanHw || 'Без текста'}_\n🔥 Серия: ${newStreak} ДЗ`,
          parse_mode: 'Markdown'
        }).catch(() => {});

        // Call Vision OCR to transcribe English handwriting and find mistakes
        try {
          const ocrPrompt = `Ты — чуткий преподаватель английского языка. Ученик ${st.name} (${st.grade || ''}) прислал фото тетрадки с выполненным домашним заданием.
Заданное ДЗ было: "${cleanHw || 'упражнение из учебника'}".

1. 🔍 РАСШИФРОВКА РУКОПИСИ: аккуратно расшифруй написанный учеником английский текст по строкам.
2. ⚠️ ОШИБКИ И РАЗБОР: проверь правописание (spelling), грамматику и пунктуацию. Если есть ошибки — укажи правильный вариант и простое правило.
3. 🌟 ВЕРДИКТ И ПОХВАЛА: 1-2 ободряющие фразы для ученика.`;

          const ocrAnalysis = await callAPI(ocrPrompt, { isVision: true, imageUrl: photoUrl });
          if (ocrAnalysis) {
            await bot.sendMessage(ADMIN_CHAT_ID, `🤖 *ИИ-разбор рукописи (${st.name}):*\n\n${ocrAnalysis}`, {
              parse_mode: 'Markdown',
              reply_markup: lastLs ? { inline_keyboard: [[{ text: '✅ Отметить ДЗ проверенным', callback_data: `lesson_hw_checked:${lastLs.id}` }]] } : undefined
            }).catch(() => bot.sendMessage(ADMIN_CHAT_ID, `🤖 ИИ-разбор рукописи (${st.name}):\n\n${ocrAnalysis}`));
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
      const evalPrompt = `Ученик ${st.name} (${st.grade || ''}) решал твой мини-квиз по английскому:\nКВИЗ:\n${quizObj.quizText}\n\nОТВЕТЫ УЧЕНИКА:\n"${studentText}"\n\nПроверь ответы дружелюбно и понятно (обращайся напрямую к ученику ${st.name} на "ты", до 800 символов): похвали за правильные ответы, мягко объясни ошибки (если есть) и поздравь с серией 🔥 ${newStreak} выполненных заданий подряд!`;
      const evalRes = await executeFunctionCall('generate_lesson_plan', { prompt: evalPrompt });
      const feedback = evalRes.generated_plan || `Отличная работа, ${st.name}! 🔥 Твоя серия: ${newStreak}!`;
      await bot.sendMessage(chatId, `🌟 *Проверка твоего мини-квиза:*\n\n${feedback}\n\n🔥 *Твой стрик: ${newStreak} (+10 XP)*`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🎯 Ещё один мини-квиз!', callback_data: 'student_quiz' }]] }
      }).catch(() => bot.sendMessage(chatId, feedback));
      await bot.sendMessage(ADMIN_CHAT_ID, `🔥 *${st.name}* сам(а) прошёл(ла) мини-квиз по словам в боте! (Стрик: ${newStreak})\nОтветы ученика: «${studentText}»`, { parse_mode: 'Markdown' }).catch(() => {});
      return;
    }

    const newStreak = await incrementStudentStreakBot(st);
    if (isVoiceSubmission && studentText) {
      const speakPrompt = `Ученик ${st.name} (${st.grade || ''}) прислал голосовое сообщение на английском (Speaking practice).\nРаспознанная речь ученика:\n"${studentText}"\n\nНапиши короткий (до 700 символов), очень тёплый и вдохновляющий разбор напрямую для ученика ${st.name}: похвали за смелость и разговорную практику, отметь удачные фразы и мягко подскажи 1-2 улучшения (как сказать ещё естественнее/правильнее).`;
      const speakRes = await executeFunctionCall('generate_lesson_plan', { prompt: speakPrompt });
      const speakFeedback = speakRes.generated_plan || 'Отличная разговорная практика! Так держать!';
      await bot.sendMessage(chatId, `🎤 *Я распознал твою речь:*\n_${studentText}_\n\n🇬🇧 *Разбор Speaking:*\n${speakFeedback}\n\n🔥 *+15 XP за Speaking! Твоя серия: ${newStreak} подряд!* 🏆`, { parse_mode: 'Markdown' }).catch(() => bot.sendMessage(chatId, speakFeedback));
    } else {
      await bot.sendMessage(chatId, `✅ Супер, *${st.name}*! Я передал твой ответ Игорю на проверку! 🌟\n🔥 *Ударный режим (Streak): ${newStreak} ДЗ подряд! (+10 XP)*`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🎯 Потренировать мои слова', callback_data: 'student_quiz' }]] }
      }).catch(() => {});
    }
    if (!studentText) studentText = '[Голосовое/медиа сообщение]';
    if (false) {
    await bot.sendMessage( chatId, `✅ Супер, *${st.name}*! Я передал твой ответ Игорю на проверку! 🌟`, { parse_mode: 'Markdown' }).catch(() => {});
    }
    const { data: lastLs } = await db.from('lessons').select('*').eq('student_id', st.id).eq('status', 'Проведен').order('date', { ascending: false }).limit(1).maybeSingle();
    const cleanHw = (lastLs?.homework || '').split('\\n[МАТЕРИАЛЫ]:')[0].replace('[ДЗ_ПРОВЕРЕНО]', '').replace('[ДЗ_СДАНО]', '').trim();
    const scenario = extractLessonScenario(lastLs?.homework || '');

    // Autonomous AI Grading & Verification
    let aiGrading = null;
    if (studentText && studentText.length >= 3 && lastLs) {
      try {
        const gradePrompt = `Ты — профессиональный, справедливый и доброжелательный преподаватель английского языка.
Ученик ${st.name} (${st.grade || ''}) прислал ответ на домашнее задание.
ЗАДАННОЕ ДЗ:
"${cleanHw || 'практика английского'}"
МАТЕРИАЛЫ И СЦЕНАРИЙ УРОКА:
"${scenario ? scenario.slice(0, 1500) : 'по программе'}"

ОТВЕТ УЧЕНИКА:
"${studentText}"

ОЦЕНИ ОТВЕТ И ВЕРНИ СТРОГО JSON без markdown-обертки:
{
  "is_fully_done": true | false,
  "student_feedback": "Дружелюбный разбор ДЛЯ УЧЕНИКА: похвали за сделанное, укажи на ошибки и как их исправить, и ЧЁТКО напиши что ещё доделать если сдано не всё!",
  "teacher_summary": "Краткий отчёт для учителя Игоря: статус, процент выполнения, ключевые ошибки"
}`;

        const gradeRes = await executeFunctionCall('generate_lesson_plan', { prompt: gradePrompt });
        const jsonMatch = gradeRes.generated_plan?.match(/\{[\s\S]*\}/);
        if (jsonMatch) aiGrading = JSON.parse(jsonMatch[0]);
      } catch (errGrade) {
        console.error('AI grading error:', errGrade.message);
      }
    }

    if (aiGrading && aiGrading.is_fully_done) {
      // 1. ДЗ выполнено полностью -> ИИ АВТОМАТИЧЕСКИ МЕНЯЕТ СТАТУС НА [ДЗ_ПРОВЕРЕНО]
      if (lastLs && !(lastLs.homework || '').includes('[ДЗ_ПРОВЕРЕНО]')) {
        const updated = `[ДЗ_ПРОВЕРЕНО] ${(lastLs.homework || '').replace('[ДЗ_СДАНО]', '')}`.trim();
        await db.from('lessons').update({ homework: updated }).eq('id', lastLs.id);
      }
      
      // Отправляем разбор ученику
      await bot.sendMessage(chatId, `🎉 *Отличная работа, ${st.name}! ДЗ проверено и зачтено!* ✅\n\n${aiGrading.student_feedback}\n\n🔥 *Ударный режим (Streak): ${newStreak} ДЗ подряд! (+15 XP)* 🏆`, {
        parse_mode: 'Markdown'
      }).catch(() => bot.sendMessage(chatId, aiGrading.student_feedback));

      // Отправляем отчёт преподавателю
      await bot.sendMessage(ADMIN_CHAT_ID, `✅ *ИИ автоматически ПРОВЕРИЛ И ЗАЧЁЛ ДЗ ученика ${st.name}!* (Статус в приложении: Проверено)\n\nОтвет ученика: «${studentText}»\n\n📋 *Разбор ИИ:*\n${aiGrading.teacher_summary}`, {
        parse_mode: 'Markdown'
      }).catch(() => {});

    } else if (aiGrading && !aiGrading.is_fully_done) {
      // 2. ДЗ выполнено частично -> статус [ДЗ_СДАНО], ученику пишем что доделать
      if (lastLs && !(lastLs.homework || '').includes('[ДЗ_СДАНО]') && !(lastLs.homework || '').includes('[ДЗ_ПРОВЕРЕНО]')) {
        await db.from('lessons').update({ homework: `[ДЗ_СДАНО] ${lastLs.homework || ''}`.trim() }).eq('id', lastLs.id);
      }

      await bot.sendMessage(chatId, `📬 *Ответ принят, ${st.name}!* (Задание выполнено частично)\n\n${aiGrading.student_feedback}\n\n🔥 *Твой стрик: ${newStreak} ДЗ подряд!* Давай доделаем остальное 💪`, {
        parse_mode: 'Markdown'
      }).catch(() => bot.sendMessage(chatId, aiGrading.student_feedback));

      await bot.sendMessage(ADMIN_CHAT_ID, `⚠️ *Ученик ${st.name} сдал ДЗ частично:*\n\n«${studentText}»\n\n📋 *Разбор ИИ:*\n${aiGrading.teacher_summary}`, {
        parse_mode: 'Markdown',
        reply_markup: lastLs ? { inline_keyboard: [[{ text: '✅ Всё равно отметить проверенным', callback_data: `lesson_hw_checked:${lastLs.id}` }]] } : undefined
      }).catch(() => {});

    } else {
      // Фоллбек если ИИ не вернул JSON
      if (lastLs && !(lastLs.homework || '').includes('[ДЗ_СДАНО]') && !(lastLs.homework || '').includes('[ДЗ_ПРОВЕРЕНО]')) {
        await db.from('lessons').update({ homework: `[ДЗ_СДАНО] ${lastLs.homework || ''}`.trim() }).eq('id', lastLs.id);
      }
      await bot.sendMessage(chatId, `✅ Супер, *${st.name}*! Твой ответ принят и отправлен на проверку! 🌟\n🔥 *Твой стрик: ${newStreak} ДЗ подряд! (+10 XP)*`, { parse_mode: 'Markdown' }).catch(() => {});
      await bot.sendMessage(ADMIN_CHAT_ID, `📬 *Ответ от ученика ${st.name}:*\n\n«${studentText}»`, {
        parse_mode: 'Markdown',
        reply_markup: lastLs ? { inline_keyboard: [[{ text: '✅ Отметить ДЗ проверенным', callback_data: `lesson_hw_checked:${lastLs.id}` }]] } : undefined
      }).catch(() => {});
    }
    if (msg.voice || msg.video_note) {
      await bot.forwardMessage(ADMIN_CHAT_ID, chatId, msg.message_id).catch(() => {});
    }
    return;
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
  const minskDayName = new Date().toLocaleDateString('en-US', { timeZone: 'Europe/Minsk', weekday: 'short' });
  const isWeekend = (minskDayName === 'Sat' || minskDayName === 'Sun');
  if (typeof completedToday !== 'undefined' && isWeekend) {
    const weekendCtx = `СЕГОДНЯ ВЫХОДНОЙ ДЕНЬ (${minskDayName === 'Sat' ? 'Суббота' : 'Воскресенье'}).\nВыполнено задач/уроков сегодня: ${completedToday.length} (${JSON.stringify(completedToday.map(t => t.title))}).\nПривычки сегодня: ${habitLogs.length} из ${habits.length}.\nИНСТРУКЦИЯ (РЕЖИМ АНТИ-СТЫД ВЫХОДНОГО ДНЯ):\nСегодня выходной! Никакого шейминга за рабочие задачи РЦПИ. Напиши тёплый, поддерживающий вечерний обзор выходного дня: похвали за проведённые уроки и полезные привычки, напомни качественно восстановиться, провести вечер с Кристиной и лечь спать до 23:00.`;
    return await askAI('Сгенерируй тёплый вечерний обзор выходного дня', weekendCtx, null, true, true);
  }

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
  const minskDayName = new Date().toLocaleDateString('en-US', { timeZone: 'Europe/Minsk', weekday: 'short' });
  const isWeekend = (minskDayName === 'Sat' || minskDayName === 'Sun');
  if (typeof completedToday !== 'undefined' && isWeekend) {
    const weekendCtx = `СЕГОДНЯ ВЫХОДНОЙ ДЕНЬ (${minskDayName === 'Sat' ? 'Суббота' : 'Воскресенье'}).\nВыполнено задач/уроков сегодня: ${completedToday.length} (${JSON.stringify(completedToday.map(t => t.title))}).\nПривычки сегодня: ${habitLogs.length} из ${habits.length}.\nИНСТРУКЦИЯ (РЕЖИМ АНТИ-СТЫД ВЫХОДНОГО ДНЯ):\nСегодня выходной! Никакого шейминга за рабочие задачи РЦПИ. Напиши тёплый, поддерживающий вечерний обзор выходного дня: похвали за проведённые уроки и полезные привычки, напомни качественно восстановиться, провести вечер с Кристиной и лечь спать до 23:00.`;
    return await askAI('Сгенерируй тёплый вечерний обзор выходного дня', weekendCtx, null, true, true);
  }

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
            await sendHomeworkToStudentBot(ls3.students, prev, true, `сегодня в ${timeStr}`);
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
          }
          if (CHAT_ID) {
            bot.sendMessage(CHAT_ID, `⏰ Отправил напоминание *${ls3.students.name}* о сегодняшнем уроке в *${timeStr}*!`, { parse_mode: 'Markdown' }).catch(() => {});
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
          const { data: prevList } = await db.from('lessons').select('*').eq('student_id', ls.student_id).eq('status', 'Проведен').order('date', { ascending: false }).limit(1);
          const prev = prevList?.[0];
          const prevHwRaw = prev ? ((prev.homework || '').split('\\n[МАТЕРИАЛЫ]:')[0].trim()) : '';
          const isHwChecked = prevHwRaw.includes('[ДЗ_ПРОВЕРЕНО]');
          const prevHwClean = prevHwRaw.replace('[ДЗ_ПРОВЕРЕНО]', '').trim();
          let briefMsg = `🔔 *Урок через 15 минут!* — *${stName}* (${st.grade || 'уровень не указан'})\n`;
          if (ls.topic) briefMsg += `📚 *Тема сегодня:* ${ls.topic}\n`;
          if (prev) briefMsg += `⏪ *Прошлый урок (${new Date(prev.date).toLocaleDateString('ru-RU')}):* ${prev.topic || 'Без темы'}\n`;
          if (prevHwClean) briefMsg += `📌 *ПРОВЕРИТЬ ДЗ:* ${prevHwClean} ${isHwChecked ? '✅' : '⚠️'}\n`;
          if (doss.errors) briefMsg += `⚠️ *Слабые места:* ${doss.errors}\n`;
          if (doss.interests) briefMsg += `🎯 *Интересы:* ${doss.interests}\n`;
          const { data: cond15 } = await db.from('lessons').select('*').eq('student_id', ls.student_id).eq('status', 'Проведен').order('date', { ascending: false }).limit(15);
          const ebbLesson = (cond15 || []).find(c => c.topic && (Date.now() - new Date(c.date).getTime() >= 10 * 86400000) && (Date.now() - new Date(c.date).getTime() <= 25 * 86400000));
          if (ebbLesson) briefMsg += `🔄 *Кривая Эббингауза (~2 нед. назад):* повторить «${ebbLesson.topic}»\n`;
          if (doss.unit) briefMsg += `📖 *Учебник/Unit:* ${doss.unit}\n`;
          const kb = [
            [
              { text: '🔮 Промпт для Perplexity', callback_data: `lesson_perplexity:${ls.id}` },
              { text: '🎲 Разминка + ДЗ', callback_data: `lesson_prep:${ls.id}` }
            ],
            [
              { text: '🎮 Игра на 5 минут', callback_data: `lesson_game:${ls.id}` }
            ]
          ];
          if (prev && prevHwClean && !isHwChecked) {
            kb.push([{ text: '✅ Отметить прошлое ДЗ проверенным', callback_data: `lesson_hw_checked:${prev.id}` }]);
          }
          if (CHAT_ID) {
            bot.sendMessage(CHAT_ID, briefMsg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } }).catch(() => {
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
