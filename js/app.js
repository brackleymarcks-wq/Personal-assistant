// ============================================
// APP — Main orchestrator
// ============================================

const UI = {
  toast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideInRight 0.25s ease reverse';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  },

  openModal(titleHtml, bodyHtml, footerHtml) {
    let modal = document.getElementById('generic-modal');
    if (!modal) {
      document.body.insertAdjacentHTML('beforeend', `
        <div id="generic-modal" class="modal-overlay hidden">
          <div class="modal">
            <div class="modal-header">
              <h2 class="modal-title" id="generic-modal-title" style="display:flex;align-items:center;gap:8px;"></h2>
              <button class="modal-close" onclick="UI.closeModal()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="modal-body" id="generic-modal-body"></div>
            <div class="modal-footer" id="generic-modal-footer"></div>
          </div>
        </div>
      `);
      modal = document.getElementById('generic-modal');
      modal.onclick = (e) => { if (e.target === modal) UI.closeModal(); };
    }
    document.getElementById('generic-modal-title').innerHTML = titleHtml;
    document.getElementById('generic-modal-body').innerHTML = bodyHtml;
    document.getElementById('generic-modal-footer').innerHTML = footerHtml;
    if (window.lucide) window.lucide.createIcons();
    modal.classList.remove('hidden');
  },

  closeModal() {
    const modal = document.getElementById('generic-modal');
    if (modal) modal.classList.add('hidden');
  }
};

const PAGES = {
  dashboard: { module: () => DashboardPage, label: 'Дашборд' },
  inbox: { module: () => InboxPage, label: 'Входящие' },
  tasks: { module: () => TasksPage, label: 'Задачи' },
  projects: { module: () => ProjectsPage, label: 'Проекты' },
  calendar: { module: () => CalendarPage, label: 'Календарь' },
  habits: { module: () => HabitsPage, label: 'Привычки' },
  goals: { module: () => GoalsPage, label: 'Цели' },
  tutoring: { module: () => TutoringPage, label: 'Репетиторство' },
  knowledge: { module: () => KnowledgePage, label: 'База знаний' },
  graph: { module: () => GraphPage, label: 'Граф связей' },
  chat: { module: () => ChatPage, label: 'Чат' },
  pomodoro: { module: () => PomodoroPage, label: 'Помодоро' },
  gantt: { module: () => GanttPage, label: 'Гант' },
  notes: { module: () => NotesPage, label: 'Заметки' },
  finances: { module: () => FinancesPage, label: 'Финансы' },
  analytics: { module: () => AnalyticsPage, label: 'Аналитика' },
  archive: { module: () => ArchivePage, label: 'Архив задач' }
};

