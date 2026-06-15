// ============================================
// PROJECTS PAGE
// ============================================

const ProjectsPage = {
  projects: [],
  tasks: [],

  render() {
    return `
      <div class="projects-page" id="projects-page" style="display:flex;flex-direction:column;height:100%;background:var(--bg-primary);">
        <div class="page-header" style="background:var(--bg-surface);padding:var(--space-lg) var(--space-xl);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
          <div>
            <div class="page-title" style="font-size:20px;font-weight:700;">Проекты</div>
            <div class="page-subtitle" id="projects-count-label" style="font-size:13px;color:var(--text-secondary);margin-top:2px;">Загрузка…</div>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" id="add-project-btn" style="display:flex;align-items:center;gap:6px;">
              <i data-lucide="plus"></i>
              Новый проект
            </button>
          </div>
        </div>
        
        <div style="padding:var(--space-xl);flex:1;overflow-y:auto;align-content:start;">
          <div id="projects-grid" class="projects-grid"></div>
        </div>
      </div>
    `;
  },

  async init() {
    document.getElementById('add-project-btn').addEventListener('click', () => this.openModal());
    await this.load();
  },

  async load() {
    [this.projects, this.tasks] = await Promise.all([DB.getProjects(), DB.getTasks()]);
    this.renderGrid();
  },

  renderGrid() {
    const grid = document.getElementById('projects-grid');
    const active = this.projects.filter(p => p.status === 'Активный').length;
    const countLabel = document.getElementById('projects-count-label');
    
    if (countLabel) {
      countLabel.textContent = `${this.projects.length} проектов · ${active} активных`;
    }

    if (this.projects.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;text-align:center;padding:var(--space-3xl) 0;color:var(--text-muted);display:flex;flex-direction:column;align-items:center;gap:var(--space-md);">
          <i data-lucide="folder-open" style="width:48px;height:48px;color:var(--border-light);"></i>
          <div class="empty-text" style="font-size:16px;font-weight:600;color:var(--text-primary)">Проектов пока нет</div>
          <div class="empty-subtext" style="font-size:13px;color:var(--text-secondary);">Создайте свой первый проект для организации задач</div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    grid.innerHTML = this.projects.map(p => this.renderCard(p)).join('');
    grid.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', () => this.openModal(card.dataset.id));
    });

    if (window.lucide) window.lucide.createIcons();
  },

  renderCard(project) {
    const projectTasks = this.tasks.filter(t => t.project_id === project.id);
    const doneTasks = projectTasks.filter(t => t.status === 'Готово').length;
    const activeTasks = projectTasks.filter(t => !['Готово', 'Отменена'].includes(t.status)).length;
    const totalTasks = projectTasks.length;
    
    let progress = 0;
    if (totalTasks > 0) {
      progress = Math.round((doneTasks / totalTasks) * 100);
    }

    const deadline = project.deadline
      ? new Date(project.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
      : null;

    const STATUS_CLASS = { 'Активный': 'status-active', 'Пауза': 'status-pause', 'Завершён': 'status-done' };
    const STATUS_ICONS = { 'Активный': 'play-circle', 'Пауза': 'pause-circle', 'Завершён': 'check-circle-2' };
    
    let isDone = project.status === 'Завершён';

    return `
      <div class="project-card" data-id="${project.id}">
        <div class="project-card-header">
          <div class="project-name" style="${isDone ? 'text-decoration:line-through;color:var(--text-secondary);' : ''}">${this.esc(project.name)}</div>
          <div class="project-status-badge ${STATUS_CLASS[project.status] || ''}">
            <i data-lucide="${STATUS_ICONS[project.status] || 'circle'}" style="width:12px;height:12px;"></i>
            ${project.status}
          </div>
        </div>
        
        ${project.description 
          ? `<div class="project-desc">${this.esc(project.description)}</div>` 
          : '<div class="project-desc" style="color:var(--text-muted);font-style:italic">Описание не добавлено</div>'
        }
        
        <div class="project-stats-container">
          <div class="project-progress-bar">
             <div class="project-progress-fill" style="width:${progress}%; ${isDone ? 'background:var(--success)' : ''}"></div>
          </div>
          <div class="project-stats">
            <div class="project-stat">
              <span class="project-stat-value">${activeTasks}</span>
              <span class="project-stat-label">В работе</span>
            </div>
            <div class="project-stat">
              <span class="project-stat-value" style="color:var(--success)">${doneTasks}</span>
              <span class="project-stat-label">Готово</span>
            </div>
            <div class="project-stat">
              <span class="project-stat-value">${totalTasks}</span>
              <span class="project-stat-label">Всего</span>
            </div>
          </div>
        </div>
        
        ${deadline ? `
          <div class="project-deadline">
            <i data-lucide="calendar" style="width:14px;height:14px;"></i>
            Дедлайн: <span style="font-weight:600;color:var(--text-primary)">${deadline}</span>
          </div>
        ` : ''}
      </div>
    `;
  },

  openModal(projectId = null) {
    const project = projectId ? this.projects.find(p => p.id === projectId) : null;
    const projectTasks = project ? this.tasks.filter(t => t.project_id === project.id) : [];

    const modal = document.getElementById('task-modal'); // reuse task modal wrapper
    const titleEl = document.getElementById('task-modal-title');
    const deleteBtn = document.getElementById('task-modal-delete');

    titleEl.innerHTML = project 
      ? '<i data-lucide="folder"></i> Редактировать проект' 
      : '<i data-lucide="folder-plus"></i> Новый проект';
      
    deleteBtn.style.display = project ? '' : 'none';

    const body = document.getElementById('task-modal-body');
    body.innerHTML = `
      <div class="form-group">
        <label class="form-label">Название *</label>
        <input id="pf-name" type="text" class="form-input" value="${project ? this.esc(project.name) : ''}" placeholder="Название проекта" />
      </div>
      <div class="form-group">
        <label class="form-label">Описание</label>
        <textarea id="pf-desc" class="form-input" placeholder="Цель и контекст проекта…" style="min-height:80px">${project ? this.esc(project.description || '') : ''}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Статус</label>
          <select id="pf-status" class="form-input">
            ${['Активный','Пауза','Завершён'].map(s => `<option value="${s}" ${(project?.status||'Активный')===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Дедлайн</label>
          <input id="pf-deadline" type="date" class="form-input" value="${project?.deadline||''}" />
        </div>
      </div>
      ${project && projectTasks.length > 0 ? `
        <div class="form-group" style="margin-top:var(--space-md);">
          <label class="form-label" style="display:flex;align-items:center;gap:6px;">
            <i data-lucide="check-square" style="width:14px;height:14px;"></i> Задачи проекта (${projectTasks.length})
          </label>
          <div class="project-tasks-list">
            ${projectTasks.map(t => {
              const isDone = t.status === 'Готово';
              return `
                <div class="project-task-item" style="${isDone ? 'opacity:0.6;' : ''}">
                  <i data-lucide="${isDone ? 'check-circle-2' : 'circle'}" style="width:16px;height:16px;color:${isDone ? 'var(--success)' : 'var(--accent)'};flex-shrink:0;"></i>
                  <span style="${isDone ? 'text-decoration:line-through;' : ''}">${this.esc(t.title)}</span>
                  <span style="margin-left:auto;font-size:11px;color:var(--text-muted);background:var(--bg-elevated);padding:2px 6px;border-radius:4px;">${t.status}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
    `;

    const close = () => modal.classList.add('hidden');
    document.getElementById('task-modal-save').onclick = () => this.saveProject(project?.id);
    document.getElementById('task-modal-cancel').onclick = close;
    document.getElementById('task-modal-close').onclick = close;
    document.getElementById('task-modal-delete').onclick = () => this.deleteProject(project?.id);
    modal.onclick = (e) => { if (e.target === modal) close(); };

    if (window.lucide) window.lucide.createIcons();

    modal.classList.remove('hidden');
    document.getElementById('pf-name').focus();
  },

  async saveProject(id = null) {
    const name = document.getElementById('pf-name').value.trim();
    if (!name) { UI.toast('Введи название проекта', 'warning'); return; }

    const data = {
      name,
      description: document.getElementById('pf-desc').value,
      status: document.getElementById('pf-status').value,
      deadline: document.getElementById('pf-deadline').value || null
    };

    try {
      if (id) {
        const updated = await DB.updateProject(id, data);
        const idx = this.projects.findIndex(p => p.id === id);
        if (idx >= 0) this.projects[idx] = { ...this.projects[idx], ...updated };
        UI.toast('Проект обновлён', 'success');
      } else {
        const created = await DB.createProject(data);
        this.projects.unshift(created);
        UI.toast('Проект создан', 'success');
      }
      document.getElementById('task-modal').classList.add('hidden');
      this.renderGrid();
    } catch (e) {
      UI.toast('Ошибка: ' + e.message, 'error');
    }
  },

  async deleteProject(id) {
    if (!confirm('Вы уверены, что хотите удалить проект? Связанные задачи останутся, но потеряют привязку.')) return;
    try {
      await DB.deleteProject(id);
      this.projects = this.projects.filter(p => p.id !== id);
      document.getElementById('task-modal').classList.add('hidden');
      this.renderGrid();
      UI.toast('Проект удалён', 'info');
    } catch (e) {
      UI.toast('Ошибка: ' + e.message, 'error');
    }
  },

  esc(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
