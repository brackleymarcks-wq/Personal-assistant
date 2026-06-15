// ============================================
// AI agent with function calling (Groq / Llama 3)
// ============================================

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile'; // Возвращаем умную модель (лимит 12000 TPM)

// Function declarations in OpenAI format
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_tasks',
      description: 'Получить список задач пользователя с фильтрами',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Статус: Идея/Ждёт меня/В работе/Ждёт других/Делегирована/Готово/Отменена' },
          direction: { type: 'string', description: 'Направление: Митап/Портал/Telegram/Английский/Личное/Горшков' },
          priority: { type: 'string', description: 'Приоритет: Высокий/Средний/Низкий' },
          search: { type: 'string', description: 'Поиск по названию задачи' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Создать новую задачу',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Название задачи' },
          direction: { type: 'string', description: 'Направление: Митап/Портал/Telegram/Английский/Личное/Горшков' },
          status: { type: 'string', description: 'Статус задачи (по умолч. "Ждёт меня")' },
          priority: { type: 'string', description: 'Приоритет: Высокий/Средний/Низкий' },
          deadline: { type: 'string', description: 'Дедлайн в формате YYYY-MM-DD' },
          next_step: { type: 'string', description: 'Следующее конкретное действие' }
        },
        required: ['title']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description: 'Обновить задачу по ID',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID задачи' },
          title: { type: 'string' },
          status: { type: 'string' },
          priority: { type: 'string' },
          deadline: { type: 'string' },
          next_step: { type: 'string' }
        },
        required: ['id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_projects',
      description: 'Получить список проектов',
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
          description: { type: 'string', description: 'Описание' },
          status: { type: 'string', description: 'Активный/Пауза/Завершён' },
          deadline: { type: 'string', description: 'Дедлайн YYYY-MM-DD' }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_todays_schedule',
      description: 'Получить расписание на сегодня: события и задачи с дедлайном сегодня',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_event',
      description: 'Создать событие в календаре',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Название события' },
          start_at: { type: 'string', description: 'Начало ISO 8601' },
          end_at: { type: 'string', description: 'Конец ISO 8601' },
          type: { type: 'string', description: 'Встреча/Урок/Дедлайн/Личное' },
          notes: { type: 'string', description: 'Заметки к событию' }
        },
        required: ['title', 'start_at', 'end_at']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'save_to_knowledge_base',
      description: 'Сохранить заметку, промт или информацию в базу знаний',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Заголовок записи' },
          type: { type: 'string', description: 'Промт/Инструмент/Статья/Кейс/Урок/Заметка' },
          content: { type: 'string', description: 'Содержимое в Markdown' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Теги' }
        },
        required: ['title', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_state_snapshot',
      description: 'Получить текущий контекст пользователя: активные задачи, состояние, открытые вопросы',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_reminder',
      description: 'Создать напоминание',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Текст напоминания' },
          remind_at: { type: 'string', description: 'Время напоминания ISO 8601' },
          task_id: { type: 'string', description: 'ID связанной задачи (опционально)' }
        },
        required: ['message', 'remind_at']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_habits',
      description: 'Получить список привычек пользователя и историю их выполнения за последние 7 дней',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'log_habit',
      description: 'Отметить выполнение (или пропуск) привычки на определенную дату YYYY-MM-DD',
      parameters: {
        type: 'object',
        properties: {
          habit_id: { type: 'string', description: 'ID привычки' },
          date: { type: 'string', description: 'Дата YYYY-MM-DD' },
          status: { type: 'string', description: 'done или missed (по умолчанию done)' }
        },
        required: ['habit_id', 'date']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_goals',
      description: 'Получить список стратегических целей (OKR / SMART) пользователя',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_goal',
      description: 'Создать новую стратегическую цель',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Формулировка цели' },
          description: { type: 'string', description: 'Критерии успеха / Key Results' },
          target_date: { type: 'string', description: 'Срок достижения в формате YYYY-MM-DD' }
        },
        required: ['title']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_to_inbox',
      description: 'Записать быструю мысль или идею во входящие (Inbox buffer) для последующего разбора',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Текст мысли/идеи' }
        },
        required: ['content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_inbox',
      description: 'Получить список необработанных мыслей из входящих',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_uploaded_files',
      description: 'Получить список всех загруженных пользователем файлов (название, дата)',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_uploaded_file',
      description: 'Прочитать содержимое конкретного загруженного файла по его ID',
      parameters: {
        type: 'object',
        properties: {
          file_id: { type: 'string', description: 'ID файла' }
        },
        required: ['file_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_transaction',
      description: 'Добавить финансовую транзакцию (доход или расход)',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Сумма' },
          type: { type: 'string', description: 'income или expense' },
          category: { type: 'string', description: 'Категория (Зарплата, Продукты и т.д.)' },
          date: { type: 'string', description: 'Дата YYYY-MM-DD' },
          description: { type: 'string', description: 'Описание (опционально)' }
        },
        required: ['amount', 'type', 'category', 'date']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_context',
      description: 'Обновить или дополнить информацию в контексте пользователя (новые инструкции, привычки, ученики и т.д.)',
      parameters: {
        type: 'object',
        properties: {
          new_instruction: { type: 'string', description: 'Новая информация для сохранения' }
        },
        required: ['new_instruction']
      }
    }
  }
];