const App = {
  currentPage: 'dashboard',
  reminderInterval: null,

  async boot() {
    this.applyTheme();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (Config.get().theme === 'auto' || !Config.get().theme) this.applyTheme();
    });

    if (!Config.isConfigured()) {
      this.showSetup();
      return;
    }
    await this.initDB();
  },

  applyTheme() {
    const cfg = Config.get();
    const theme = cfg.theme || 'auto';
    const glass = cfg.glassEnabled !== false;

    document.body.classList.remove('theme-light', 'theme-comfort');

    if (theme === 'light') {
      document.body.classList.add('theme-light');
    } else if (theme === 'comfort') {
      document.body.classList.add('theme-comfort');
    } else if (theme === 'auto') {
      const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (!systemDark) {
        document.body.classList.add('theme-light');
      }
    }

    if (glass) {
      document.body.classList.add('glass-enabled');
    } else {
      document.body.classList.remove('glass-enabled');
    }
  },

  showSetup() {
    document.getElementById('setup-screen').classList.remove('hidden');
    document.getElementById('main-layout').classList.add('hidden');

    document.getElementById('setup-save-btn').addEventListener('click', async () => {
      const url = document.getElementById('setup-supabase-url').value.trim();
      const key = document.getElementById('setup-supabase-key').value.trim();
      const gem = document.getElementById('setup-gemini-key').value.trim();
      const name = document.getElementById('setup-name').value.trim() || 'Пользователь';
      const errEl = document.getElementById('setup-error');

      if (!url || !key || !gem) {
        errEl.textContent = 'Заполни все поля';
        errEl.classList.remove('hidden');
        return;
      }

      errEl.classList.add('hidden');
      document.getElementById('setup-save-btn').innerHTML = '<span>Подключаем…</span>';
      document.getElementById('setup-save-btn').disabled = true;

      Config.save({ supabaseUrl: url, supabaseKey: key, geminiKey: gem, userName: name });

      const ok = DB.init();
      if (!ok) {
        errEl.textContent = 'Не удалось подключиться к Supabase. Проверь URL и ключ.';
        errEl.classList.remove('hidden');
        document.getElementById('setup-save-btn').innerHTML = '<span>Начать работу</span>';
        document.getElementById('setup-save-btn').disabled = false;
        Config.save({ supabaseUrl: '', supabaseKey: '' });
        return;
      }

      try {
        await DB.getOrCreateUser(name);
        await this.initDB();
      } catch (e) {
        errEl.textContent = 'Ошибка: ' + e.message;
        errEl.classList.remove('hidden');
        document.getElementById('setup-save-btn').innerHTML = '<span>Начать работу</span>';
        document.getElementById('setup-save-btn').disabled = false;
      }
    });
  },

  async initDB() {
    DB.init();

    // Ensure user exists
    try {
      await DB.getOrCreateUser(Config.userName);
    } catch (e) {
      console.error('User init error:', e);
    }

    // Show main layout
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('main-layout').classList.remove('hidden');

    this.initNav();
    this.initSidebar();
    this.initSettings();
    this.initThemeToggle();
    this.applyTheme();
    this.updateIcons();

    // Start first page
    await this.navigateTo(this.currentPage);

    // Initialize Global modules
    if (window.QuickActions) QuickActions.init();
    if (window.ChatWidget) window.ChatWidget.init();

    console.log('App initialized.');
    this.startReminderCheck();
    this.updateUserUI();
  },

  updateUserUI() {
    const name = Config.userName;
    const el = document.getElementById('user-name-display');
    const av = document.getElementById('user-avatar');
    if (el) el.textContent = name;
    if (av) av.textContent = name.charAt(0).toUpperCase();
  },

  initThemeToggle() {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const cfg = Config.get();
      const current = cfg.theme || 'auto';
      const order = ['auto', 'light', 'dark', 'comfort'];
      const nextIdx = (order.indexOf(current) + 1) % order.length;
      const nextTheme = order[nextIdx];
      Config.save({ theme: nextTheme });
      this.applyTheme();
      UI.toast(`Тема оформлениия: ${this.getThemeLabel(nextTheme)}`, 'info', 1500);
    });
  },

  getThemeLabel(theme) {
    const labels = {
      auto: 'Авто (системная)',
      light: 'Светлая',
      dark: 'Тёмная',
      comfort: 'Комфорт для глаз'
    };
    return labels[theme] || theme;
  },

  initNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateTo(item.dataset.page);
      });
    });
  },

  initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    const collapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    if (collapsed) sidebar.classList.add('collapsed');

    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
    });
  },

  initSettings() {
    document.getElementById('settings-btn').addEventListener('click', () => SettingsModule.open());
  },

  async navigateTo(page) {
    if (!PAGES[page]) return;
    this.currentPage = page;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // Render page
    const pageModule = PAGES[page].module();
    const content = document.getElementById('content-area');
    content.innerHTML = pageModule.render();
    await pageModule.init();
    this.updateIcons();
  },

  async refreshTasksBadge() {
    try {
      const tasks = await DB.getTasks();
      const urgent = tasks.filter(t =>
        !['Готово', 'Отменена'].includes(t.status) &&
        t.deadline &&
        new Date(t.deadline) <= new Date(Date.now() + 86400000)
      ).length;
      const badge = document.getElementById('tasks-badge');
      if (badge) {
        badge.style.display = urgent > 0 ? '' : 'none';
        badge.textContent = urgent;
      }
    } catch { }
  },

  startReminderCheck() {
    this.checkReminders();
    this.reminderInterval = setInterval(() => this.checkReminders(), 60000);
  },

  async checkReminders() {
    try {
      const reminders = await DB.getActiveReminders();
      for (const r of reminders) {
        UI.toast(`⏰ ${r.message}`, 'warning', 8000);
        await DB.markReminderSent(r.id);
      }
    } catch { }
  },

  updateIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
};

// ============================================
// BOOT
// ============================================
document.addEventListener('DOMContentLoaded', () => App.boot());
