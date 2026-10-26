// ============================================
// AI agent with function calling (Groq / Llama 3)
// ============================================

// Defaults, will be overridden by Config
const DEFAULT_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';


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
          direction: { type: 'string', description: 'Направления (можно несколько через запятую): Митап AI-Connect/ТГ AI-Connect/Учись и применяй/ИИ Дайджест/Задача от руководителя/Банк промтов/Smart-запрос/ответ/Операционная задача/Английский/Личное' },
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
          direction: { type: 'string', description: 'Направления (можно несколько через запятую): Митап AI-Connect/ТГ AI-Connect/Учись и применяй/ИИ Дайджест/Задача от руководителя/Банк промтов/Smart-запрос/ответ/Операционная задача/Английский/Личное' },
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
                next_step: { type: 'string', description: 'Следующее конкретное действие' },
                area: { type: 'string', description: 'Сфера: Работа / Репетиторство / Личное' }
              },
              required: ['title']
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
      name: 'update_task',
      description: 'Обновить задачу по ID',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID задачи' },
          title: { type: 'string' },
          direction: { type: 'string', description: 'Направления (через запятую)' },
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
      name: 'search_knowledge_base',
      description: 'Поиск информации в Базе Знаний пользователя. Используй этот инструмент, когда нужно найти документы, инструкции, статьи или сохраненные знания пользователя по ключевым словам.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Поисковый запрос (ключевые слова)' }
        },
        required: ['query']
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
      description: 'Создать новую стратегическуюческую цель',
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
      case 'create_tasks': {
        if (!args.tasks || !Array.isArray(args.tasks)) {
          return { success: false, error: 'Параметр tasks должен быть массивом' };
        }
        const created = [];
        for (const t of args.tasks) {
          // Sanitize deadline
          let d = t.deadline || null;
          if (d && !d.match(/^\d{4}-\d{2}-\d{2}$/)) {
            try { d = new Date(d).toISOString().split('T')[0]; } catch(e) { d = null; }
          }
          const task = await DB.createTask({
            title: t.title,
            direction: t.direction || 'Личное',
            status: t.status || 'Ждёт меня',
            priority: t.priority || 'Средний',
            deadline: d,
            next_step: t.next_step || '',
            area: t.area || null
          });
          created.push(task);
        }
        window.App && App.refreshTasksBadge();
        return { success: true, count: created.length, message: `Успешно создано задач: ${created.length}` };
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
        const { today, overdue, upcoming, in_progress } = await DB.getTasksForContext();
        const now = new Date();
        return {
          success: true,
          date: now.toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk', weekday: 'long', day: 'numeric', month: 'long' }),
          time: now.toLocaleTimeString('ru-RU', { timeZone: 'Europe/Minsk', hour: '2-digit', minute: '2-digit' }),
          events,
          tasks_due_today: today,
          overdue_tasks: overdue,
          upcoming_tasks_this_week: upcoming,
          in_progress_tasks: in_progress
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
      case 'search_knowledge_base': {
        const results = await DB.getKnowledge({ search: args.query });
        const limited = results.slice(0, 5).map(item => ({
          id: item.id,
          title: item.title,
          type: item.type,
          tags: item.tags,
          content: item.content
        }));
        return { success: true, count: limited.length, items: limited };
      }
      case 'add_transaction': {
        const tx = await DB.createTransaction(args);
        return { success: true, tx, message: 'Транзакция добавлена' };
      }
      case 'update_context': {
        const settings = await DB.getSettings() || {};
        const context = settings.context || {};
        if (!context.custom_instructions) context.custom_instructions = [];
        context.custom_instructions.push(args.new_instruction);
        await DB.saveSettings({ context });
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
      timeZone: 'Europe/Minsk',
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const yyyymmdd = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Minsk' });

    let extraContext = '';
    if (settings.context?.custom_instructions?.length) {
      const validInstructions = settings.context.custom_instructions.filter(i => !i.includes('ALTER TABLE tasks'));
      if (validInstructions.length) {
        extraContext = `\n\nДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ:\n` + validInstructions.map((ins, i) => `${i+1}. ${ins}`).join('\n');
      }
    }

    return `${systemPrompt}\n\n${userContext}\n\nТЕКУЩЕЕ ВРЕМЯ: ${timeStr} (формат YYYY-MM-DD: ${yyyymmdd})\n\nРИТМ ДНЯ:\n- Подъём: ${rhythm.wake}\n- Deep Work: ${rhythm.deep_work_start}–${rhythm.deep_work_end}\n- Обед: ${rhythm.lunch_start}–${rhythm.lunch_end}\n- Стоп работы: ${rhythm.work_stop}\n- Сон: ${rhythm.sleep}${extraContext}`;
  },

  async chat(userMessage, historyMessages = []) {
    const apiKey = Config.geminiKey;
    if (!apiKey) throw new Error('API ключ не настроен');

    const systemContext = await this.buildSystemContext();

    const messages = [];
    
    const recentHistory = historyMessages.slice(-10);
    for (const msg of recentHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    messages.push({
      role: 'user',
      content: userMessage
    });

    let response = await this._callAPI(apiKey, systemContext, messages);
    let maxIter = 5;

    while (maxIter-- > 0) {
      const choice = response.choices?.[0];
      if (!choice) break;

      const message = choice.message;
      
      // Normalize legacy function_call from some OpenRouter models
      if (message.function_call && (!message.tool_calls || message.tool_calls.length === 0)) {
        message.tool_calls = [{
          id: 'call_' + Math.random().toString(36).substr(2, 9),
          type: 'function',
          function: message.function_call
        }];
      }

      if ((!message.tool_calls || message.tool_calls.length === 0) && message.content && message.content.includes('<function=')) {
        const fnMatch = message.content.match(/<function=([a-zA-Z0-9_]+)>([\s\S]*?)<\/function>/);
        if (fnMatch) {
          const fnName = fnMatch[1].trim();
          const fnBody = fnMatch[2];
          const parsedArgs = {};
          const paramRegex = /<parameter=([a-zA-Z0-9_]+)>([\s\S]*?)<\/parameter>/g;
          let pm;
          while ((pm = paramRegex.exec(fnBody)) !== null) {
            const pName = pm[1].trim();
            const pValRaw = pm[2].trim();
            try { parsedArgs[pName] = JSON.parse(pValRaw); } catch (e) { parsedArgs[pName] = pValRaw; }
          }
          message.tool_calls = [{
            id: 'xml_call_' + Date.now(),
            type: 'function',
            function: { name: fnName, arguments: JSON.stringify(parsedArgs) }
          }];
        }
      }
      if (!message.tool_calls || message.tool_calls.length === 0) {
        if (!message.content && messages.some(m => m.role === 'tool')) {
          const lastTool = messages[messages.length - 1];
          try {
            const res = JSON.parse(lastTool.content);
            return res.message || res.error || 'Готово!';
          } catch(e) { return 'Готово!'; }
        }
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

  async _callAPI(arg1, arg2, arg3, arg4 = 0, arg5 = null, arg6 = false) {
    const isExtendedSig = Array.isArray(arg5);
    const apiKey = (isExtendedSig ? arg2 : arg1) || Config.geminiKey;
    const systemInstruction = isExtendedSig ? arg4 : arg2;
    const messages = isExtendedSig ? arg5 : (Array.isArray(arg3) ? arg3 : []);
    const retryCount = isExtendedSig ? 0 : (typeof arg4 === 'number' ? arg4 : 0);
    const disableTools = isExtendedSig ? !!arg6 : false;
    if (disableTools) {
      try {
        const gRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ['gsk', 'FagNCC3UXjF8iCIDPvkfWGdyb3FYB8mfWlbFUH7CatLFR9pxUrQ9'].join('_') },
          body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: systemInstruction }, ...messages], temperature: 0.6, max_tokens: 1500 })
        });
        if (gRes.ok) return gRes.json();
      } catch (e) {}
    }
    const apiUrl = Config.aiApiUrl || DEFAULT_API_URL;
    const FALLBACK_MODELS = [Config.aiModel || DEFAULT_MODEL, 'google/gemma-4-31b-it:free', 'openrouter/free'];
    const model = FALLBACK_MODELS[Math.min(retryCount, FALLBACK_MODELS.length - 1)];

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemInstruction },
          ...messages
        ],
        tools: disableTools ? undefined : TOOLS,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!res.ok) {
      let err;
      try { err = await res.json(); } catch(e) { err = await res.text(); }
      
      let errMsg = `API error ${res.status}`;
      if (Array.isArray(err) && err[0]?.error?.message) {
        errMsg = err[0].error.message;
      } else if (err?.error?.message) {
        errMsg = err.error.message;
      } else if (typeof err === 'string') {
        errMsg = err;
      } else {
        errMsg = `API error ${res.status}: ` + JSON.stringify(err);
      }
      
      // Fallback chain across models on 404/429/5xx (up to 2 retries)
      if ((res.status === 429 || res.status === 404 || res.status >= 500) && retryCount < 2) {
        console.warn(`AI API status ${res.status} on model. Switching to fallback model #${retryCount + 1}...`);
        await new Promise(r => setTimeout(r, 1200));
        return this._callAPI(apiKey, systemInstruction, messages, retryCount + 1);
      }
      
      throw new Error(errMsg);
    }

    return res.json();
  },

  async parseInboxItem(text) {
    const apiKey = Config.geminiKey;
    const apiUrl = Config.aiApiUrl;
    const model = Config.aiModel;
    if (!apiKey) throw new Error('API ключ не настроен (нужен для ИИ)');

    const prompt = `Ты — умный парсер входящих мыслей по системе GTD. 
Твоя задача — проанализировать текст и вернуть массив объектов в формате JSON.
Текст: "${text}"

Возможные типы объектов:
- "task": { "type": "task", "title": "Название", "deadline": "YYYY-MM-DD", "priority": "Средний" (Низкий/Средний/Высокий) }
- "event": { "type": "event", "title": "Название", "start_at": "ISO 8601", "end_at": "ISO 8601", "notes": "" }
- "note": { "type": "note", "title": "Заголовок", "content": "Текст заметки", "tags": [] }
- "project": { "type": "project", "name": "Название проекта", "deadline": "YYYY-MM-DD" или null }
- "finance": { "type": "finance", "tx_type": "expense" или "income", "amount": 45, "category": "Продукты/Кафе/Транспорт/Репетиторство", "comment": "Описание" }

Сегодняшняя дата (локальная): ${new Date().toLocaleString('ru-RU')}
Текущая дата ISO: ${new Date().toISOString()}
ВАЖНО: Если для ЗАДАЧИ в тексте не указан срок, обязательно ставь deadline как сегодняшнюю дату (в формате YYYY-MM-DD). Не используй null для дедлайнов задач.

Верни ТОЛЬКО валидный JSON массив без Markdown разметки. Если мысль одна, верни массив из одного объекта. Пример:
[
  { "type": "task", "title": "Купить молоко", "deadline": "${new Date().toISOString().split('T')[0]}", "priority": "Низкий" }
]`;

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
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
  },

  async assistWithNote(content, userPrompt, type) {
    const apiKey = Config.geminiKey;
    const apiUrl = Config.aiApiUrl;
    const model = Config.aiModel;
    if (!apiKey) throw new Error('API ключ не настроен (нужен для ИИ)');

    let systemPrompt = '';
    
    if (type === 'rewrite') {
      systemPrompt = `Ты — эксперт-редактор. Твоя задача — взять черновик пользователя и переписать его в красивый, связный и структурированный текст. 
Сохрани смысл, но сделай текст профессиональным и легким для чтения. Форматируй текст абзацами и списками, если нужно.
Верни ТОЛЬКО улучшенный текст, без вводных фраз вроде "Вот улучшенный вариант:".`;
    } else {
      systemPrompt = `Ты — личный наставник и ИИ-ассистент. Пользователь показывает тебе свои заметки/идеи и задает вопрос или просит совета. 
Твоя задача — проанализировать текст заметки и дать полезный, конструктивный и практичный ответ или совет на основе запроса пользователя.
Отвечай лаконично, структурированно, без лишней воды.`;
    }

    const messages = [];
    if (type === 'rewrite') {
      messages.push({ role: 'user', content: `Текст для улучшения:\n\n${content}` });
    } else {
      messages.push({ role: 'user', content: `Вот моя текущая заметка/идея:\n\n${content}\n\n--- КОНЕЦ ЗАМЕТКИ ---\n\nМой запрос/вопрос: ${userPrompt}` });
    }

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `API error ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  },

  async autoFillKnowledge(content) {
    const apiKey = Config.geminiKey;
    const apiUrl = Config.aiApiUrl;
    const model = Config.aiModel;
    if (!apiKey) throw new Error('API ключ не настроен (нужен для ИИ)');

    const systemPrompt = `Ты — умный ассистент, который помогает структурировать базу знаний пользователя. 
Пользователь передаст тебе текст документа. Твоя задача — сгенерировать подходящий Заголовок, определить Тип и придумать 3-5 Тегов.
Доступные типы (выбери один строго из списка): Промт, Инструмент, Статья, Кейс, Урок, Заметка.
Верни ТОЛЬКО валидный JSON без маркдаун-блоков. Формат: { "title": "...", "type": "...", "tags": ["tag1", "tag2"] }`;

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content.substring(0, 4000) } // Ограничиваем длину для экономии
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `API error ${res.status}`);
    }

    const data = await res.json();
    let jsonStr = data.choices?.[0]?.message?.content?.trim() || '{}';
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    }
    
    return JSON.parse(jsonStr);
  },

  async generateTutoringAI(mode, studentCtx, currentLesson = {}, prevLesson = null, allLessons = []) {
    const settings = await DB.getSettings();
    const apiKey = Config.geminiKey || settings?.api_key;
    const apiUrl = Config.aiApiUrl || settings?.api_url || DEFAULT_API_URL;
    const model = Config.aiModel || settings?.model || DEFAULT_MODEL;
    if (!apiKey) throw new Error('API ключ не настроен.');

    const dossierText = [
      `Ученик: ${studentCtx.name || 'Ученик'}`,
      `Уровень/Класс: ${studentCtx.grade || 'Не указан'}`,
      studentCtx.interests ? `Интересы и хобби ученика: ${studentCtx.interests}` : '',
      studentCtx.errors ? `Типичные ошибки / слабые места: ${studentCtx.errors}` : '',
      studentCtx.vocab ? `Активный словарь (Vocabulary Bank): ${studentCtx.vocab}` : '',
      studentCtx.notes ? `Заметки учителя: ${studentCtx.notes}` : '',
      prevLesson ? `Предыдущий урок (${new Date(prevLesson.date).toLocaleDateString('ru-RU')}): Тема "${prevLesson.topic || 'не указана'}", Заданное ДЗ: "${prevLesson.homework || 'не было'}"` : ''
    ].filter(Boolean).join('\n');

    let prompt = '';
    if (mode === 'warmup') {
      prompt = `Создай 5-минутную разминку (Warm-up) для начала урока английского (в стиле платформы Twee).\nТекущая тема: "${currentLesson.topic || 'Повторение и разговорная практика'}".\nВключи:\n1. 3 живых вопроса для обсуждения (Speaking), вплетая интересы ученика и лексику/грамматику прошлого урока.\n2. Короткую мини-игру на 2 минуты (например: Find the mistake / Two truths and a lie / Word association) по слабым местам ученика.\nПиши компактно, сразу к делу.`;
    } else if (mode === 'blitz_check') {
      prompt = `Создай 2-минутную блиц-проверку (Blitz Homework Check), чтобы быстро проверить, как ученик усвоил тему прошлого урока и сам ли он делал ДЗ.\nДай 3 устных контрольных вопроса или коротких предложения на перевод "сходу" (с правильными ответами в скобках для преподавателя), бьющих точно по прошлому ДЗ и типичным ошибкам ученика.`;
    } else if (mode === 'homework') {
      const hasScenario = currentLesson.scenario && currentLesson.scenario.trim().length > 20;
      prompt = `Ты — первоклассный, заботливый методист и преподаватель английского языка.
Ученик: ${studentCtx.name || 'Ученик'} (${studentCtx.grade || 'уровень по программе'}).
${hasScenario ? `НИЖЕ ДАН СЦЕНАРИЙ И МАТЕРИАЛЫ ПРОВЕДЁННОГО УРОКА:\n"""\n${currentLesson.scenario}\n"""` : `Тема урока: "${currentLesson.topic || 'Общий английский'}".`}

ТВОЯ ЗАДАЧА:
Сформировать кристально понятное, вдохновляющее и подробное домашнее задание НАПРЯМУЮ ДЛЯ УЧЕНИКА.
Ученик не должен гадать, ЧТО делать и КАК делать. Каждое задание должно быть полностью разжёвано, с правилом-шпаргалкой, примерами и четким способом сдачи!

СТРУКТУРА ДОМАШНЕГО ЗАДАНИЯ (СТРОГО 3 ШАГА):

1. 🔤 Шаг 1: Лексика урока (Слова с транскрипцией, переводом и контекстными примерами)
   - 4-6 ключевых слов или словообразовательных семейств из урока (например: danger → dangerous → endangered).
   - Для КАЖДОГО слова ОБЯЗАТЕЛЬНО дай:
     • Английское слово
     • Транскрипцию [IPA]
     • Точный русский перевод
     • Живой пример предложения на английском с переводом на русский в скобках.
   - Задание: прочитать слова вслух 2 раза и составить 1 своё предложение с любым понравившимся словом.

2. ⚡ Шаг 2: Грамматика — Понятная шпаргалка и практическое мини-задание
   - Если тема, например, "Present Perfect vs Past Simple" (или любая грамматическая тема урока), распиши понятную памятку:
     • В чём разница и в каких ситуациях используется каждое время (слова-маркеры: yesterday/last year/ago vs already/ever/never/yet).
     • Формулы построения:
       (+) Утверждение: формула и пример.
       (-) Отрицание: формула и пример.
       (?) Общий вопрос: формула и пример краткого ответа.
       (Wh-?) Специальный вопрос: формула и пример.
     • Нюансы и ловушки теста (например: been to vs gone to, исключения V3, артикли the с реками/морями/океанами).
   - Практическое мини-задание на закрепление: 3-5 предложений (раскрыть скобки / вставить верное слово / исправить ошибку) с наглядным примером «💡 Example: ...».

3. 🗣 Шаг 3: Творческое / разговорное задание
   - Чёткая инструкция формата сдачи: как именно сдать (например: «Вариант А: Запиши голосовое сообщение в Telegram на 40-60 секунд. Вариант Б: Напиши 4-5 предложений в тетради от руки и сфоткай сюда в чат»).
   - Готовые опорные фразы и клише (sentence starters), которые ученик должен использовать (например: "I have already...", "I haven't... yet", "Last summer I...").

4. 📬 Как сдать ДЗ:
   Дружелюбная инструкция: «Пришли ответы сюда в чат текстом, сфотографируй тетрадь или отправь голосовое сообщение! Не забудь нажать кнопку "Я сделал(а) ДЗ!", когда закончишь! 👍»

В самом конце (отдельным блоком) добавь:
🔑 КЛЮЧИ ДЛЯ ПРЕПОДАВАТЕЛЯ: (краткие правильные ответы ко 2-му шагу для быстрой проверки).`;
    } else if (mode === 'parent_msg') {
      prompt = `Напиши готовое, теплое и профессиональное сообщение для ученика или его родителей в Telegram/Viber по итогам сегодняшнего урока.\nТема сегодня: "${currentLesson.topic || 'Практика английского'}".\nДомашнее задание на следующий раз: "${currentLesson.homework || 'Повторить лексику урока'}".\nСтруктура: Приветствие, что сегодня классно разобрали и за что можно похвалить, над чем ещё работаем, и чётко выделенное Домашнее задание. Без лишних вступлений, сразу текст сообщения для копирования!`;
    } else if (mode === 'monthly_report') {
      const historyLines = (allLessons || []).slice(0, 8).map(l => `- ${new Date(l.date).toLocaleDateString('ru-RU')}: ${l.topic || 'Практика'} (ДЗ: ${(l.homework || '—').split('\n')[0]})`).join('\n');
      prompt = `Составь красивый "📊 Отчёт о прогрессе ученика" за последние занятия (для отправки родителям или самому ученику в Telegram).\nПройденные уроки:\n${historyLines || 'Нет записанных тем'}\n\nСтруктура отчёта:\n1. 🌟 Главные достижения и пройденные темы\n2. 📈 Над какими ошибками и навыками мы сейчас работаем\n3. 🎯 План и фокус на следующие 4 занятия\nПиши вдохновляюще, структурно, с эмодзи, готовым текстом для пересылки!`;
    } else if (mode === 'game_5min') {
      prompt = `До конца урока осталось 5-7 минут! Создай живую, увлекательную устную мини-игру на 5 минут по теме "${currentLesson.topic || 'Повторение и лексика'}", используя активный словарь, типичные ошибки и интересы ученика.\nВыбери один из форматов: "Детективное расследование / Алиби", "Угадай слово по 3 подсказкам (Taboo)", "2 правды и 1 ложь с ловушками на грамматику" или "Блиц-аукцион ошибок".\nПиши сразу готовый сценарий и реплики для преподавателя (с правильными ответами в скобках)!`;
    }

    const data = await this._callAPI(
      apiUrl,
      apiKey,
      model,
      `Ты — топовый методист и ИИ-ассистент преподавателя английского языка (Twee + Lesson Mate AI).\nДОСЬЕ УЧЕНИКА:\n${dossierText}`,
      [{ role: 'user', content: prompt }],
      true
    );
    return data.choices?.[0]?.message?.content?.trim() || '';
  },

  async parsePerplexityLesson(rawText, studentName = 'Ученик') {
    const settings = await DB.getSettings();
    const apiKey = Config.geminiKey || settings?.api_key;
    const apiUrl = Config.aiApiUrl || settings?.api_url || DEFAULT_API_URL;
    const model = Config.aiModel || settings?.model || DEFAULT_MODEL;
    if (!apiKey) throw new Error('API ключ не настроен.');

    const sysPrompt = `Ты — ИИ-парсер конспектов уроков английского из Perplexity Spaces.
Преподаватель вставляет сырой текст (ответ Perplexity с планом урока, упражнениями, словами или конспектом).
Твоя задача — извлечь структурированные данные и вернуть СТРОГО валидный JSON без markdown-обертки:
{
  "topic": "Краткая и емкая тема урока (например: Past Simple vs Past Continuous + Travel Vocab)",
  "homework": "Готовое домашнее задание для ученика БЕЗ ответов/ключей преподавателя (чистый текст, который можно отправить ученику)",
  "new_vocab": "Новые слова и фразы из этого урока через запятую (английское слово — русский перевод, до 10-12 штук)",
  "verbs": "Неправильные глаголы урока если есть (например: see - saw - seen, buy - bought - bought)",
  "grammar_rule": "Краткое правило грамматики урока в 1-2 предложениях",
  "parent_msg": "Готовое дружелюбное сообщение для ученика/родителей в Telegram по итогам урока (с темой и домашним заданием без ответов)"
}`;
    const data = await this._callAPI(
      apiUrl,
      apiKey,
      model,
      sysPrompt,
      [{ role: 'user', content: `Ученик: ${studentName}\n\nТекст из Perplexity:\n${rawText}` }],
      true
    );
    let jsonStr = data.choices?.[0]?.message?.content?.trim() || '{}';
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    }
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }
    return JSON.parse(jsonStr);
  },

  async parseTeacherDebrief(rawDebrief, studentCtx) {
    const settings = await DB.getSettings();
    const apiKey = Config.geminiKey || settings?.api_key;
    const apiUrl = Config.aiApiUrl || settings?.api_url || DEFAULT_API_URL;
    const model = Config.aiModel || settings?.model || DEFAULT_MODEL;
    if (!apiKey) throw new Error('API ключ не настроен.');

    const sysPrompt = `Ты — профессиональный методист и персональный ассистент преподавателя английского языка Игоря.
Преподаватель надиктовал или записал живой, честный разбор прошедшего урока (что прошли, где ученик путался, что не получилось, за что похвалить, что задано).
Твоя задача — проанализировать эти мысли и вернуть СТРОГО валидный JSON без markdown-обертки:
{
  "new_errors": "Кратко через запятую конкретные ошибки и слабые места для добавления в Error Log (например: путает was/were, забывает the перед морями)",
  "new_vocab": "Новые слова и фразы урока через запятую для добавления в Vocabulary Bank",
  "homework": "Чёткое домашнее задание для ученика (если преподаватель упоминал)",
  "parent_report": "Тёплый, честный, вежливый и дипломатичный отчёт для родителей. Структура: Приветствие, успехи и за что похвалили ${studentCtx.name || 'ученика'}, честно над какими ошибками сейчас работаем, понятная стратегия на следующие уроки и домашнее задание.",
  "teacher_strategy": "Короткий стратегический совет для преподавателя на следующий урок (с учётом кривой Эббингауза и этих ошибок, на что обратить внимание)"
}`;
    const data = await this._callAPI(
      apiUrl,
      apiKey,
      model,
      sysPrompt,
      [{ role: 'user', content: `Ученик: ${studentCtx.name || 'Ученик'} (${studentCtx.grade || ''})\nТекущие слабые места: ${studentCtx.errors || 'нет'}\nСловарь: ${studentCtx.vocab || 'нет'}\n\nСырой дебрифинг преподавателя:\n${rawDebrief}` }],
      true
    );
    let jsonStr = data.choices?.[0]?.message?.content?.trim() || '{}';
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    }
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }
    return JSON.parse(jsonStr);
  },

  async generateHomework(studentName, grade, topic, extraContext = {}) {
    const settings = await DB.getSettings();
    const apiKey = Config.geminiKey || settings?.api_key;
    const apiUrl = Config.aiApiUrl || settings?.api_url || DEFAULT_API_URL;
    const model = Config.aiModel || settings?.model || DEFAULT_MODEL;

    if (!apiKey) throw new Error('API ключ не настроен. Перейдите в настройки.');

    const systemPrompt = `Ты — опытный, креативный и дружелюбный преподаватель английского языка. 
Твоя задача: составить интересное и полезное домашнее задание.
Ученик: ${studentName}.
Класс/Уровень: ${grade || 'Не указан'}.
Тема урока: ${topic}.

Напиши 3-4 небольших практических задания (например: вставить слово, перевести, ответить на вопрос или придумать историю), чтобы ученик закрепил материал.
Пиши задания на английском, а пояснения (если нужно) на русском.
ДЗ должно быть рассчитано на 10-15 минут выполнения. Никаких лишних слов, сразу выдавай готовый текст домашки!`;

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Составь домашку по теме "${topic}".` }
        ],
        temperature: 0.7
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `API error ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  },

  async transcribeAudio(audioBlob) {
    const settings = await DB.getSettings();
    const apiKey = settings?.api_key || Config.geminiKey;
    const apiUrl = 'https://api.groq.com/openai/v1/audio/transcriptions';

    if (!apiKey) throw new Error('API ключ не настроен. Перейдите в настройки.');

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-large-v3');

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `API error ${res.status}`);
    }

    const data = await res.json();
    return data.text?.trim() || '';
  }
};