// Execute a function call
async function executeFunctionCall(name, args) {
  try {
    switch (name) {
      case 'get_tasks': {
        const tasks = await DB.getTasks(args);
        return { success: true, tasks, count: tasks.length };
      }
      case 'create_task': {
        const task = await DB.createTask({
          title: args.title,
          direction: args.direction || 'Личное',
          status: args.status || 'Ждёт меня',
          priority: args.priority || 'Средний',
          deadline: args.deadline || null,
          next_step: args.next_step || ''
        });
        window.App && App.refreshTasksBadge();
        return { success: true, task, message: `Задача "${task.title}" создана` };
      }
      case 'update_task': {
        const { id, ...updates } = args;
        const task = await DB.updateTask(id, updates);
        return { success: true, task, message: `Задача обновлена` };
      }
      case 'get_projects': {
        const projects = await DB.getProjects();
        return { success: true, projects, count: projects.length };
      }
      case 'create_project': {
        const project = await DB.createProject({
          name: args.name,
          description: args.description || '',
          status: args.status || 'Активный',
          deadline: args.deadline || null
        });
        return { success: true, project, message: `Проект "${project.name}" создан` };
      }
      case 'get_todays_schedule': {
        const events = await DB.getTodayEvents();
        const { today, overdue } = await DB.getTasksForContext();
        const now = new Date();
        return {
          success: true,
          date: now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }),
          time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          events,
          tasks_due_today: today,
          overdue_tasks: overdue
        };
      }
      case 'create_event': {
        const event = await DB.createEvent(args);
        return { success: true, event, message: `Событие "${event.title}" добавлено` };
      }
      case 'save_to_knowledge_base': {
        const item = await DB.createKnowledge({
          title: args.title,
          type: args.type || 'Заметка',
          content: args.content,
          tags: args.tags || []
        });
        return { success: true, item, message: `Сохранено в базу знаний: "${item.title}"` };
      }
      case 'get_state_snapshot': {
        const snapshot = await DB.getLatestSnapshot();
        const { active, overdue } = await DB.getTasksForContext();
        return {
          success: true,
          snapshot: snapshot?.snapshot || null,
          active_tasks_count: active.length,
          overdue_count: overdue.length,
          overdue_tasks: overdue.slice(0, 5)
        };
      }
      case 'create_reminder': {
        const reminder = await DB.createReminder(args);
        return { success: true, reminder, message: `Напоминание установлено` };
      }
      case 'get_habits': {
        const habits = await DB.getHabits();
        const today = new Date();
        const start = new Date();
        start.setDate(today.getDate() - 7);
        const logs = await DB.getHabitLogs(start.toISOString().split('T')[0], today.toISOString().split('T')[0]);
        return { success: true, habits, logs };
      }
      case 'log_habit': {
        const log = await DB.logHabit(args.habit_id, args.date, args.status || 'done');
        return { success: true, log, message: 'Выполнение привычки отмечено' };
      }
      case 'get_goals': {
        const goals = await DB.getGoals();
        return { success: true, goals, count: goals.length };
      }
      case 'create_goal': {
        const goal = await DB.createGoal(args);
        return { success: true, goal, message: `Цель "${goal.title}" добавлена` };
      }
      case 'add_to_inbox': {
        const item = await DB.addToInbox(args.content);
        return { success: true, item, message: 'Мысль записана во входящие' };
      }
      case 'get_inbox': {
        const inbox = await DB.getInbox(true);
        return { success: true, inbox, count: inbox.length };
      }
      case 'get_uploaded_files': {
        const files = await DB.getUploadedFiles();
        return { success: true, files, count: files.length };
      }
      case 'read_uploaded_file': {
        const files = await DB.getUploadedFiles();
        const file = files.find(f => f.id === args.file_id || f.filename === args.file_id);
        if (file) {
          return { success: true, filename: file.filename, content: file.text_content };
        }
        return { success: false, error: 'Файл не найден' };
      }
      case 'add_transaction': {
        const tx = await DB.createTransaction(args);
        return { success: true, tx, message: 'Транзакция добавлена' };
      }
      case 'update_context': {
        // Мы читаем текущие настройки, добавляем инструкцию и сохраняем
        const settings = await DB.getSettings() || {};
        const context = settings.context || {};
        if (!context.custom_instructions) context.custom_instructions = [];
        context.custom_instructions.push(args.new_instruction);
        await DB.updateSettings({ context });
        return { success: true, message: 'Новая инструкция сохранена в контексте пользователя' };
      }
      default:
        return { success: false, error: `Неизвестная функция: ${name}` };
    }
  } catch (e) {
    console.error(`Function ${name} error:`, e);
    return { success: false, error: e.message };
  }
}

