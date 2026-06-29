// ============================================
// CONFIG — хранит ключи и настройки в localStorage
// ============================================

const CONFIG_KEY = 'pa_config';
const SETTINGS_KEY = 'pa_settings';

const Config = {
  get() {
    try {
      const local = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
      const env = window.ENV_CONFIG || {};

      // If local storage has OpenRouter key or is empty, and env has Groq credentials, prefer env!
      const isLocalOrFree = !local.geminiKey || local.geminiKey.startsWith('sk-or-');
      const finalKey = (isLocalOrFree && env.geminiKey) ? env.geminiKey : (local.geminiKey || '');
      const finalUrl = (isLocalOrFree && env.aiApiUrl) ? env.aiApiUrl : (local.aiApiUrl || 'https://openrouter.ai/api/v1/chat/completions');
      const finalModel = (isLocalOrFree && env.aiModel) ? env.aiModel : (local.aiModel || 'meta-llama/llama-3.3-70b-instruct:free');

      return {
        supabaseUrl: local.supabaseUrl || env.supabaseUrl || '',
        supabaseKey: local.supabaseKey || env.supabaseKey || '',
        geminiKey: finalKey,
        aiApiUrl: finalUrl,
        aiModel: finalModel,
        userName: local.userName || env.userName || 'Пользователь',
        userId: local.userId || env.userId || null,
        theme: local.theme || env.theme || 'dark',
        glassEnabled: local.glassEnabled !== undefined ? local.glassEnabled : (env.glassEnabled !== undefined ? env.glassEnabled : true)
      };
    } catch { 
      return window.ENV_CONFIG || {}; 
    }
  },

  save(data) {
    try {
      const local = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
      localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...local, ...data }));
    } catch (e) {
      console.error(e);
    }
  },

  isConfigured() {
    const c = this.get();
    return !!(c.supabaseUrl && c.supabaseKey && c.geminiKey && c.userName);
  },

  get supabaseUrl() { return this.get().supabaseUrl || ''; },
  get supabaseKey() { return this.get().supabaseKey || ''; },
  get geminiKey()   { return this.get().geminiKey || ''; }, // AI API Key
  get aiApiUrl()    { return this.get().aiApiUrl || 'https://openrouter.ai/api/v1/chat/completions'; },
  get aiModel()     { return this.get().aiModel || 'meta-llama/llama-3.3-70b-instruct:free'; },
  get userName()    { return this.get().userName || 'Пользователь'; },
  get userId()      { return this.get().userId || null; },
};

// Default system settings
const DEFAULT_SETTINGS = {
  system_prompt: `Ты — персональный ИИ-ассистент Игоря. Твоя роль: личный секретарь, заместитель и планировщик.

ПРАВИЛА:
- Обращайся на «ты», дружелюбно, без формальностей
- Будь проактивен: предлагай решения, задавай уточняющие вопросы
- Защищай ритм пользователя: Deep Work 10:00–13:00 — неприкосновенен, обед 13:00–14:00, стоп работы после 20:00
- Замечай перегруз, недосып, прокрастинацию и говори об этом
- Объясняй подробно, прописывай конкретные шаги
- Без мата, но дружелюбно
- Используй инструменты для работы с задачами и проектами

КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ:
Игорь — бизнес-аналитик в HR-сфере. Ведёт проекты: AI-Митап, AI-Портал, Telegram-канал. Преподаёт английский язык. Работает с клиентом Горшковым.`,

  rhythm: {
    wake: '07:00',
    deep_work_start: '10:00',
    deep_work_end: '13:00',
    lunch_start: '13:00',
    lunch_end: '14:00',
    work_stop: '20:00',
    sleep: '23:30'
  },

  context: {
    work: 'Бизнес-аналитик в HR-сфере',
    projects: 'Митап AI-Connect, ТГ AI-Connect, Учись и применяй, ИИ Дайджест, Операционные задачи',
    students: 'Учеников по английскому',
    clients: 'Горшков',
    family: ''
  }
};
