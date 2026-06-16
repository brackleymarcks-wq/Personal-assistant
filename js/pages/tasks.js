// ============================================
// TASKS PAGE
// ============================================

const TasksPage = {
  tasks: [],
  projects: [],
  view: 'list', // list | kanban
  filters: { status: '', direction: '', priority: '', search: '' },

  DIRECTIONS: ['Митап AI-Connect', 'ТГ AI-Connect', 'Учись и применяй', 'ИИ Дайджест', 'Задача от руководителя', 'Банк промтов', 'Smart-запрос/ответ', 'Операционная задача', 'Английский', 'Личное'],
  STATUSES: ['Идея', 'Ждёт меня', 'В работе', 'Ждёт других', 'Делегирована', 'Готово', 'Отменена'],
  PRIORITIES: ['Высокий', 'Средний', 'Низкий'],

  KANBAN_STATUSES: ['Идея', 'Ждёт меня', 'В работе', 'Ждёт других', 'Делегирована', 'Готово'],

  STATUS_COLORS: {
    'Идея': '#64748b',
    'Ждёт меня': '#6366f1',
    'В работе': '#eab308',
    'Ждёт других': '#f97316',
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
            <button class="view-toggle-btn ${this.view === 'list' ? 'active' : ''}" data-view="list">
              <i data-lucide="list" style="width:14px;height:14px;margin-right:4px;vertical-align:middle;"></i>
              Список
            </button>
            <button class="view-toggle-btn ${this.view === 'kanban' ? 'active' : ''}" data-view="kanban">
              <i data-lucide="layout-grid" style="width:14px;height:14px;margin-right:4px;vertical-align:middle;"></i>
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

    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.view = btn.dataset.view;
        document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
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
      if (this.filters.direction) {
        if (!t.direction || !t.direction.includes(this.filters.direction)) return false;
      }
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

    // Сортировка по дате дедлайна (сначала ближайшие)
    filtered.sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });

    const active = filtered.filter(t => !['Готово', 'Отменена'].includes(t.status));
    document.getElementById('tasks-count-label').textContent =
      `${filtered.length} задач · ${active.length} активных`;

    if (this.view === 'kanban') {
      this.renderKanban(filtered);
    } else {
      this.renderList(filtered);
    }
    
    if (window.lucide) window.lucide.createIcons();
  },

  renderList(tasks) {
    const container = document.getElementById('tasks-content');
    container.className = 'tasks-list-view';

    if (tasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding:var(--space-2xl) 0;">
          <div class="empty-icon" style="opacity:0.6;"><i data-lucide="check-square" style="width:48px;height:48px;"></i></div>
          <div class="empty-text">Задач не найдено</div>
          <div class="empty-subtext">Создай первую задачу или измени фильтры</div>
        </div>`;
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

    const PRIORITY_ICONS = { 
      'Высокий': '<i data-lucide="arrow-up-circle" style="color:var(--danger);width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i>', 
      'Средний': '<i data-lucide="minus-circle" style="color:var(--warning);width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i>', 
      'Низкий': '<i data-lucide="arrow-down-circle" style="color:var(--success);width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i>', 
      'Завершённые': '<i data-lucide="check-circle-2" style="color:var(--text-muted);width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i>' 
    };

    let html = '';
    for (const [group, items] of Object.entries(groups)) {
      if (items.length === 0) continue;
      html += `
        <div class="tasks-group">
          <div class="tasks-group-header" style="display:flex;align-items:center;">${PRIORITY_ICONS[group]} ${group} <span style="color:var(--text-muted);margin-left:8px;">(${items.length})</span></div>
          ${items.map(t => this.renderTaskCard(t, now)).join('')}
        </div>
      `;
    }

    container.innerHTML = html;
    container.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Prevent opening task if clicked on project badge or pomodoro btn
        if(e.target.closest('.task-project-badge') || e.target.closest('.start-pomodoro-btn')) return;
        this.openTaskModal(card.dataset.id);
      });
    });
    container.querySelectorAll('.task-checkbox').forEach(cb => {
      cb.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleTaskDone(cb.dataset.id, cb.dataset.done === 'true');
      });
    });
    container.querySelectorAll('.start-pomodoro-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const title = btn.dataset.title;
        // Go to pomodoro with selected task
        if (typeof PomodoroPage !== 'undefined') PomodoroPage.selectedTaskId = id;
        App.navigateTo('pomodoro');
      });
    });
    container.querySelectorAll('.task-project-badge').forEach(badge => {
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        const pid = badge.dataset.pid;
        if(pid) {
          App.navigateTo('projects').then(() => {
            if (typeof ProjectsPage !== 'undefined') ProjectsPage.openProjectModal(pid);
          });
        }
      });
    });
  },

  renderTaskCard(task, now = new Date()) {
    const deadline = task.deadline ? new Date(task.deadline) : null;
    const isDone = task.status === 'Готово';

    const prioIcons = {
      'Высокий': '<i data-lucide="arrow-up-circle" style="color:var(--danger);width:12px;height:12px;vertical-align:middle;margin-right:2px;"></i>',
      'Средний': '<i data-lucide="minus-circle" style="color:var(--warning);width:12px;height:12px;vertical-align:middle;margin-right:2px;"></i>',
      'Низкий': '<i data-lucide="arrow-down-circle" style="color:var(--success);width:12px;height:12px;vertical-align:middle;margin-right:2px;"></i>'
    };
      
    let projectBadge = '';
    if (task.project_id) {
      const project = this.projects.find(p => p.id === task.project_id);
      if (project) {
        projectBadge = `<span class="task-project-badge" data-pid="${project.id}"><i data-lucide="folder" style="width:10px;height:10px;margin-right:2px;"></i> ${this.escHtml(project.name)}</span>`;
      }
    }

    let directionBadge = '';
    if (task.direction) {
      const dirs = task.direction.split(',').map(d => d.trim()).filter(Boolean);
      directionBadge = dirs.map(d => `<span class="task-project-badge" data-dir="${this.escHtml(d)}"><i data-lucide="tag" style="width:10px;height:10px;margin-right:2px;vertical-align:middle;"></i>${this.escHtml(d)}</span>`).join('');
    }

    return `
      <div class="task-card card" data-id="${task.id}" style="${isDone ? 'opacity:0.7;' : ''} ${task.status === 'В работе' ? 'border: 1px solid var(--warning);' : ''}">
        <div class="task-checkbox ${isDone ? 'checked' : ''}" data-id="${task.id}" data-done="${isDone}">
          <i data-lucide="check" style="width: 14px; height: 14px; opacity: ${isDone ? 1 : 0}"></i>
        </div>
        <div class="task-content">
          <div class="task-title" style="${isDone ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${this.escHtml(task.title)}</div>
          ${task.next_step ? `<div class="task-next-step" style="${isDone ? 'color: var(--text-muted);' : ''}"><i data-lucide="corner-down-right" style="width: 12px; height: 12px;"></i> ${this.escHtml(task.next_step)}</div>` : ''}
          <div class="task-meta">
            ${projectBadge}
            ${directionBadge}
            <span>${prioIcons[task.priority] || ''} ${task.priority || ''}</span>
          </div>
        </div>
        <div class="task-actions-overlay">
          <button class="task-action-btn start-pomodoro-btn" data-id="${task.id}" data-title="${this.escHtml(task.title)}" title="Начать Помодоро для этой задачи">
            <i data-lucide="timer" style="width:16px;height:16px;"></i>
          </button>
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
        <div class="kanban-column" data-status="${status}">
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
    
    // Setup click handlers
    container.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if(e.target.closest('.task-project-badge') || e.target.closest('.start-pomodoro-btn')) return;
        this.openTaskModal(card.dataset.id);
      });
      
      // Drag start
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', card.dataset.id);
        card.classList.add('dragging');
      });
      
      // Drag end
      card.addEventListener('dragend', (e) => {
        card.classList.remove('dragging');
        container.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('drag-over'));
      });
    });

    container.querySelectorAll('.start-pomodoro-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (typeof PomodoroPage !== 'undefined') PomodoroPage.selectedTaskId = id;
        App.navigateTo('pomodoro');
      });
    });

    // Setup drop zones on columns
    container.querySelectorAll('.kanban-column').forEach(col => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault(); // Allow drop
      });
      
      col.addEventListener('dragenter', (e) => {
        e.preventDefault();
        col.classList.add('drag-over');
      });
      
      col.addEventListener('dragleave', (e) => {
        if (!col.contains(e.relatedTarget)) {
          col.classList.remove('drag-over');
        }
      });
      
      col.addEventListener('drop', async (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');
        
        const taskId = e.dataTransfer.getData('text/plain');
        const newStatus = col.dataset.status;
        
        if (taskId && newStatus) {
          const task = this.tasks.find(t => t.id === taskId);
          if (task && task.status !== newStatus) {
            // Optimistic update
            task.status = newStatus;
            this.renderContent();
            App.refreshTasksBadge();
            
            try {
              await DB.updateTask(taskId, { status: newStatus });
            } catch (err) {
              console.error('Error updating task status:', err);
              UI.toast('Ошибка при переносе задачи', 'error');
              await this.load(); // Revert on error
            }
          }
        }
      });
    });
  },

  renderKanbanCard(task) {
    const deadline = task.deadline ? new Date(task.deadline) : null;
    const now = new Date();
    const isOverdue = deadline && deadline < now;
    
    const prioIcons = {
      'Высокий': '<i data-lucide="arrow-up-circle" style="color:var(--danger);width:12px;height:12px;vertical-align:middle;margin-right:2px;"></i>',
      'Средний': '<i data-lucide="minus-circle" style="color:var(--warning);width:12px;height:12px;vertical-align:middle;margin-right:2px;"></i>',
      'Низкий': '<i data-lucide="arrow-down-circle" style="color:var(--success);width:12px;height:12px;vertical-align:middle;margin-right:2px;"></i>'
    };

    let projectBadge = '';
    if (task.project_id) {
      const project = this.projects.find(p => p.id === task.project_id);
      if (project) {
        projectBadge = `<span style="display:inline-block;background:var(--glass-highlight);border:1px solid var(--glass-border);padding:2px 6px;border-radius:var(--radius-full);font-size:10px;margin-bottom:6px;color:var(--text-secondary);"><i data-lucide="folder" style="width:10px;height:10px;vertical-align:middle;"></i> ${this.escHtml(project.name)}</span>`;
      }
    }

    let directionBadge = '';
    if (task.direction) {
      const dirs = task.direction.split(',').map(d => d.trim()).filter(Boolean);
      directionBadge = dirs.map(d => `<span style="display:inline-block;background:var(--bg-hover);border:1px solid var(--border-color);padding:2px 6px;border-radius:var(--radius-full);font-size:10px;margin-bottom:6px;margin-right:4px;color:var(--text-secondary);"><i data-lucide="tag" style="width:10px;height:10px;vertical-align:middle;"></i> ${this.escHtml(d)}</span>`).join('');
    }

    return `
      <div class="kanban-card task-card" data-id="${task.id}" style="position:relative; ${task.status === 'В работе' ? 'border: 1px solid var(--warning);' : ''}" draggable="true">
        ${projectBadge}
        ${directionBadge}
        <div class="kanban-card-title">${this.escHtml(task.title)}</div>
        ${task.next_step ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden"><i data-lucide="corner-down-right" style="width:12px;height:12px;vertical-align:middle;"></i> ${this.escHtml(task.next_step)}</div>` : ''}
        <div class="kanban-card-meta" style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:11px;">${prioIcons[task.priority] || ''} ${task.priority || ''}</span>
          ${deadline ? `<span style="font-size:11px;color:${isOverdue ? 'var(--danger)' : 'var(--text-muted)'};display:flex;align-items:center;gap:2px;">
            <i data-lucide="calendar" style="width:10px;height:10px;"></i>
            ${deadline.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          </span>` : ''}
        </div>
        <div class="task-actions-overlay" style="right:var(--space-sm);">
          <button class="task-action-btn start-pomodoro-btn" data-id="${task.id}" data-title="${this.escHtml(task.title)}" title="Начать Помодоро для этой задачи">
            <i data-lucide="timer" style="width:14px;height:14px;"></i>
          </button>
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
      <div class="form-group">
        <label class="form-label">Направление</label>
        <div id="tf-directions-container" class="directions-container">
          ${(() => {
            const taskDirs = task?.direction ? task.direction.split(',').map(d => d.trim()) : [];
            return this.DIRECTIONS.map(d => `<div class="direction-pill ${taskDirs.includes(d) ? 'active' : ''}" data-val="${d}">${d}</div>`).join('');
          })()}
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Приоритет</label>
          <select id="tf-priority" class="form-input">
            ${this.PRIORITIES.map(p => `<option value="${p}" ${(task?.priority || 'Средний') === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Статус</label>
          <select id="tf-status" class="form-input">
            ${this.STATUSES.map(s => `<option value="${s}" ${(task?.status || 'Ждёт меня') === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Дедлайн</label>
        <input id="tf-deadline" type="date" class="form-input" value="${task?.deadline || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Следующий шаг</label>
        <input id="tf-next-step" type="text" class="form-input" placeholder="Конкретное действие" value="${task ? this.escHtml(task.next_step || '') : ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Комментарии / Заметки к задаче</label>
        <textarea id="tf-description" class="form-input" rows="3" placeholder="Что нужно сделать, ссылки, идеи...">${task ? this.escHtml(task.description || '') : ''}</textarea>
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

    // Direction pills toggle logic
    document.querySelectorAll('#tf-directions-container .direction-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        pill.classList.toggle('active');
      });
    });

    document.getElementById('tf-title').focus();
    modal.classList.remove('hidden');
  },

  async saveTask(id = null) {
    const title = document.getElementById('tf-title').value.trim();
    if (!title) { UI.toast('Введи название задачи', 'warning'); return; }

    const data = {
      title: document.getElementById('tf-title').value.trim(),
      direction: Array.from(document.querySelectorAll('#tf-directions-container .direction-pill.active')).map(p => p.dataset.val).join(', ') || null,
      priority: document.getElementById('tf-priority').value,
      status: document.getElementById('tf-status').value,
      deadline: document.getElementById('tf-deadline').value || null,
      next_step: document.getElementById('tf-next-step').value,
      description: document.getElementById('tf-description').value,
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