const Gemini = {
  async buildSystemContext() {
    const settings = await DB.getSettings() || {};
    let systemPrompt = window.SYSTEM_PROMPT || settings.system_prompt || '';
    let userContext = window.USER_CONTEXT || '';

    // Пытаемся загрузить базовые файлы из корня, если запущен сервер
    try {
      const promptRes = await fetch('/SYSTEM_PROMPT.md');
      if (promptRes.ok) systemPrompt = await promptRes.text();
      
      const ctxRes = await fetch('/CONTEXT.md');
      if (ctxRes.ok) userContext = await ctxRes.text();
    } catch(e) {
      console.warn('Работаем без локального сервера, используем вшитые промты (file:// fallback)');
    }

    const rhythm = settings.rhythm || DEFAULT_SETTINGS.rhythm;
    const now = new Date();
    const timeStr = now.toLocaleString('ru-RU', {
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    let extraContext = '';
    if (settings.context?.custom_instructions?.length) {
      extraContext = `\n\nДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ:\n` + settings.context.custom_instructions.map((ins, i) => `${i+1}. ${ins}`).join('\n');
    }

    return `${systemPrompt}\n\n${userContext}\n\nТЕКУЩЕЕ ВРЕМЯ: ${timeStr}\n\nРИТМ ДНЯ:\n- Подъём: ${rhythm.wake}\n- Deep Work: ${rhythm.deep_work_start}–${rhythm.deep_work_end}\n- Обед: ${rhythm.lunch_start}–${rhythm.lunch_end}\n- Стоп работы: ${rhythm.work_stop}\n- Сон: ${rhythm.sleep}${extraContext}`;
  },

  async chat(userMessage, historyMessages = []) {
    // Используем ключ из того же поля Gemini API Key для удобства
    const apiKey = Config.geminiKey;
    if (!apiKey) throw new Error('API ключ Groq не настроен');

    const systemContext = await this.buildSystemContext();

    const messages = [];
    
    // Add history
    const recentHistory = historyMessages.slice(-10); // Уменьшено с 30 до 10 для экономии лимитов токенов
    for (const msg of recentHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: userMessage
    });

    let response = await this._callAPI(apiKey, systemContext, messages);
    let maxIter = 5;

    // Agentic loop
    while (maxIter-- > 0) {
      const choice = response.choices?.[0];
      if (!choice) break;

      const message = choice.message;
      if (!message.tool_calls || message.tool_calls.length === 0) {
        return message.content || 'Не удалось получить ответ';
      }

      messages.push(message);

      for (const toolCall of message.tool_calls) {
        const name = toolCall.function.name;
        let args = {};
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch(e) {}
        
        console.log(`🔧 Calling function: ${name}`, args);
        const result = await executeFunctionCall(name, args);
        
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: name,
          content: JSON.stringify(result)
        });
      }

      response = await this._callAPI(apiKey, systemContext, messages);
    }

    return response.choices?.[0]?.message?.content || 'Не удалось получить ответ';
  },

  async _callAPI(apiKey, systemInstruction, messages, retryCount = 0) {
    const res = await fetch(GROQ_API, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
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
      
      // Handle Rate Limit by waiting and retrying (max 2 retries)
      if (res.status === 429 && retryCount < 2) {
        let waitTime = 20; // default 20s
        const match = errMsg.match(/try again in ([\d\.]+)s/);
        if (match && match[1]) {
          waitTime = parseFloat(match[1]) + 1; // add 1s padding
        }
        console.warn(`Rate limit hit. Waiting ${waitTime}s before retry...`);
        await new Promise(r => setTimeout(r, waitTime * 1000));
        return this._callAPI(apiKey, systemInstruction, messages, retryCount + 1);
      }
      
      throw new Error(errMsg);
    }

    return res.json();
  },

  async parseInboxItem(text) {
    const apiKey = Config.geminiKey;
    if (!apiKey) throw new Error('API ключ не настроен (нужен для ИИ)');

    const prompt = `Ты — умный парсер входящих мыслей по системе GTD. 
Твоя задача — проанализировать текст и вернуть массив объектов в формате JSON.
Текст: "${text}"

Возможные типы объектов:
- "task": { "type": "task", "title": "Название", "deadline": "YYYY-MM-DD", "priority": "Средний" (Низкий/Средний/Высокий) }
- "event": { "type": "event", "title": "Название", "start_at": "ISO 8601", "end_at": "ISO 8601", "notes": "" }
- "note": { "type": "note", "title": "Заголовок", "content": "Текст заметки", "tags": [] }
- "project": { "type": "project", "name": "Название проекта", "deadline": "YYYY-MM-DD" или null }

Сегодняшняя дата (локальная): ${new Date().toLocaleString('ru-RU')}
Текущая дата ISO: ${new Date().toISOString()}
ВАЖНО: Если для ЗАДАЧИ в тексте не указан срок, обязательно ставь deadline как сегодняшнюю дату (в формате YYYY-MM-DD). Не используй null для дедлайнов задач.

Верни ТОЛЬКО валидный JSON массив без Markdown разметки. Если мысль одна, верни массив из одного объекта. Пример:
[
  { "type": "task", "title": "Купить молоко", "deadline": "${new Date().toISOString().split('T')[0]}", "priority": "Низкий" }
]`;

    const res = await fetch(GROQ_API, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'Ты возвращаешь только валидный JSON. Никакого Markdown.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `API error ${res.status}`);
    }

    const data = await res.json();
    let jsonStr = data.choices?.[0]?.message?.content?.trim() || '[]';
    
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    }
    
    return JSON.parse(jsonStr);
  }
};
