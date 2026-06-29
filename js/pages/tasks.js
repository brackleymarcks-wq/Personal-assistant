// ============================================
// TASKS PAGE
// ============================================

const TasksPage = {
  tasks: [],
  projects: [],
  knowledge: [],
  view: 'list', // list | kanban
  filters: { status: [], direction: [], priority: [], search: '' },

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

  renderMultiSelect(id, options, selected, placeholder) {
    const text = selected.length === 0 ? placeholder : selected.join(', ');
    return `
      <div class="custom-multi-select" id="${id}-wrapper" data-id="${id}">
        <div class="custom-select-trigger" id="${id}-trigger">
          <span id="${id}-text">${text}</span>
          <i data-lucide="chevron-down" style="width:16px;height:16px;color:var(--text-muted);flex-shrink:0;"></i>
        </div>
        <div class="custom-select-dropdown" id="${id}-dropdown">
          ${options.map(opt => `
            <label class="custom-select-option">
              <input type="checkbox" value="${opt}" class="${id}-checkbox" ${selected.includes(opt) ? 'checked' : ''} />
              ${opt}
            </label>
          `).join('')}
        </div>
      </div>
    `;
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
            <input id="tasks-search" type="text" class="form-input search-input" placeholder="Поиск задач…" value="${this.filters.search}" />
          </div>
          ${this.renderMultiSelect('filter-direction', this.DIRECTIONS, this.filters.direction, 'Все направления')}
          ${this.renderMultiSelect('filter-status', this.STATUSES, this.filters.status, 'Все статусы')}
          ${this.renderMultiSelect('filter-priority', this.PRIORITIES, this.filters.priority, 'Все приоритеты')}
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

    const setupMultiSelect = (id, fieldName, placeholder) => {
      const wrapper = document.getElementById(`${id}-wrapper`);
      if (!wrapper) return;
      const trigger = document.getElementById(`${id}-trigger`);
      const dropdown = document.getElementById(`${id}-dropdown`);
      const textEl = document.getElementById(`${id}-text`);
      
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('show');
        document.querySelectorAll('.custom-select-dropdown').forEach(d => d.classList.remove('show'));
        document.querySelectorAll('.custom-select-trigger').forEach(t => t.classList.remove('active'));
        if (!isOpen) {
          dropdown.classList.add('show');
          trigger.classList.add('active');
        }
      });
      
      dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target.tagName.toLowerCase() === 'input') {
          // Checkbox changed
          const checkboxes = dropdown.querySelectorAll(`.${id}-checkbox`);
          const selected = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
          this.filters[fieldName] = selected;
          textEl.textContent = selected.length === 0 ? placeholder : selected.join(', ');
          this.renderContent();
        }
      });
    };

    setupMultiSelect('filter-direction', 'direction', 'Все направления');
    setupMultiSelect('filter-status', 'status', 'Все статусы');
    setupMultiSelect('filter-priority', 'priority', 'Все приоритеты');

    document.addEventListener('click', () => {
      document.querySelectorAll('.custom-select-dropdown').forEach(d => d.classList.remove('show'));
      document.querySelectorAll('.custom-select-trigger').forEach(t => t.classList.remove('active'));
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
    this.tasks = await DB.getTasks();
    if (DB.getProjects) {
      this.projects = await DB.getProjects();
    }
    this.knowledge = await DB.getKnowledge();
    this.renderContent();
    App.refreshTasksBadge();
  },

  getFilteredTasks() {
    return this.tasks.filter(t => {
      if (this.filters.status.length > 0 && !this.filters.status.includes(t.status)) return false;
      if (this.filters.direction.length > 0) {
        if (!t.direction) return false;
        const taskDirs = t.direction.split(',').map(d => d.trim());
        const hasOverlap = this.filters.direction.some(d => taskDirs.includes(d));
        if (!hasOverlap) return false;
      }
      if (this.filters.priority.length > 0 && !this.filters.priority.includes(t.priority)) return false;
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
    now.setHours(0,0,0,0);
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dow = now.getDay();
    const diffToSunday = dow === 0 ? 0 : 7 - dow;
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + diffToSunday);
    endOfWeek.setHours(23,59,59,999);

    const groups = {
      'Просроченные': [],
      'Сегодня': [],
      'Завтра': [],
      'На этой неделе': [],
      'Позже': [],
      'Без даты': [],
      'Завершённые': []
    };

    tasks.forEach(t => {
      if (['Готово', 'Отменена'].includes(t.status)) {
        groups['Завершённые'].push(t);
        return;
      }
      if (!t.deadline) {
        groups['Без даты'].push(t);
        return;
      }
      const d = new Date(t.deadline);
      d.setHours(0,0,0,0);
      if (d < now) {
        groups['Просроченные'].push(t);
      } else if (d.getTime() === now.getTime()) {
        groups['Сегодня'].push(t);
      } else if (d.getTime() === tomorrow.getTime()) {
        groups['Завтра'].push(t);
      } else if (d <= endOfWeek) {
        groups['На этой неделе'].push(t);
      } else {
        groups['Позже'].push(t);
      }
    });

    const GROUP_ICONS = { 
      'Просроченные': '<i data-lucide="alert-circle" style="color:var(--danger);width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i>', 
      'Сегодня': '<i data-lucide="sun" style="color:var(--accent-vibrant);width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i>', 
      'Завтра': '<i data-lucide="sunrise" style="color:var(--warning);width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i>', 
      'На этой неделе': '<i data-lucide="calendar" style="color:var(--text-secondary);width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i>',
      'Позже': '<i data-lucide="calendar-days" style="color:var(--text-muted);width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i>',
      'Без даты': '<i data-lucide="inbox" style="color:var(--text-muted);width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i>',
      'Завершённые': '<i data-lucide="check-circle-2" style="color:var(--text-muted);width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i>' 
    };

    let html = '';
    for (const [group, items] of Object.entries(groups)) {
      if (items.length === 0) continue;
      html += `
        <div class="tasks-group">
          <div class="tasks-group-header" style="display:flex;align-items:center;">${GROUP_ICONS[group]} <span style="font-weight:600">${group}</span> <span style="color:var(--text-muted);margin-left:8px;">(${items.length})</span></div>
          ${items.map(t => this.renderTaskCard(t, new Date())).join('')}
        </div>
      `;
    }

    container.innerHTML = html;
    container.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Prevent opening task if clicked on project badge, pomodoro btn, or link
        if(e.target.closest('.task-project-badge') || e.target.closest('.start-pomodoro-btn') || e.target.closest('.obsidian-link')) return;
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
      
    let areaBadge = '';
    if (task.area) {
      const areaIcons = {
        'Работа': 'briefcase',
        'Репетиторство': 'book-open',
        'Личное': 'home'
      };
      const icon = areaIcons[task.area] || 'globe';
      areaBadge = `<span class="task-project-badge" style="background:var(--accent-dim);border-color:var(--border-accent);color:var(--accent);"><i data-lucide="${icon}" style="width:10px;height:10px;margin-right:2px;vertical-align:middle;"></i>${this.escHtml(task.area)}</span>`;
    }

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

    const statusColor = this.STATUS_COLORS[task.status] || '#64748b';
    const borderStyle = `border: 1px solid ${statusColor}80; box-shadow: 0 2px 8px ${statusColor}26;`;

    return `
      <div class="task-card card" data-id="${task.id}" style="${isDone ? 'opacity:0.7;' : ''} ${borderStyle}">
        <div class="task-checkbox ${isDone ? 'checked' : ''}" data-id="${task.id}" data-done="${isDone}">
          <i data-lucide="check" style="width: 14px; height: 14px; opacity: ${isDone ? 1 : 0}"></i>
        </div>
        <div class="task-content">
          <div class="task-title" style="${isDone ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${window.PeekView ? window.PeekView.parseLinks(task.title || 'Без названия') : this.escHtml(task.title || 'Без названия')}</div>
          ${task.next_step ? `<div class="task-next-step" style="${isDone ? 'color: var(--text-muted);' : ''}"><i data-lucide="corner-down-right" style="width: 12px; height: 12px;"></i> ${window.PeekView ? window.PeekView.parseLinks(task.next_step) : this.escHtml(task.next_step)}</div>` : ''}
          <div class="task-meta">
            ${deadline ? `<span style="display:inline-flex;align-items:center;gap:4px;color:${deadline < new Date() && !isDone ? 'var(--danger)' : 'var(--text-muted)'};font-weight:500;margin-right:4px;"><i data-lucide="calendar" style="width:12px;height:12px;"></i> ${deadline.toLocaleDateString('ru-RU', {day:'numeric', month:'short'})}</span>` : ''}
            ${areaBadge}
            ${projectBadge}
            ${directionBadge}
            <span style="color:var(--text-secondary);">${prioIcons[task.priority] || ''} ${task.priority || ''}</span>
            <span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:11px;background:${statusColor}1a;color:${statusColor};border:1px solid ${statusColor}40;margin-left:4px;">
               <div style="width:6px;height:6px;border-radius:50%;background:${statusColor}"></div>
               ${this.escHtml(task.status)}
            </span>
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
        if(e.target.closest('.task-project-badge') || e.target.closest('.start-pomodoro-btn') || e.target.closest('.obsidian-link')) return;
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

    let areaBadge = '';
    if (task.area) {
      const areaIcons = {
        'Работа': 'briefcase',
        'Репетиторство': 'book-open',
        'Личное': 'home'
      };
      const icon = areaIcons[task.area] || 'globe';
      areaBadge = `<span style="display:inline-flex;align-items:center;background:var(--accent-dim);border:1px solid var(--border-accent);padding:2px 6px;border-radius:var(--radius-full);font-size:10px;color:var(--accent);"><i data-lucide="${icon}" style="width:10px;height:10px;margin-right:2px;"></i> ${this.escHtml(task.area)}</span>`;
    }

    let projectBadge = '';
    if (task.project_id) {
      const project = this.projects.find(p => p.id === task.project_id);
      if (project) {
        projectBadge = `<span style="display:inline-flex;align-items:center;background:var(--glass-highlight);border:1px solid var(--glass-border);padding:2px 6px;border-radius:var(--radius-full);font-size:10px;color:var(--text-secondary);"><i data-lucide="folder" style="width:10px;height:10px;margin-right:2px;"></i> ${this.escHtml(project.name)}</span>`;
      }
    }

    let directionBadge = '';
    if (task.direction) {
      const dirs = task.direction.split(',').map(d => d.trim()).filter(Boolean);
      directionBadge = dirs.map(d => `<span style="display:inline-flex;align-items:center;background:var(--bg-hover);border:1px solid var(--border-color);padding:2px 6px;border-radius:var(--radius-full);font-size:10px;color:var(--text-secondary);"><i data-lucide="tag" style="width:10px;height:10px;margin-right:2px;"></i> ${this.escHtml(d)}</span>`).join('');
    }

    const statusColor = this.STATUS_COLORS[task.status] || '#64748b';
    const borderStyle = `border: 1px solid ${statusColor}80; box-shadow: 0 2px 8px ${statusColor}26;`;

    return `
      <div class="kanban-card task-card" data-id="${task.id}" style="position:relative; display:flex; flex-direction:column; ${borderStyle}" draggable="true">
        <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px;">
          ${areaBadge}
          ${projectBadge}
          ${directionBadge}
        </div>
        <div class="kanban-card-title" style="font-weight:600; font-size:13.5px; margin-bottom:8px; line-height:1.4; color: var(--text-primary);">${this.escHtml(task.title || 'Без названия')}</div>
        ${task.next_step ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden"><i data-lucide="corner-down-right" style="width:12px;height:12px;vertical-align:middle;"></i> ${this.escHtml(task.next_step)}</div>` : ''}
        <div class="kanban-card-meta" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:11px; color: var(--text-secondary);">${prioIcons[task.priority] || ''} ${task.priority || ''}</span>
            <span style="display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:12px;font-size:10px;background:${statusColor}1a;color:${statusColor};border:1px solid ${statusColor}40;">
               <span style="width:4px;height:4px;border-radius:50%;background:${statusColor};display:inline-block;"></span>
               ${this.escHtml(task.status)}
            </span>
          </div>
          ${deadline ? `<span style="font-size:11px;color:${isOverdue ? 'var(--danger)' : 'var(--text-muted)'};display:flex;align-items:center;gap:2px;">
            <i data-lucide="calendar" style="width:10px;height:10px;"></i>
            ${deadline.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          </span>` : ''}
          ${(task.linked_notes && task.linked_notes.length > 0) ? `<span style="font-size:11px;color:var(--accent);display:flex;align-items:center;gap:2px;" title="Прикрепленные документы"><i data-lucide="paperclip" style="width:10px;height:10px;"></i> ${task.linked_notes.length}</span>` : ''}
        </div>
        <div class="task-actions-overlay" style="right:var(--space-sm);">
          <button class="task-action-btn start-pomodoro-btn" data-id="${task.id}" data-title="${this.escHtml(task.title || 'Без названия')}" title="Начать Помодоро для этой задачи">
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

  async openTaskModal(taskId = null, prefillData = null) {
    try {
      if (!this.projects || this.projects.length === 0) {
        this.projects = await DB.getProjects() || [];
      }
      if (!this.knowledge || this.knowledge.length === 0) {
        this.knowledge = await DB.getKnowledge() || [];
      }
      let task = null;
      if (taskId) {
        task = (this.tasks || []).find(t => t.id === taskId);
        if (!task && typeof CalendarPage !== 'undefined' && CalendarPage.tasks) {
          task = CalendarPage.tasks.find(t => t.id === taskId);
        }
        if (!task && DB.client) {
          const { data, error } = await DB.client.from('tasks').select('*').eq('id', taskId).single();
          if (!error && data) {
            task = data;
          }
        }
      }
    const modal = document.getElementById('task-modal');
    const titleEl = document.getElementById('task-modal-title');
    const bodyEl = document.getElementById('task-modal-body');
    const deleteBtn = document.getElementById('task-modal-delete');

    titleEl.textContent = task ? 'Редактировать задачу' : 'Новая задача';
    deleteBtn.style.display = task ? '' : 'none';

    const defaultArea = task?.area || (Config.currentArea !== 'Все' ? Config.currentArea : 'Работа');

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
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Сфера (Workspace)</label>
          <select id="tf-area" class="form-input">
            <option value="Работа" ${defaultArea === 'Работа' ? 'selected' : ''}>🏢 Работа</option>
            <option value="Репетиторство" ${defaultArea === 'Репетиторство' ? 'selected' : ''}>👨‍🏫 Репетиторство</option>
            <option value="Личное" ${defaultArea === 'Личное' ? 'selected' : ''}>🏠 Личное</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Дедлайн</label>
          <input id="tf-deadline" type="date" class="form-input" value="${task?.deadline || (prefillData?.deadline || '')}" />
        </div>
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
      <div class="form-group">
        <label class="form-label">Прикрепленные документы (База Знаний)</label>
        <div id="task-linked-notes-container" data-selected='${JSON.stringify(task?.linked_notes || [])}'></div>
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

    // Init EntitySelect
    if (window.EntitySelect) {
      EntitySelect.init(
        'task-linked-notes-container',
        this.knowledge.map(k => ({ id: k.id, title: k.title, icon: 'file-text' })),
        task?.linked_notes || [],
        (selected) => {
          document.getElementById('task-linked-notes-container').dataset.selected = JSON.stringify(selected);
        }
      );
    }

    // Direction pills toggle logic
    document.querySelectorAll('#tf-directions-container .direction-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        pill.classList.toggle('active');
      });
    });

      document.getElementById('tf-title').focus();
      modal.classList.remove('hidden');
    } catch (e) {
      console.error(e);
      if (window.UI) UI.toast('Ошибка открытия задачи: ' + e.message, 'error');
      else alert('Ошибка: ' + e.message);
    }
  },

  async saveTask(id = null) {
    const title = document.getElementById('tf-title').value.trim();
    if (!title) { UI.toast('Введи название задачи', 'warning'); return; }

    const data = {
      title: document.getElementById('tf-title').value.trim(),
      direction: Array.from(document.querySelectorAll('#tf-directions-container .direction-pill.active')).map(p => p.dataset.val).join(', ') || null,
      priority: document.getElementById('tf-priority').value,
      status: document.getElementById('tf-status').value,
      area: document.getElementById('tf-area').value,
      deadline: document.getElementById('tf-deadline').value || null,
      next_step: document.getElementById('tf-next-step').value,
      description: document.getElementById('tf-description').value,
      project_id: document.getElementById('tf-project').value || null,
      linked_notes: JSON.parse(document.getElementById('task-linked-notes-container').dataset.selected || '[]')
    };

    try {
      if (id) {
        const updated = await DB.updateTask(id, data);
        const idx = this.tasks.findIndex(t => t.id === id);
        if (idx >= 0) this.tasks[idx] = { ...this.tasks[idx], ...updated };
        UI.toast('Задача обновлена', 'success');
        
        // If the area was changed to something other than current (and not 'Все'), remove from current view
        if (Config.currentArea !== 'Все' && data.area !== Config.currentArea) {
          this.tasks = this.tasks.filter(t => t.id !== id);
        }
      } else {
        const created = await DB.createTask(data);
        this.tasks.unshift(created);
        UI.toast('Задача создана', 'success');
      }
      document.getElementById('task-modal').classList.add('hidden');
      if (App.currentPage === 'tasks') {
        this.renderContent();
      } else if (App.currentPage === 'calendar' && typeof CalendarPage !== 'undefined') {
        CalendarPage.load();
      }
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
    if (App.currentPage === 'tasks') {
      this.renderContent();
    } else if (App.currentPage === 'calendar' && typeof CalendarPage !== 'undefined') {
      CalendarPage.load();
    }
    App.refreshTasksBadge();
    UI.toast('Задача удалена', 'info');
  },

  escHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
