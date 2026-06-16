// ============================================
// Telegram Bot — Персональный ИИ-ассистент Игоря
// ============================================
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ---- Config ----
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
let CHAT_ID = process.env.TELEGRAM_CHAT_ID || null;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const AI_API_KEY = process.env.AI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY;
const AI_API_URL = process.env.AI_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const AI_MODEL = process.env.AI_MODEL || 'llama-3.3-70b-versatile';

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

// ============================================
// DATABASE HELPERS
// ============================================

async function getUser() {
  const { data } = await db.from('users').select('*').limit(1).single();
  return data;
}

async function getTasks(filters = {}) {
  let q = db.from('tasks').select('*').neq('status', 'Готово').neq('status', 'Отменена').order('created_at', { ascending: false });
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.direction) q = q.eq('direction', filters.direction);
  if (filters.priority) q = q.eq('priority', filters.priority);
  const { data } = await q;
  return data || [];
}

function getMinskDateString(daysOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  const ms = date.toLocaleString('en-US', { timeZone: 'Europe/Minsk' });
  const minskDate = new Date(ms);
  const y = minskDate.getFullYear();
  const m = String(minskDate.getMonth() + 1).padStart(2, '0');
  const d = String(minskDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function getTasksDueToday() {
  const today = getMinskDateString(0);
  const { data } = await db.from('tasks').select('*')
    .eq('deadline', today)
    .neq('status', 'Готово').neq('status', 'Отменена');
  return data || [];
}

async function getOverdueTasks() {
  const today = getMinskDateString(0);
  const { data } = await db.from('tasks').select('*')
    .lt('deadline', today)
    .neq('status', 'Готово').neq('status', 'Отменена');
  return data || [];
}

async function getUpcomingDeadlines(days = 3) {
  const today = getMinskDateString(0);
  const future = getMinskDateString(days);
  const { data } = await db.from('tasks').select('*')
    .gt('deadline', today)
    .lte('deadline', future)
    .neq('status', 'Готово').neq('status', 'Отменена');
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

async function createTask(title, opts = {}) {
  const user = await getUser();
  const { data, error } = await db.from('tasks').insert({
    user_id: user?.id,
    title,
    direction: opts.direction || 'Личное',
    status: opts.status || 'Ждёт меня',
    priority: opts.priority || 'Средний',
    deadline: opts.deadline || null,
    next_step: opts.next_step || ''
  }).select().single();
  if (error) throw error;
  return data;
}

async function getSettings() {
  const { data } = await db.from('settings').select('*').limit(1).single();
  return data || {};
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

async function getRecentMessages(limit = 10) {
  const { data } = await db.from('messages').select('role, content')
    .order('created_at', { ascending: false }).limit(limit);
  return (data || []).reverse();
}

// ============================================
// AI HELPER
// ============================================

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Создать новую задачу',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Название задачи' },
          direction: { type: 'string', description: 'Направления (можно несколько через запятую): Митап AI-Connect/ТГ AI-Connect/Учись и применяй/ИИ Дайджест/Задача от руководителя/Банк промтов/Smart-запрос/ответ/Операционная задача/Английский/Личное' },
          status: { type: 'string', description: 'Статус (по умолч. "Ждёт меня")' },
          priority: { type: 'string', description: 'Приоритет: Высокий/Средний/Низкий' },
          deadline: { type: 'string', description: 'Дедлайн YYYY-MM-DD' },
          next_step: { type: 'string', description: 'Следующее действие' }
        },
        required: ['title']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_tasks',
      description: 'Получить список активных задач',
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
      description: 'Запомнить новую инструкцию, привычку, обязанность или факт навсегда',
      parameters: {
        type: 'object',
        properties: {
          new_instruction: { type: 'string', description: 'Что запомнить' }
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
      description: 'Записать быструю мысль, идею или черновик во входящие (Inbox) для последующего разбора',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Текст мысли/идеи' }
        },
        required: ['content']
      }
    }
  }
];

