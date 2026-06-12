// ============================================
// TASKS PAGE
// ============================================

const TasksPage = {
  tasks: [],
  projects: [],
  view: 'list', // list | kanban
  filters: { status: '', direction: '', priority: '', search: '' },

  DIRECTIONS: ['Митап', 'Портал', 'Telegram', 'Английский', 'Личное', 'Горшков'],
  STATUSES: ['Идея', 'Ждёт меня', 'В работе', 'Ждёт других', 'Делегирована', 'Готово', 'Отменена'],
  PRIORITIES: ['Высокий', 'Средний', 'Низкий'],

  KANBAN_STATUSES: ['Идея', 'Ждёт меня', 'В работе', 'Ждёт других', 'Делегирована', 'Готово'],

  STATUS_COLORS: {
    'Идея': '#64748b',
    'Ждёт меня': '#6366f1',
    'В работе': '#3b82f6',
    'Ждёт других': '#f59e0b',
    'Делегирована': '#8b5cf6',
    'Готово': '#10b981',
    'Отменена': '#475569'
  },

  render() {
    return `
      <div class="tasks-page">
        <div class="page-header">
          <div>
            <div class="page-title">Задачи</div>
            <div class="page-subtitle" id="tasks-count-label">Загрузка…</div>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" id="add-task-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Новая задача
            </button>
          </div>
        </div>

        <div class="tasks-toolbar">
          <div class="search-input-wrapper">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input id="tasks-search" type="text" class="form-input search-input" placeholder="Поиск задач…" />
          </div>
          <select id="filter-direction" class="form-input filter-select">
            <option value="">Все направления</option>
            ${this.DIRECTIONS.map(d => `<option value="${d}">${d}</option>`).join('')}
          </select>
          <select id="filter-status" class="form-input filter-select">
            <option value="">Все статусы</option>
            ${this.STATUSES.map(s => `<option value="${s}">${s}</option>`).join('')}
          </select>
          <select id="filter-priority" class="form-input filter-select">
            <option value="">Все приоритеты</option>
            ${this.PRIORITIES.map(p => `<option value="${p}">${p}</option>`).join('')}
          </select>
          <div class="view-toggle">
            <button class="view-btn ${this.view === 'list' ? 'active' : ''}" data-view="list">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              Список
            </button>
            <button class="view-btn ${this.view === 'kanban' ? 'active' : ''}" data-view="kanban">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="18"/><rect x="10" y="3" width="5" height="11"/><rect x="17" y="3" width="5" height="15"/></svg>
              Канбан
            </button>
          </div>
        </div>

        <div id="tasks-content"></div>
      </div>
    `;
  },

  async init() {
    this.bindEvents();
    await this.load();
  },

  bindEvents() {
    document.getElementById('add-task-btn').addEventListener('click', () => this.openTaskModal());

    const search = document.getElementById('tasks-search');
    let searchTimer;
    search.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        this.filters.search = search.value;
        this.renderContent();
      }, 300);
    });

    document.getElementById('filter-direction').addEventListener('change', (e) => {
      this.filters.direction = e.target.value;
      this.renderContent();
    });
    document.getElementById('filter-status').addEventListener('change', (e) => {
      this.filters.status = e.target.value;
      this.renderContent();
    });
    document.getElementById('filter-priority').addEventListener('change', (e) => {
      this.filters.priority = e.target.value;
      this.renderContent();
    });

    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.view = btn.dataset.view;
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderContent();
      });
    });
  },

  async load() {
    [this.tasks, this.projects] = await Promise.all([DB.getTasks(), DB.getProjects()]);
    this.renderContent();
    App.refreshTasksBadge();
  },

  getFilteredTasks() {
    return this.tasks.filter(t => {
      if (this.filters.status && t.status !== this.filters.status) return false;
      if (this.filters.direction && t.direction !== this.filters.direction) return false;
      if (this.filters.priority && t.priority !== this.filters.priority) return false;
      if (this.filters.search) {
        const s = this.filters.search.toLowerCase();
        if (!t.title.toLowerCase().includes(s) && !(t.next_step || '').toLowerCase().includes(s)) return false;
      }
      return true;
    });
  },

  renderContent() {
    const filtered = this.getFilteredTasks();
    const active = filtered.filter(t => !['Готово', 'Отменена'].includes(t.status));
    document.getElementById('tasks-count-label').textContent =
      `${filtered.length} задач · ${active.length} активных`;

    if (this.view === 'kanban') {
      this.renderKanban(filtered);
    } else {
      this.renderList(filtered);
    }
  },

  renderList(tasks) {
    const container = document.getElementById('tasks-content');
    container.className = 'tasks-list-view';

    if (tasks.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">Задач не найдено</div><div class="empty-subtext">Создай первую задачу или измени фильтры</div></div>`;
      return;
    }

    const now = new Date();

    // Group by priority
    const groups = {
      'Высокий': tasks.filter(t => t.priority === 'Высокий' && !['Готово', 'Отменена'].includes(t.status)),
      'Средний': tasks.filter(t => t.priority === 'Средний' && !['Готово', 'Отменена'].includes(t.status)),
      'Низкий': tasks.filter(t => t.priority === 'Низкий' && !['Готово', 'Отменена'].includes(t.status)),
      'Завершённые': tasks.filter(t => ['Готово', 'Отменена'].includes(t.status))
    };

    const PRIORITY_ICONS = { 'Высокий': '🔴', 'Средний': '🟡', 'Низкий': '🟢', 'Завершённые': '✅' };

    let html = '';
    for (const [group, items] of Object.entries(groups)) {
      if (items.length === 0) continue;
      html += `
        <div class="tasks-group">
          <div class="tasks-group-header">${PRIORITY_ICONS[group]} ${group} <span style="color:var(--text-muted)">(${items.length})</span></div>
          ${items.map(t => this.renderTaskCard(t, now)).join('')}
        </div>
      `;
    }

    container.innerHTML = html;
    container.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('click', () => this.openTaskModal(card.dataset.id));
    });
    container.querySelectorAll('.task-checkbox').forEach(cb => {
      cb.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleTaskDone(cb.dataset.id, cb.dataset.done === 'true');
      });
    });
  },

  renderTaskCard(task, now = new Date()) {
    const deadline = task.deadline ? new Date(task.deadline) : null;
    const isOverdue = deadline && deadline < now && !['Готово', 'Отменена'].includes(task.status);
    const isToday = deadline && deadline.toDateString() === now.toDateString();
    const isDone = task.status === 'Готово';

    const deadlineText = deadline
      ? deadline.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
      : '';

    return `
      <div class="task-card ${isOverdue ? 'overdue' : ''} ${isToday && !isOverdue ? 'today' : ''} ${isDone ? 'done' : ''}" data-id="${task.id}">
        <div class="task-checkbox ${isDone ? 'checked' : ''}" data-id="${task.id}" data-done="${isDone}"></div>
        <div class="task-info">
          <div class="task-title">${this.escHtml(task.title)}</div>
          <div class="task-meta">
            ${task.direction ? `<span class="task-badge badge-direction">${task.direction}</span>` : ''}
            <span class="task-badge badge-${(task.priority || 'medium').toLowerCase().replace('высокий','high').replace('средний','medium').replace('низкий','low')}">${task.priority || ''}</span>
            ${task.status ? `<span class="task-badge" style="background:var(--bg-elevated);color:var(--text-secondary)">${task.status}</span>` : ''}
            ${deadline ? `<span class="task-deadline ${isOverdue ? 'overdue' : ''} ${isToday ? 'today' : ''}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              ${isOverdue ? 'Просрочено: ' : ''}${deadlineText}
            </span>` : ''}
          </div>
          ${task.next_step ? `<div class="task-next-step">→ ${this.escHtml(task.next_step)}</div>` : ''}
        </div>
      </div>
    `;
  },

  renderKanban(tasks) {
    const container = document.getElementById('tasks-content');
    container.className = 'kanban-view';

    const cols = this.KANBAN_STATUSES.map(status => {
      const items = tasks.filter(t => t.status === status);
      return `
        <div class="kanban-column">
          <div class="kanban-column-header">
            <div class="kanban-column-title">
              <span style="width:8px;height:8px;border-radius:50%;background:${this.STATUS_COLORS[status]};display:inline-block;flex-shrink:0"></span>
              ${status}
            </div>
            <span class="kanban-count">${items.length}</span>
          </div>
          <div class="kanban-cards">
            ${items.length === 0 ? '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:16px">Пусто</div>' : ''}
            ${items.map(t => this.renderKanbanCard(t)).join('')}
          </div>
        </div>
      `;
    });

    container.innerHTML = cols.join('');
    container.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('click', () => this.openTaskModal(card.dataset.id));
    });
  },

  renderKanbanCard(task) {
    const deadline = task.deadline ? new Date(task.deadline) : null;
    const now = new Date();
    const isOverdue = deadline && deadline < now;
    const priorityColors = { 'Высокий': 'var(--danger)', 'Средний': 'var(--warning)', 'Низкий': 'var(--success)' };

    return `
      <div class="kanban-card" data-id="${task.id}">
        <div class="kanban-card-title">${this.escHtml(task.title)}</div>
        ${task.next_step ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">→ ${this.escHtml(task.next_step)}</div>` : ''}
        <div class="kanban-card-meta">
          <span style="font-size:11px;color:${priorityColors[task.priority]||'var(--text-muted)'}">● ${task.priority || ''}</span>
          ${deadline ? `<span style="font-size:11px;color:${isOverdue ? 'var(--danger)' : 'var(--text-muted)'}">
            ${deadline.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          </span>` : ''}
        </div>
      </div>
    `;
  },

  async toggleTaskDone(id, wasDone) {
    const newStatus = wasDone ? 'Ждёт меня' : 'Готово';
    await DB.updateTask(id, { status: newStatus });
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx >= 0) this.tasks[idx].status = newStatus;
    this.renderContent();
    App.refreshTasksBadge();
  },

  openTaskModal(taskId = null, prefillData = null) {
    const task = taskId ? this.tasks.find(t => t.id === taskId) : null;
    const modal = document.getElementById('task-modal');
    const titleEl = document.getElementById('task-modal-title');
    const bodyEl = document.getElementById('task-modal-body');
    const deleteBtn = document.getElementById('task-modal-delete');

    titleEl.textContent = task ? 'Редактировать задачу' : 'Новая задача';
    deleteBtn.style.display = task ? '' : 'none';

    bodyEl.innerHTML = `
      <div class="form-group">
        <label class="form-label">Название *</label>
        <input id="tf-title" type="text" class="form-input" placeholder="Что нужно сделать?" value="${task ? this.escHtml(task.title) : (prefillData && prefillData.title ? this.escHtml(prefillData.title) : '')}" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Направление</label>
          <select id="tf-direction" class="form-input">
            <option value="">— выбрать —</option>
            ${this.DIRECTIONS.map(d => `<option value="${d}" ${task?.direction === d ? 'selected' : ''}>${d}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Приоритет</label>
          <select id="tf-priority" class="form-input">
            ${this.PRIORITIES.map(p => `<option value="${p}" ${(task?.priority || 'Средний') === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Статус</label>
          <select id="tf-status" class="form-input">
            ${this.STATUSES.map(s => `<option value="${s}" ${(task?.status || 'Ждёт меня') === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Дедлайн</label>
          <input id="tf-deadline" type="date" class="form-input" value="${task?.deadline || ''}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Следующий шаг</label>
        <input id="tf-next-step" type="text" class="form-input" placeholder="Конкретное действие" value="${task ? this.escHtml(task.next_step || '') : ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Проект</label>
        <select id="tf-project" class="form-input">
          <option value="">— без проекта —</option>
          ${this.projects.map(p => `<option value="${p.id}" ${task?.project_id === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
        </select>
      </div>
    `;

    const saveBtn = document.getElementById('task-modal-save');
    const cancelBtn = document.getElementById('task-modal-cancel');
    const closeBtn = document.getElementById('task-modal-close');

    const close = () => modal.classList.add('hidden');

    saveBtn.onclick = () => this.saveTask(task?.id);
    cancelBtn.onclick = close;
    closeBtn.onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };
    deleteBtn.onclick = () => this.deleteTask(task?.id);

    document.getElementById('tf-title').focus();
    modal.classList.remove('hidden');
  },

  async saveTask(id = null) {
    const title = document.getElementById('tf-title').value.trim();
    if (!title) { UI.toast('Введи название задачи', 'warning'); return; }

    const data = {
      title,
      direction: document.getElementById('tf-direction').value,
      priority: document.getElementById('tf-priority').value,
      status: document.getElementById('tf-status').value,
      deadline: document.getElementById('tf-deadline').value || null,
      next_step: document.getElementById('tf-next-step').value,
      project_id: document.getElementById('tf-project').value || null
    };

    try {
      if (id) {
        const updated = await DB.updateTask(id, data);
        const idx = this.tasks.findIndex(t => t.id === id);
        if (idx >= 0) this.tasks[idx] = { ...this.tasks[idx], ...updated };
        UI.toast('Задача обновлена', 'success');
      } else {
        const created = await DB.createTask(data);
        this.tasks.unshift(created);
        UI.toast('Задача создана', 'success');
      }
      document.getElementById('task-modal').classList.add('hidden');
      this.renderContent();
      App.refreshTasksBadge();
    } catch (e) {
      UI.toast('Ошибка сохранения: ' + e.message, 'error');
    }
  },

  async deleteTask(id) {
    if (!confirm('Удалить задачу?')) return;
    await DB.deleteTask(id);
    this.tasks = this.tasks.filter(t => t.id !== id);
    document.getElementById('task-modal').classList.add('hidden');
    this.renderContent();
    App.refreshTasksBadge();
    UI.toast('Задача удалена', 'info');
  },

  escHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
