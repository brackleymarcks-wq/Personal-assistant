// ============================================
// GOALS PAGE — OKR / SMART Goals
// ============================================

const GoalsPage = {
  goals: [],
  projects: [],

  render() {
    return `
      <div class="goals-page" style="display:flex;flex-direction:column;height:100%;background:var(--bg-primary);">
        <div class="page-header" style="background:var(--bg-surface);padding:var(--space-lg) var(--space-xl);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:between;flex-shrink:0;">
          <div>
            <div class="page-title" style="font-size:20px;font-weight:700;">Цели (OKR / SMART)</div>
            <div class="page-subtitle" id="goals-count-label" style="font-size:13px;color:var(--text-secondary);margin-top:2px;">Загрузка целей…</div>
          </div>
          <div class="page-actions" style="margin-left:auto;">
            <button class="btn btn-primary" id="add-goal-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Новая цель
            </button>
          </div>
        </div>

        <div style="padding:var(--space-xl);display:flex;flex-direction:column;gap:var(--space-xl);flex:1;overflow-y:auto;">
          <!-- Goals List container -->
          <div id="goals-list-container" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:var(--space-md);"></div>
        </div>

        <!-- Goal Modal -->
        <div id="goal-modal" class="modal-overlay hidden">
          <div class="modal">
            <div class="modal-header">
              <h2 class="modal-title" id="goal-modal-title">Новая цель</h2>
              <button class="modal-close" id="goal-modal-close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Формулировка цели *</label>
                <input id="gf-title" type="text" class="form-input" placeholder="Например: Запустить AI-Портал к 1 июля" />
              </div>
              <div class="form-group">
                <label class="form-label">Описание / Критерии успеха (Key Results)</label>
                <textarea id="gf-description" class="form-input" placeholder="Как поймем, что цель достигнута? Какие ключевые результаты?"></textarea>
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
              <button class="btn btn-ghost" id="goal-modal-delete" style="display:none;color:var(--danger)">Удалить</button>
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
        <div class="empty-state" style="grid-column:1/-1;text-align:center;padding:var(--space-2xl) 0;color:var(--text-muted);">
          <div class="empty-icon" style="font-size:48px;margin-bottom:var(--space-md)">🎯</div>
          <div class="empty-text" style="font-size:16px;font-weight:600;color:var(--text-primary)">Целей пока нет</div>
          <div class="empty-subtext" style="font-size:13px;color:var(--text-secondary);margin-top:4px">Сформулируй свою первую стратегическую цель!</div>
        </div>
      `;
      return;
    }

    container.innerHTML = this.goals.map(goal => {
      const targetDateText = goal.target_date 
        ? new Date(goal.target_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Срок не указан';
      
      const isDone = goal.status === 'Достигнута';
      const isCancelled = goal.status === 'Отменена';

      let statusColor = 'var(--accent)';
      if (isDone) statusColor = 'var(--success)';
      if (isCancelled) statusColor = 'var(--text-muted)';

      return `
        <div class="goal-card" data-id="${goal.id}" style="background:var(--bg-surface);border:1px solid var(--border-light);border-radius:var(--radius-lg);padding:var(--space-lg);box-shadow:var(--shadow-sm);cursor:pointer;display:flex;flex-direction:column;gap:var(--space-md);transition:all var(--transition);position:relative;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-sm);">
            <div style="font-size:15px;font-weight:700;color:var(--text-primary);line-height:1.4;${isDone ? 'text-decoration:line-through;color:var(--text-secondary);' : ''}">
              ${this.escapeHtml(goal.title)}
            </div>
            <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:var(--radius-full);background:${statusColor}20;color:${statusColor};flex-shrink:0;">
              ${goal.status}
            </span>
          </div>

          ${goal.description ? `<div style="font-size:13px;color:var(--text-secondary);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${this.escapeHtml(goal.description)}</div>` : ''}

          <div style="margin-top:auto;">
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);margin-bottom:6px;">
              <span>Прогресс</span>
              <span style="font-weight:600;color:var(--text-primary);">${goal.progress}%</span>
            </div>
            <div style="width:100%;height:8px;background:var(--bg-elevated);border-radius:var(--radius-full);overflow:hidden;">
              <div style="width:${goal.progress}%;height:100%;background:${statusColor};border-radius:var(--radius-full);transition:width 0.3s ease;"></div>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--text-muted);border-top:1px solid var(--border);padding-top:var(--space-sm);margin-top:2px;">
            <span>📅 ${targetDateText}</span>
            ${goal.projects && goal.projects.name ? `<span style="font-weight:500;color:var(--accent-soft)">🗂 ${this.escapeHtml(goal.projects.name)}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Bind card clicks
    container.querySelectorAll('.goal-card').forEach(card => {
      card.addEventListener('click', () => this.openModal(card.dataset.id));
    });
  },

  openModal(goalId = null) {
    const goal = goalId ? this.goals.find(g => g.id === goalId) : null;
    const modal = document.getElementById('goal-modal');
    const titleEl = document.getElementById('goal-modal-title');
    const deleteBtn = document.getElementById('goal-modal-delete');

    titleEl.textContent = goal ? 'Редактировать цель' : 'Новая цель';
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
    deleteBtn.onclick = () => this.deleteGoal(goal?.id);

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
    if (!confirm('Удалить эту цель?')) return;
    try {
      await DB.deleteGoal(id);
      UI.toast('Цель удалена', 'info');
      document.getElementById('goal-modal').classList.add('hidden');
      await this.load();
    } catch (e) {
      UI.toast('Ошибка: ' + e.message, 'error');
    }
  },

  escapeHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
