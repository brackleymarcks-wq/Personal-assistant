// ============================================
// GOALS PAGE — OKR / SMART Goals
// ============================================

const GoalsPage = {
  goals: [],
  projects: [],
  tasks: [],
  currentFilter: 'all',

  render() {
    return `
      <div class="goals-page" style="display:flex;flex-direction:column;height:100%;">
        <div class="page-header">
          <div>
            <div class="page-title">Цели (OKR / SMART)</div>
            <div class="page-subtitle" id="goals-count-label">Загрузка целей…</div>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" id="add-goal-btn" style="display:flex;align-items:center;gap:6px;">
              <i data-lucide="plus"></i>
              Новая цель
            </button>
          </div>
        </div>

        <div style="padding:var(--space-xl);display:flex;flex-direction:column;gap:var(--space-md);flex:1;overflow-y:auto;align-content:start;">
          <div id="goals-stats-container"></div>
          <div id="goals-tabs-container"></div>
          <div id="goals-list-container" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(340px, 1fr));gap:var(--space-lg);margin-top:var(--space-sm);"></div>
        </div>

        <!-- Goal Modal -->
        <div id="goal-modal" class="modal-overlay hidden">
          <div class="modal">
            <div class="modal-header">
              <h2 class="modal-title" id="goal-modal-title" style="display:flex;align-items:center;gap:8px;"><i data-lucide="target"></i> Новая цель</h2>
              <button class="modal-close" id="goal-modal-close">
                <i data-lucide="x"></i>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Формулировка цели *</label>
                <input id="gf-title" type="text" class="form-input" placeholder="Например: Запустить AI-Портал к 1 июля" />
              </div>
              <div class="form-group">
                <label class="form-label">Описание / Критерии успеха (Key Results)</label>
                <textarea id="gf-description" class="form-input" rows="4" placeholder="Как поймем, что цель достигнута? Какие ключевые результаты?&#10;Поддерживаются чек-листы, например:&#10;- [ ] Написать 5 статей&#10;- [ ] Опубликовать анонс"></textarea>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Срок достижения</label>
                  <input id="gf-date" type="date" class="form-input" />
                </div>
                <div class="form-group">
                  <label class="form-label">Прогресс (%)</label>
                  <input id="gf-progress" type="number" min="0" max="100" class="form-input" value="0" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Статус</label>
                  <select id="gf-status" class="form-input">
                    <option value="В работе">В работе</option>
                    <option value="Достигнута">Достигнута</option>
                    <option value="Отменена">Отменена</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Связанный проект</label>
                  <select id="gf-project" class="form-input">
                    <option value="">— без проекта —</option>
                  </select>
                  <div style="display:flex;align-items:center;gap:6px;margin-top:8px;">
                    <input type="checkbox" id="gf-auto-progress" style="width:15px;height:15px;cursor:pointer;accent-color:var(--accent);" />
                    <label for="gf-auto-progress" style="font-size:12px;color:var(--text-secondary);cursor:pointer;user-select:none;margin-bottom:0;font-weight:500;">
                      Авто-прогресс по задачам проекта
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-ghost danger" id="goal-modal-delete" style="display:none;">Удалить</button>
              <div style="flex:1"></div>
              <button class="btn btn-secondary" id="goal-modal-cancel">Отмена</button>
              <button class="btn btn-primary" id="goal-modal-save">Сохранить</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async init() {
    this.currentFilter = 'all';
    this.bindEvents();
    await this.load();
  },

  bindEvents() {
    document.getElementById('add-goal-btn').addEventListener('click', () => this.openModal());
    
    // Delegated tab clicks
    const tabsContainer = document.getElementById('goals-tabs-container');
    if (tabsContainer) {
      tabsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-filter-btn');
        if (btn) {
          this.currentFilter = btn.dataset.status;
          this.renderContent();
        }
      });
    }
  },

  async load() {
    try {
      [this.goals, this.projects, this.tasks] = await Promise.all([
        DB.getGoals(),
        DB.getProjects(),
        DB.getTasks()
      ]);
      this.renderContent();
    } catch (e) {
      console.error(e);
    }
  },

  getGoalProgress(goal) {
    const isAuto = (goal.description || '').includes('<!-- auto_progress: true -->');
    if (isAuto && goal.project_id) {
      const projectTasks = this.tasks.filter(t => t.project_id === goal.project_id && t.status !== 'Отменена');
      const completedTasks = projectTasks.filter(t => t.status === 'Готово');
      return projectTasks.length > 0 ? Math.round((completedTasks.length / projectTasks.length) * 100) : 0;
    }
    
    // Check if there is a checklist in description
    const checklistItems = [];
    const lines = (goal.description || '').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*-\s*\[([ xX])\]\s*(.+)$/);
      if (match) {
        checklistItems.push(match[1].toLowerCase() === 'x');
      }
    });
    if (checklistItems.length > 0) {
      const checked = checklistItems.filter(c => c).length;
      return Math.round((checked / checklistItems.length) * 100);
    }
    
    return goal.progress || 0;
  },

  getDeadlineBadge(targetDateStr) {
    if (!targetDateStr) return '';
    const targetDate = new Date(targetDateStr);
    targetDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `
        <div class="goal-status-badge" style="background:rgba(239, 68, 68, 0.12);color:var(--danger);border:1px solid rgba(239,68,68,0.2);">
          <i data-lucide="alert-circle" style="width:12px;height:12px;"></i> Просрочено на ${Math.abs(diffDays)} дн.
        </div>
      `;
    } else if (diffDays === 0) {
      return `
        <div class="goal-status-badge" style="background:rgba(245, 158, 11, 0.12);color:var(--warning);border:1px solid rgba(245,158,11,0.2);">
          <i data-lucide="clock" style="width:12px;height:12px;"></i> Сегодня!
        </div>
      `;
    } else if (diffDays <= 7) {
      return `
        <div class="goal-status-badge" style="background:rgba(245, 158, 11, 0.12);color:var(--warning);border:1px solid rgba(245,158,11,0.2);">
          <i data-lucide="clock" style="width:12px;height:12px;"></i> Осталось ${diffDays} дн.
        </div>
      `;
    } else {
      return `
        <div class="goal-status-badge" style="background:rgba(16, 185, 129, 0.12);color:var(--success);border:1px solid rgba(16,185,129,0.2);">
          <i data-lucide="calendar" style="width:12px;height:12px;"></i> ${diffDays} дн. в запасе
        </div>
      `;
    }
  },

  renderContent() {
    const container = document.getElementById('goals-list-container');
    const countLabel = document.getElementById('goals-count-label');
    
    const activeGoalsCount = this.goals.filter(g => g.status === 'В работе').length;
    countLabel.textContent = `${this.goals.length} целей · ${activeGoalsCount} в работе`;

    // Render Stats
    const total = this.goals.length;
    const done = this.goals.filter(g => g.status === 'Достигнута').length;
    const progressGoals = this.goals.filter(g => g.status !== 'Отменена');
    const avgProgress = progressGoals.length > 0
      ? Math.round(progressGoals.reduce((sum, g) => sum + this.getGoalProgress(g), 0) / progressGoals.length)
      : 0;

    const statsContainer = document.getElementById('goals-stats-container');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="goals-stats" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:var(--space-md);margin-bottom:var(--space-sm);">
          <div class="stat-card" style="background:var(--glass-bg);backdrop-filter:blur(10px);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:var(--space-md);display:flex;align-items:center;gap:var(--space-md);">
            <div style="background:rgba(var(--accent-rgb), 0.1);color:var(--accent);width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;">
              <i data-lucide="target" style="width:20px;height:20px;"></i>
            </div>
            <div>
              <div style="font-size:12px;color:var(--text-muted);font-weight:500;">Всего целей</div>
              <div style="font-size:20px;font-weight:800;color:var(--text-primary);margin-top:2px;">${total}</div>
            </div>
          </div>
          <div class="stat-card" style="background:var(--glass-bg);backdrop-filter:blur(10px);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:var(--space-md);display:flex;align-items:center;gap:var(--space-md);">
            <div style="background:rgba(var(--accent-rgb), 0.1);color:var(--accent);width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;">
              <i data-lucide="loader" style="width:20px;height:20px;"></i>
            </div>
            <div>
              <div style="font-size:12px;color:var(--text-muted);font-weight:500;">В работе</div>
              <div style="font-size:20px;font-weight:800;color:var(--accent);margin-top:2px;">${activeGoalsCount}</div>
            </div>
          </div>
          <div class="stat-card" style="background:var(--glass-bg);backdrop-filter:blur(10px);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:var(--space-md);display:flex;align-items:center;gap:var(--space-md);">
            <div style="background:rgba(16, 185, 129, 0.1);color:var(--success);width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;">
              <i data-lucide="check-circle" style="width:20px;height:20px;"></i>
            </div>
            <div>
              <div style="font-size:12px;color:var(--text-muted);font-weight:500;">Достигнуто</div>
              <div style="font-size:20px;font-weight:800;color:var(--success);margin-top:2px;">${done}</div>
            </div>
          </div>
          <div class="stat-card" style="background:var(--glass-bg);backdrop-filter:blur(10px);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:var(--space-md);display:flex;align-items:center;gap:var(--space-md);">
            <div style="background:rgba(245, 158, 11, 0.1);color:var(--warning);width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;">
              <i data-lucide="trending-up" style="width:20px;height:20px;"></i>
            </div>
            <div>
              <div style="font-size:12px;color:var(--text-muted);font-weight:500;">Ср. прогресс</div>
              <div style="font-size:20px;font-weight:800;color:var(--text-primary);margin-top:2px;">${avgProgress}%</div>
            </div>
          </div>
        </div>
      `;
    }

    // Render Tabs
    const tabsContainer = document.getElementById('goals-tabs-container');
    if (tabsContainer) {
      tabsContainer.innerHTML = `
        <div class="goals-tabs" style="display:flex;gap:var(--space-xs);margin-bottom:var(--space-xs);">
          <button class="btn btn-sm tab-filter-btn ${this.currentFilter === 'all' ? 'btn-primary' : 'btn-secondary'}" data-status="all" style="border-radius:100px;font-size:12px;padding:6px 14px;">Все</button>
          <button class="btn btn-sm tab-filter-btn ${this.currentFilter === 'В работе' ? 'btn-primary' : 'btn-secondary'}" data-status="В работе" style="border-radius:100px;font-size:12px;padding:6px 14px;">В работе</button>
          <button class="btn btn-sm tab-filter-btn ${this.currentFilter === 'Достигнута' ? 'btn-primary' : 'btn-secondary'}" data-status="Достигнута" style="border-radius:100px;font-size:12px;padding:6px 14px;">Достигнутые</button>
          <button class="btn btn-sm tab-filter-btn ${this.currentFilter === 'Отменена' ? 'btn-primary' : 'btn-secondary'}" data-status="Отменена" style="border-radius:100px;font-size:12px;padding:6px 14px;">Отменённые</button>
        </div>
      `;
    }

    // Filter goals
    const filteredGoals = this.goals.filter(goal => {
      if (this.currentFilter === 'all') return true;
      return goal.status === this.currentFilter;
    });

    if (filteredGoals.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-icon"><i data-lucide="target"></i></div>
          <div class="empty-text">Целей в данном разделе нет</div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = filteredGoals.map(goal => {
      const targetDateText = goal.target_date 
        ? new Date(goal.target_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Срок не указан';
      
      const isDone = goal.status === 'Достигнута';
      const isCancelled = goal.status === 'Отменена';

      let statusColor = 'var(--accent)';
      let bgGrad = 'linear-gradient(90deg, var(--accent) 0%, var(--accent-light) 100%)';
      let statusIcon = 'loader';
      if (isDone) {
        statusColor = 'var(--success)';
        bgGrad = 'linear-gradient(90deg, var(--success) 0%, #34d399 100%)';
        statusIcon = 'check-circle';
      }
      if (isCancelled) {
        statusColor = 'var(--text-muted)';
        bgGrad = 'var(--text-muted)';
        statusIcon = 'x-circle';
      }

      // Link project
      const linkedProject = goal.project_id ? this.projects.find(p => p.id === goal.project_id) : null;

      // Extract details and checklist
      const lines = (goal.description || '').replace(/\s*<!-- auto_progress: true -->/g, '').split('\n');
      const descLines = [];
      const checklistItems = [];
      
      lines.forEach((line, idx) => {
        const match = line.match(/^\s*-\s*\[([ xX])\]\s*(.+)$/);
        if (match) {
          checklistItems.push({
            index: idx,
            checked: match[1].toLowerCase() === 'x',
            text: match[2].trim()
          });
        } else {
          descLines.push(line);
        }
      });
      
      const cleanDescription = descLines.join('\n').trim();
      const isAuto = (goal.description || '').includes('<!-- auto_progress: true -->');
      const progress = this.getGoalProgress(goal);

      let progressLabelText = 'Прогресс';
      let progressLabelExtra = '';
      if (isAuto && goal.project_id) {
        const projectTasks = this.tasks.filter(t => t.project_id === goal.project_id && t.status !== 'Отменена');
        const completed = projectTasks.filter(t => t.status === 'Готово').length;
        progressLabelText = 'Прогресс (автоматический)';
        progressLabelExtra = `<span style="font-size:11px;color:var(--text-muted);font-weight:normal;">(${completed} из ${projectTasks.length} задач)</span>`;
      } else if (checklistItems.length > 0) {
        const completed = checklistItems.filter(item => item.checked).length;
        progressLabelText = 'Прогресс (чек-лист)';
        progressLabelExtra = `<span style="font-size:11px;color:var(--text-muted);font-weight:normal;">(${completed} из ${checklistItems.length} пунктов)</span>`;
      }

      let checklistHtml = '';
      if (checklistItems.length > 0) {
        checklistHtml = `
          <div class="goal-checklist" style="margin-top:var(--space-xs);display:flex;flex-direction:column;gap:6px;background:rgba(255,255,255,0.02);padding:10px 12px;border-radius:var(--radius-md);border:1px solid var(--glass-border);">
            ${checklistItems.map(item => `
              <label style="display:flex;align-items:flex-start;gap:8px;font-size:13px;color:var(--text-secondary);cursor:pointer;user-select:none;margin:0;">
                <input type="checkbox" class="goal-checklist-checkbox" data-goal-id="${goal.id}" data-item-idx="${item.index}" ${item.checked ? 'checked' : ''} style="margin-top:3px;cursor:pointer;accent-color:var(--accent);" onclick="event.stopPropagation();" />
                <span style="${item.checked ? 'text-decoration:line-through;opacity:0.5;' : ''}">${this.escapeHtml(item.text)}</span>
              </label>
            `).join('')}
          </div>
        `;
      }

      const deadlineBadge = this.getDeadlineBadge(goal.target_date);

      return `
        <div class="goal-card" data-id="${goal.id}" style="cursor:pointer;display:flex;flex-direction:column;justify-content:space-between;min-height:220px;">
          <div style="display:flex;flex-direction:column;gap:var(--space-sm);">
            <div class="goal-header" style="position:relative;padding-right:48px;">
              <div class="goal-title" style="${isDone ? 'text-decoration:line-through;opacity:0.6;' : ''}">
                ${this.escapeHtml(goal.title)}
              </div>
              
              <div class="goal-actions" style="position:absolute;top:0;right:0;margin:0;">
                <button class="habit-btn edit-goal-btn" data-id="${goal.id}" title="Редактировать" onclick="event.stopPropagation();">
                  <i data-lucide="pencil" style="width:14px;height:14px;"></i>
                </button>
                <button class="habit-btn danger delete-goal-btn" data-id="${goal.id}" title="Удалить" onclick="event.stopPropagation();">
                  <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
                </button>
              </div>
            </div>

            <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:2px;">
              <div class="goal-status-badge" style="background:${statusColor}15;color:${statusColor};">
                <i data-lucide="${statusIcon}" style="width:12px;height:12px;"></i> ${goal.status}
              </div>
              ${deadlineBadge}
            </div>

            ${cleanDescription ? `<div class="goal-description" style="margin-top:4px;">${this.escapeHtml(cleanDescription)}</div>` : ''}
            
            ${checklistHtml}
          </div>

          <div style="display:flex;flex-direction:column;gap:var(--space-sm);margin-top:var(--space-md);">
            <div class="goal-progress-container">
              <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:12px;color:var(--text-secondary);">
                <span>${progressLabelText} ${progressLabelExtra}</span>
                <span style="font-weight:700;color:var(--text-primary);">${progress}%</span>
              </div>
              <div class="goal-progress-bar">
                <div class="goal-progress-fill" style="width:${progress}%;background:${bgGrad};box-shadow:0 0 10px ${statusColor}40;"></div>
              </div>
            </div>

            <div class="goal-footer" style="margin-top:0;">
              <div style="display:flex;align-items:center;gap:6px;">
                <i data-lucide="calendar" style="width:14px;height:14px;color:var(--text-muted);"></i>
                ${targetDateText}
              </div>
              ${linkedProject ? `
                <div style="display:flex;align-items:center;gap:6px;color:var(--accent-soft);font-weight:500;">
                  <i data-lucide="folder" style="width:14px;height:14px;"></i>
                  ${this.escapeHtml(linkedProject.name)}
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();

    // Bind edit actions
    container.querySelectorAll('.edit-goal-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openModal(btn.dataset.id);
      });
    });

    // Bind delete actions
    container.querySelectorAll('.delete-goal-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        this.deleteGoal(id);
      });
    });
    
    // Bind card clicks to edit
    container.querySelectorAll('.goal-card').forEach(card => {
      card.addEventListener('click', () => this.openModal(card.dataset.id));
    });

    // Bind checklist checkbox clicks
    container.querySelectorAll('.goal-checklist-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', async (e) => {
        const goalId = checkbox.dataset.goalId;
        const itemIdx = parseInt(checkbox.dataset.itemIdx);
        const isChecked = checkbox.checked;
        
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;
        
        const lines = (goal.description || '').split('\n');
        let chkIdx = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].match(/^\s*-\s*\[([ xX])\]/)) {
            if (chkIdx === itemIdx) {
              lines[i] = lines[i].replace(/-\s*\[([ xX])\]/, isChecked ? '- [x]' : '- [ ]');
              break;
            }
            chkIdx++;
          }
        }
        
        const newDescription = lines.join('\n');
        
        // Calculate new progress
        const updatedChecklist = [];
        lines.forEach(l => {
          const m = l.match(/^\s*-\s*\[([ xX])\]\s*(.+)$/);
          if (m) {
            updatedChecklist.push(m[1].toLowerCase() === 'x');
          }
        });
        const checked = updatedChecklist.filter(c => c).length;
        const newProgress = updatedChecklist.length > 0 ? Math.round((checked / updatedChecklist.length) * 100) : 0;
        
        try {
          await DB.updateGoal(goalId, {
            description: newDescription,
            progress: newProgress
          });
          UI.toast('Прогресс сохранен', 'success');
          await this.load();
        } catch (err) {
          UI.toast('Ошибка сохранения: ' + err.message, 'error');
          checkbox.checked = !isChecked; // revert on UI
        }
      });
    });
  },

  openModal(goalId = null) {
    const goal = goalId ? this.goals.find(g => g.id === goalId) : null;
    const modal = document.getElementById('goal-modal');
    const titleEl = document.getElementById('goal-modal-title');
    const deleteBtn = document.getElementById('goal-modal-delete');

    titleEl.innerHTML = goal 
      ? '<i data-lucide="edit-3"></i> Редактировать цель' 
      : '<i data-lucide="target"></i> Новая цель';
      
    deleteBtn.style.display = goal ? '' : 'none';

    // Populate projects dropdown
    const projSelect = document.getElementById('gf-project');
    projSelect.innerHTML = `<option value="">— без проекта —</option>` + 
      this.projects.map(p => `<option value="${p.id}" ${goal?.project_id === p.id ? 'selected' : ''}>${p.name}</option>`).join('');

    const autoCheckbox = document.getElementById('gf-auto-progress');
    const progressInput = document.getElementById('gf-progress');

    // Set initial values
    document.getElementById('gf-title').value = goal ? goal.title : '';
    document.getElementById('gf-description').value = goal ? (goal.description || '').replace(/\s*<!-- auto_progress: true -->/g, '') : '';
    document.getElementById('gf-date').value = goal ? goal.target_date || '' : '';
    document.getElementById('gf-progress').value = goal ? goal.progress : 0;
    document.getElementById('gf-status').value = goal ? goal.status : 'В работе';

    const isAuto = goal ? (goal.description || '').includes('<!-- auto_progress: true -->') : false;
    autoCheckbox.checked = isAuto;

    const updateAutoState = () => {
      if (!projSelect.value) {
        autoCheckbox.checked = false;
        autoCheckbox.disabled = true;
      } else {
        autoCheckbox.disabled = false;
      }
      
      if (autoCheckbox.checked) {
        progressInput.disabled = true;
        progressInput.style.opacity = 0.5;
      } else {
        progressInput.disabled = false;
        progressInput.style.opacity = 1;
      }
    };

    // Bind local UI events
    projSelect.onchange = updateAutoState;
    autoCheckbox.onchange = updateAutoState;
    updateAutoState();

    const saveBtn = document.getElementById('goal-modal-save');
    const cancelBtn = document.getElementById('goal-modal-cancel');
    const closeBtn = document.getElementById('goal-modal-close');

    const close = () => modal.classList.add('hidden');

    saveBtn.onclick = () => this.saveGoal(goal?.id);
    cancelBtn.onclick = close;
    closeBtn.onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };
    deleteBtn.onclick = () => { close(); this.deleteGoal(goal?.id); };

    if (window.lucide) window.lucide.createIcons();
    
    modal.classList.remove('hidden');
    document.getElementById('gf-title').focus();
  },

  async saveGoal(id = null) {
    const title = document.getElementById('gf-title').value.trim();
    if (!title) { UI.toast('Введите название цели', 'warning'); return; }

    let description = document.getElementById('gf-description').value.trim();
    const isAuto = document.getElementById('gf-auto-progress').checked;
    const project_id = document.getElementById('gf-project').value || null;
    let progress = parseInt(document.getElementById('gf-progress').value) || 0;

    // Clean description from auto marker
    description = description.replace(/\s*<!-- auto_progress: true -->/g, '').trim();

    if (isAuto && project_id) {
      description += '\n\n<!-- auto_progress: true -->';
      // Calculate active progress value to write to DB
      const projectTasks = this.tasks.filter(t => t.project_id === project_id && t.status !== 'Отменена');
      const completed = projectTasks.filter(t => t.status === 'Готово').length;
      progress = projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0;
    } else {
      // Calculate progress if there's a checklist
      const checklistItems = [];
      const lines = description.split('\n');
      lines.forEach(l => {
        const m = l.match(/^\s*-\s*\[([ xX])\]\s*(.+)$/);
        if (m) {
          checklistItems.push(m[1].toLowerCase() === 'x');
        }
      });
      if (checklistItems.length > 0) {
        const checked = checklistItems.filter(c => c).length;
        progress = Math.round((checked / checklistItems.length) * 100);
      }
    }

    const data = {
      title,
      description,
      target_date: document.getElementById('gf-date').value || null,
      progress,
      status: document.getElementById('gf-status').value,
      project_id
    };

    try {
      if (id) {
        await DB.updateGoal(id, data);
        UI.toast('Цель обновлена', 'success');
      } else {
        await DB.createGoal(data);
        UI.toast('Цель создана', 'success');
      }
      document.getElementById('goal-modal').classList.add('hidden');
      await this.load();
    } catch (e) {
      UI.toast('Ошибка сохранения: ' + e.message, 'error');
    }
  },

  async deleteGoal(id) {
    if (!confirm('Вы уверены, что хотите удалить эту цель?')) return;
    try {
      await DB.deleteGoal(id);
      UI.toast('Цель удалена', 'info');
      const modal = document.getElementById('goal-modal');
      if (modal) modal.classList.add('hidden');
      await this.load();
    } catch (e) {
      UI.toast('Ошибка: ' + e.message, 'error');
    }
  },

  escapeHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
