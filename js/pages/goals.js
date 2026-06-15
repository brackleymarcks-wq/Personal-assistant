// ============================================
// GOALS PAGE — OKR / SMART Goals
// ============================================

const GoalsPage = {
  goals: [],
  projects: [],

  render() {
    return `
      <div class="goals-page" style="display:flex;flex-direction:column;height:100%;background:var(--bg-primary);">
        <div class="page-header" style="background:var(--bg-surface);padding:var(--space-lg) var(--space-xl);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
          <div>
            <div class="page-title" style="font-size:20px;font-weight:700;">Цели (OKR / SMART)</div>
            <div class="page-subtitle" id="goals-count-label" style="font-size:13px;color:var(--text-secondary);margin-top:2px;">Загрузка целей…</div>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" id="add-goal-btn" style="display:flex;align-items:center;gap:6px;">
              <i data-lucide="plus"></i>
              Новая цель
            </button>
          </div>
        </div>

        <div style="padding:var(--space-xl);display:flex;flex-direction:column;gap:var(--space-xl);flex:1;overflow-y:auto;align-content:start;">
          <div id="goals-list-container" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(340px, 1fr));gap:var(--space-lg);"></div>
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
                <textarea id="gf-description" class="form-input" rows="3" placeholder="Как поймем, что цель достигнута? Какие ключевые результаты?"></textarea>
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
    this.bindEvents();
    await this.load();
  },

  bindEvents() {
    document.getElementById('add-goal-btn').addEventListener('click', () => this.openModal());
  },

  async load() {
    try {
      [this.goals, this.projects] = await Promise.all([
        DB.getGoals(),
        DB.getProjects()
      ]);
      this.renderContent();
    } catch (e) {
      console.error(e);
    }
  },

  renderContent() {
    const container = document.getElementById('goals-list-container');
    const countLabel = document.getElementById('goals-count-label');

    const activeGoals = this.goals.filter(g => g.status === 'В работе');
    countLabel.textContent = `${this.goals.length} целей · ${activeGoals.length} в работе`;

    if (this.goals.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;text-align:center;padding:var(--space-3xl) 0;color:var(--text-muted);display:flex;flex-direction:column;align-items:center;gap:var(--space-md);">
          <i data-lucide="target" style="width:48px;height:48px;color:var(--border-light);"></i>
          <div style="font-size:16px;font-weight:600;color:var(--text-primary)">Целей пока нет</div>
          <div style="font-size:13px;color:var(--text-secondary);">Сформулируйте свою первую амбициозную цель!</div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = this.goals.map(goal => {
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

      return `
        <div class="goal-card" data-id="${goal.id}">
          <div class="goal-header">
            <div class="goal-title" style="${isDone ? 'text-decoration:line-through;opacity:0.6;' : ''}">
              ${this.escapeHtml(goal.title)}
            </div>
            
            <div class="goal-actions">
              <button class="habit-btn edit-goal-btn" data-id="${goal.id}" title="Редактировать">
                <i data-lucide="pencil" style="width:14px;height:14px;"></i>
              </button>
              <button class="habit-btn danger delete-goal-btn" data-id="${goal.id}" title="Удалить">
                <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
              </button>
            </div>
          </div>

          <div class="goal-status-badge" style="background:${statusColor}15;color:${statusColor};width:fit-content;margin-top:-4px;">
            <i data-lucide="${statusIcon}" style="width:12px;height:12px;"></i> ${goal.status}
          </div>

          ${goal.description ? `<div class="goal-description">${this.escapeHtml(goal.description)}</div>` : ''}

          <div class="goal-progress-container">
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);">
              <span>Прогресс</span>
              <span style="font-weight:700;color:var(--text-primary);">${goal.progress}%</span>
            </div>
            <div class="goal-progress-bar">
              <div class="goal-progress-fill" style="width:${goal.progress}%;background:${bgGrad};box-shadow:0 0 10px ${statusColor}40;"></div>
            </div>
          </div>

          <div class="goal-footer">
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
        if (!confirm('Удалить эту цель?')) return;
        try {
          await DB.deleteGoal(id);
          UI.toast('Цель удалена', 'info');
          await this.load();
        } catch (err) {
          UI.toast('Ошибка: ' + err.message, 'error');
        }
      });
    });
    
    // Bind card clicks to edit (optional, but good for UX)
    container.querySelectorAll('.goal-card').forEach(card => {
      card.addEventListener('click', () => this.openModal(card.dataset.id));
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

    // Set values
    document.getElementById('gf-title').value = goal ? goal.title : '';
    document.getElementById('gf-description').value = goal ? goal.description || '' : '';
    document.getElementById('gf-date').value = goal ? goal.target_date || '' : '';
    document.getElementById('gf-progress').value = goal ? goal.progress : 0;
    document.getElementById('gf-status').value = goal ? goal.status : 'В работе';

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

    const data = {
      title,
      description: document.getElementById('gf-description').value,
      target_date: document.getElementById('gf-date').value || null,
      progress: parseInt(document.getElementById('gf-progress').value) || 0,
      status: document.getElementById('gf-status').value,
      project_id: document.getElementById('gf-project').value || null
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