async function executeFunctionCall(name, args) {
  try {
    switch (name) {
      case 'create_task': {
        const task = await createTask(args.title, args);
        return { success: true, task, message: `Задача "${task.title}" создана` };
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
      default:
        return { success: false, error: `Неизвестная функция: ${name}` };
    }
  } catch(e) {
    return { success: false, error: e.message };
  }
}

async function askAI(userMessage, context = '') {
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

  const history = await getRecentMessages(20);
  const messages = history.map(m => ({ role: m.role, content: m.content }));
  messages.push({ role: 'user', content: userMessage });

  // Сразу отправляем статус "Печатает...", чтобы не казалось, что бот завис
  bot.sendChatAction(CHAT_ID, 'typing').catch(() => {});

  let response = await callAPI(systemInstruction, messages);
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

    response = await callAPI(systemInstruction, messages);
  }

  return response.choices?.[0]?.message?.content || 'Не удалось получить ответ';
}

async function callAPI(systemInstruction, messages, retryCount = 0) {
  const res = await fetch(AI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_API_KEY}`
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemInstruction },
        ...messages
      ],
      tools: TOOLS,
      temperature: 0.7,
      max_tokens: 1024
    })
  });

  if (!res.ok) {
    const err = await res.json();
    const errMsg = err.error?.message || `API error ${res.status}`;
    
    if (res.status === 429 && retryCount < 2) {
      let waitTime = 20;
      const match = errMsg.match(/try again in ([\d\.]+)s/);
      if (match && match[1]) {
        waitTime = parseFloat(match[1]) + 1;
      }
      console.warn(`Rate limit hit. Waiting ${waitTime}s...`);
      await new Promise(r => setTimeout(r, waitTime * 1000));
      return callAPI(systemInstruction, messages, retryCount + 1);
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
  bot.sendMessage(msg.chat.id,
    `👋 Привет, Игорь! Я твой персональный ассистент.\n\n` +
    `Твой Chat ID: \`${CHAT_ID}\`\n` +
    `Скопируй его в файл \`.env\` → \`TELEGRAM_CHAT_ID=${CHAT_ID}\`\n\n` +
    `Теперь можешь:\n` +
    `• Просто написать мне что угодно — я отвечу с учетом твоего контекста\n` +
    `• Кинуть задачу: \"Завтра позвонить Горшкову\"\n` +
    `• Попросить запомнить: \"Запомни: по пятницам я играю в футбол\"\n` +
    `• /tasks — мои активные задачи\n` +
    `• /today — план на сегодня\n` +
    `• /briefing — утренний брифинг прямо сейчас`,
    { parse_mode: 'Markdown' }
  );
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
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch(e) {
    bot.sendMessage(chatId, '❌ Ошибка генерации брифинга: ' + e.message);
  }
});

// Любое текстовое сообщение — отправляем в ИИ
bot.on('message', async (msg) => {
  if (msg.text?.startsWith('/')) return; // Команды обрабатываются выше
  const chatId = msg.chat.id;

  // Автоматически запоминаем chat_id
  if (!CHAT_ID) CHAT_ID = chatId.toString();

  try {
    // Сохраняем сообщение пользователя
    await saveMessage('user', msg.text);

    // Показываем "печатает..."
    bot.sendChatAction(chatId, 'typing');

    // Получаем ответ от ИИ
    const reply = await askAI(msg.text);

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
    bot.sendMessage(chatId, '❌ Произошла ошибка: ' + e.message);
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

  return await askAI('Сгенерируй утренний брифинг', contextData);
}

async function generateEveningReview() {
  const todayTasks = await getTasksDueToday();
  const overdue = await getOverdueTasks();
  const habitLogs = await getHabitLogsToday();
  const habits = await getHabits();

  const contextData = `
ДАННЫЕ ДЛЯ ВЕЧЕРНЕГО ОБЗОРА:
- Задачи на сегодня: ${JSON.stringify(todayTasks.map(t => ({ title: t.title, status: t.status })))}
- Просроченные: ${JSON.stringify(overdue.map(t => t.title))}
- Привычки выполнены сегодня: ${JSON.stringify(habitLogs.map(l => l.habits?.name))}
- Всего привычек: ${JSON.stringify(habits.map(h => h.name))}

Сгенерируй вечерний обзор дня. Спроси, что переносим, что закрываем. Напомни про сон до 23:00.
`;

  return await askAI('Сгенерируй вечерний обзор', contextData);
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

  return await askAI('Еженедельный обзор', contextData);
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
