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
  },

  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  },

  sendNotification(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      });
    }
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
  health: { module: () => HealthPage, label: 'Здоровье' },
  tutoring: { module: () => TutoringPage, label: 'Репетиторство' },
  knowledge: { module: () => KnowledgePage, label: 'База знаний' },
  chat: { module: () => ChatPage, label: 'Чат' },
  pomodoro: { module: () => PomodoroPage, label: 'Помодоро' },
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

    const currentConfig = Config.get();
    if (currentConfig.supabaseUrl) document.getElementById('setup-supabase-url').value = currentConfig.supabaseUrl;
    if (currentConfig.supabaseKey) document.getElementById('setup-supabase-key').value = currentConfig.supabaseKey;
    if (currentConfig.geminiKey) document.getElementById('setup-gemini-key').value = currentConfig.geminiKey;
    if (currentConfig.userName) document.getElementById('setup-name').value = currentConfig.userName;

    document.getElementById('setup-save-btn').addEventListener('click', async () => {
      let url = document.getElementById('setup-supabase-url').value.trim();
      const key = document.getElementById('setup-supabase-key').value.trim();
      const gem = document.getElementById('setup-gemini-key').value.trim();
      
      // iPhone sometimes adds a trailing dot or slash. Clean it up.
      url = url.replace(/[\.\/]+$/, '');
      
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
      
      // Client-side migration: update any null area columns to default "Работа"
      await Promise.all([
        DB.client.from('tasks').update({ area: 'Работа' }).is('area', null),
        DB.client.from('events').update({ area: 'Работа' }).is('area', null),
        DB.client.from('notes').update({ area: 'Работа' }).is('area', null)
      ]);
      console.log('✅ Client-side area migration completed.');
    } catch (e) {
      console.error('User init or migration error:', e);
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

    // Initialize Workspace/Area Switcher
    const areaSelect = document.getElementById('global-area-select');
    if (areaSelect) {
      const savedArea = localStorage.getItem('currentArea') || 'Все';
      Config.currentArea = savedArea;
      areaSelect.value = savedArea;
      
      areaSelect.addEventListener('change', async (e) => {
        Config.currentArea = e.target.value;
        localStorage.setItem('currentArea', e.target.value);
        UI.toast(`Переключение в сферу: ${e.target.value}`, 'info', 1500);
        await this.navigateTo(this.currentPage); // Refresh current page with new area
      });
    } else {
      Config.currentArea = 'Все';
    }

    // Start first page
    await this.navigateTo(this.currentPage);

    // Initialize Global modules
    if (window.QuickActions) QuickActions.init();
    if (window.ChatWidget) window.ChatWidget.init();
    if (window.CommandPalette) window.CommandPalette.init();

    console.log('App initialized.');
    this.startReminderCheck();
    this.updateUserUI();
    this.initMagneticEffects();
  },

  initMagneticEffects() {
    // Apply magnetic effect to key actionable items without needing explicit classes
    document.querySelectorAll('.nav-item, .btn:not(.btn-full), .magnetic-btn').forEach(btn => {
      // Remove old listeners to avoid duplicates on re-render
      btn.onmousemove = null;
      btn.onmouseleave = null;

      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        // Limit movement to max 6px
        const maxMove = 6;
        const moveX = Math.max(-maxMove, Math.min(maxMove, x * 0.2));
        const moveY = Math.max(-maxMove, Math.min(maxMove, y * 0.2));
        
        btn.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.05)`;
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translate(0px, 0px) scale(1)';
      });
    });
  },

  async updateUserUI() {
    const name = Config.userName;
    const el = document.getElementById('user-name-display');
    const av = document.getElementById('user-avatar');
    if (el) el.textContent = name;
    if (av) av.textContent = name.charAt(0).toUpperCase();

    // RPG Gamification Logic
    try {
      const stats = await DB.getGamificationStats();
      const xp = stats.totalXp;
      
      // Формула уровня: Уровень = √ (Опыт / 50) + 1
      const level = Math.floor(Math.sqrt(xp / 50)) + 1;
      
      // Ранги
      let rank = 'Новичок';
      if (level >= 20) rank = 'Босс Жизни 👑';
      else if (level >= 13) rank = 'Сеньор-Достигатор 💎';
      else if (level >= 8) rank = 'Мастер Времени ⏳';
      else if (level >= 4) rank = 'Джуниор 🚀';
      else if (level >= 2) rank = 'Ученик 🌱';

      // Опыт до следующего уровня
      const currentLevelBaseXp = Math.pow(level - 1, 2) * 50;
      const nextLevelBaseXp = Math.pow(level, 2) * 50;
      const xpInCurrentLevel = xp - currentLevelBaseXp;
      const xpNeededForNextLevel = nextLevelBaseXp - currentLevelBaseXp;
      const progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100));

      const rankEl = document.getElementById('user-rank-display');
      const levelEl = document.getElementById('user-level-display');
      const xpEl = document.getElementById('user-xp-display');
      const progressEl = document.getElementById('user-xp-progress');

      if (rankEl) rankEl.textContent = `Ранг: ${rank}`;
      if (levelEl) levelEl.textContent = `Ур. ${level}`;
      if (xpEl) xpEl.textContent = `${xp} / ${nextLevelBaseXp} XP`;
      if (progressEl) progressEl.style.width = `${progressPercent}%`;

    } catch (e) {
      console.error('Gamification UI error:', e);
    }
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
    const mobileToggle = document.getElementById('mobile-sidebar-toggle');
    const collapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    if (collapsed) sidebar.classList.add('collapsed');

    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
    });

    if (mobileToggle) {
      mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });
    }

    // Close mobile sidebar on click outside
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && sidebar.classList.contains('mobile-open')) {
        if (!sidebar.contains(e.target) && e.target !== mobileToggle && !mobileToggle.contains(e.target)) {
          sidebar.classList.remove('mobile-open');
        }
      }
    });
  },

  initSettings() {
    document.getElementById('settings-btn').addEventListener('click', () => SettingsModule.open());
    const mobileSettingsBtn = document.getElementById('mobile-settings-btn');
    if (mobileSettingsBtn) {
      mobileSettingsBtn.addEventListener('click', () => SettingsModule.open());
    }
  },

  async navigateTo(page) {
    if (!PAGES[page]) return;
    this.currentPage = page;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    const renderDOM = () => {
      const pageModule = PAGES[page].module();
      const content = document.getElementById('content-area');
      
      content.classList.remove('page-enter');
      if (!document.startViewTransition) {
        void content.offsetWidth;
        content.classList.add('page-enter');
      }

      content.innerHTML = pageModule.render();
      this.updateIcons();
      if (this.initMagneticEffects) this.initMagneticEffects();
    };

    const loadData = async () => {
      const pageModule = PAGES[page].module();
      if (!pageModule._initialized) {
        if (pageModule.init) await pageModule.init();
        pageModule._initialized = true;
      } else {
        if (pageModule.bindEvents) {
          pageModule.bindEvents();
        } else if (pageModule.init) {
          await pageModule.init();
        }
        if (pageModule.load) await pageModule.load();
      }
    };

    try {
      if (document.startViewTransition) {
        const transition = document.startViewTransition(() => {
          renderDOM();
        });
        await transition.updateCallbackDone;
        await loadData();
      } else {
        renderDOM();
        await loadData();
      }
    } catch (e) {
      console.error('Navigation error:', e);
      UI.toast('Ошибка загрузки страницы', 'error');
    }
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
    if (this.remindersDisabled) return;
    try {
      const reminders = await DB.getActiveReminders();
      for (const r of reminders) {
        UI.toast(`⏰ ${r.message}`, 'warning', 8000);
        UI.sendNotification('Напоминание', r.message);
        await DB.markReminderSent(r.id);
      }
    } catch (e) {
      console.warn('Reminders table not found or error, disabling polling to prevent console spam.');
      this.remindersDisabled = true;
    }
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
