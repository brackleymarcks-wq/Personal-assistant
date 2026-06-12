// ============================================
// QUICK ACTIONS (Cmd+K / Ctrl+K)
// ============================================

const QuickActions = {
  isOpen: false,
  commands: [
    { id: 'nav_dashboard', title: 'Перейти на Главную', icon: '🏠', action: () => App.navigateTo('dashboard'), section: 'Навигация' },
    { id: 'nav_tasks', title: 'Перейти к Задачами', icon: '✅', action: () => App.navigateTo('tasks'), section: 'Навигация' },
    { id: 'nav_projects', title: 'Перейти к Проектам', icon: '📁', action: () => App.navigateTo('projects'), section: 'Навигация' },
    { id: 'nav_calendar', title: 'Перейти в Календарь', icon: '📅', action: () => App.navigateTo('calendar'), section: 'Навигация' },
    { id: 'nav_gantt', title: 'Перейти в Диаграмму Ганта', icon: '📊', action: () => App.navigateTo('gantt'), section: 'Навигация' },
    { id: 'nav_habits', title: 'Перейти к Привычкам', icon: '⭐', action: () => App.navigateTo('habits'), section: 'Навигация' },
    { id: 'nav_pomodoro', title: 'Перейти к Помодоро', icon: '🍅', action: () => App.navigateTo('pomodoro'), section: 'Навигация' },
    { id: 'nav_goals', title: 'Перейти к Целям', icon: '🎯', action: () => App.navigateTo('goals'), section: 'Навигация' },
    { id: 'nav_knowledge', title: 'Перейти в Базу знаний', icon: '🧠', action: () => App.navigateTo('knowledge'), section: 'Навигация' },
    { id: 'nav_notes', title: 'Перейти к Заметкам', icon: '📝', action: () => App.navigateTo('notes'), section: 'Навигация' },
    { id: 'nav_finances', title: 'Перейти к Финансам', icon: '💸', action: () => App.navigateTo('finances'), section: 'Навигация' },
    { id: 'nav_analytics', title: 'Перейти к Аналитике', icon: '📈', action: () => App.navigateTo('analytics'), section: 'Навигация' },
    { id: 'nav_inbox', title: 'Перейти во Входящие', icon: '📥', action: () => App.navigateTo('inbox'), section: 'Навигация' },
    { id: 'nav_chat', title: 'Перейти в Чат (ИИ)', icon: '💬', action: () => App.navigateTo('chat'), section: 'Навигация' },
    { id: 'nav_settings', title: 'Настройки', icon: '⚙️', action: () => App.navigateTo('settings'), section: 'Навигация' },

    { id: 'create_task', title: 'Создать задачу', icon: '➕', action: () => { App.navigateTo('tasks'); setTimeout(() => TasksPage.openModal(), 100); }, section: 'Создание' },
    { id: 'create_project', title: 'Создать проект', icon: '➕', action: () => { App.navigateTo('projects'); setTimeout(() => ProjectsPage.openModal(), 100); }, section: 'Создание' },
    { id: 'create_event', title: 'Создать событие', icon: '➕', action: () => { App.navigateTo('calendar'); setTimeout(() => CalendarPage.openModal(), 100); }, section: 'Создание' },
    { id: 'create_note', title: 'Создать заметку', icon: '➕', action: () => { App.navigateTo('notes'); setTimeout(() => NotesPage.openModal(), 100); }, section: 'Создание' },
    { id: 'create_income', title: 'Добавить доход', icon: '📈', action: () => { App.navigateTo('finances'); setTimeout(() => FinancesPage.openModal('income'), 100); }, section: 'Создание' },
    { id: 'create_expense', title: 'Добавить расход', icon: '📉', action: () => { App.navigateTo('finances'); setTimeout(() => FinancesPage.openModal('expense'), 100); }, section: 'Создание' },
    { id: 'quick_inbox', title: 'Быстрая мысль во Входящие', icon: '📥', action: () => QuickActions.openQuickInbox(), section: 'Создание' },

    { id: 'theme_dark', title: 'Темная тема', icon: '🌙', action: () => App.setTheme('dark'), section: 'Внешний вид' },
    { id: 'theme_light', title: 'Светлая тема', icon: '☀️', action: () => App.setTheme('light'), section: 'Внешний вид' },
    { id: 'theme_comfort', title: 'Комфортная тема', icon: '☕', action: () => App.setTheme('comfort'), section: 'Внешний вид' },
  ],
  selectedIndex: 0,
  filteredCommands: [],

  init() {
    this.createDOM();
    this.bindEvents();
  },

  createDOM() {
    if (document.getElementById('quick-actions-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'quick-actions-overlay';
    overlay.className = 'quick-actions-overlay hidden';
    overlay.innerHTML = `
      <div class="quick-actions-panel" id="quick-actions-panel">
        <input type="text" id="quick-actions-input" class="quick-actions-input" placeholder="Куда перейдем или что сделаем?">
        <div id="quick-actions-results" class="quick-actions-results"></div>
        <div class="quick-actions-footer">
          <kbd>↑</kbd> <kbd>↓</kbd> Навигация
          <kbd>Enter</kbd> Выбор
          <kbd>Esc</kbd> Закрыть
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  bindEvents() {
    document.addEventListener('keydown', (e) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.toggle();
      }

      if (!this.isOpen) return;

      if (e.key === 'Escape') {
        this.close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredCommands.length - 1);
        this.renderResults();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.renderResults();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = this.filteredCommands[this.selectedIndex];
        if (cmd) {
          this.close();
          cmd.action();
        }
      }
    });

    document.getElementById('quick-actions-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'quick-actions-overlay') this.close();
    });

    document.getElementById('quick-actions-input').addEventListener('input', (e) => {
      this.filterCommands(e.target.value);
    });
  },

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  },

  open() {
    this.isOpen = true;
    const overlay = document.getElementById('quick-actions-overlay');
    const input = document.getElementById('quick-actions-input');
    overlay.classList.remove('hidden');
    input.value = '';
    this.filterCommands('');
    setTimeout(() => input.focus(), 50);
  },

  close() {
    this.isOpen = false;
    document.getElementById('quick-actions-overlay').classList.add('hidden');
  },

  filterCommands(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
      this.filteredCommands = [...this.commands];
    } else {
      this.filteredCommands = this.commands.filter(cmd => 
        cmd.title.toLowerCase().includes(q) || cmd.section.toLowerCase().includes(q)
      );
    }
    this.selectedIndex = 0;
    this.renderResults();
  },

  renderResults() {
    const container = document.getElementById('quick-actions-results');
    
    if (this.filteredCommands.length === 0) {
      container.innerHTML = `<div style="padding:var(--space-lg);text-align:center;color:var(--text-muted);font-size:13px">Ничего не найдено</div>`;
      return;
    }

    let html = '';
    let currentSection = '';

    this.filteredCommands.forEach((cmd, i) => {
      if (cmd.section !== currentSection) {
        currentSection = cmd.section;
        html += `<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;padding:var(--space-sm) var(--space-md);margin-top:var(--space-sm)">${currentSection}</div>`;
      }

      html += `
        <div class="quick-action-item ${i === this.selectedIndex ? 'selected' : ''}" data-index="${i}">
          <div class="quick-action-icon">${cmd.icon}</div>
          <div class="quick-action-text">${cmd.title}</div>
          ${i === this.selectedIndex ? '<div class="quick-action-hint">↵</div>' : ''}
        </div>
      `;
    });

    container.innerHTML = html;

    // Add click listeners
    container.querySelectorAll('.quick-action-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.index);
        this.close();
        this.filteredCommands[idx].action();
      });
      item.addEventListener('mouseover', () => {
        this.selectedIndex = parseInt(item.dataset.index);
        this.renderResults();
      });
    });

    // Scroll into view
    const selectedEl = container.querySelector('.selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  },

  async openQuickInbox() {
    const note = prompt('Новая мысль или задача во входящие:');
    if (note && note.trim()) {
      try {
        await DB.createInboxItem(note.trim());
        UI.toast('Добавлено во Входящие', 'success');
        if (App.currentPage === 'inbox') InboxPage.load();
        if (App.currentPage === 'dashboard') DashboardPage.load();
      } catch (e) {
        UI.toast('Ошибка сохранения', 'error');
      }
    }
  }
};
