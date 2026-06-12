// ============================================
// PROJECTS PAGE
// ============================================

const ProjectsPage = {
  projects: [],
  tasks: [],

  render() {
    return `
      <div class="projects-page" id="projects-page">
        <div class="page-header" style="margin-bottom:var(--space-lg)">
          <div>
            <div class="page-title">Проекты</div>
            <div class="page-subtitle" id="projects-count-label">Загрузка…</div>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" id="add-project-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Новый проект
            </button>
          </div>
        </div>
        <div id="projects-grid" class="projects-grid"></div>
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
    document.getElementById('projects-count-label').textContent =
      `${this.projects.length} проектов · ${active} активных`;

    if (this.projects.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🗂</div>
        <div class="empty-text">Проектов пока нет</div>
        <div class="empty-subtext">Создай первый проект</div>
      </div>`;
      return;
    }

    grid.innerHTML = this.projects.map(p => this.renderCard(p)).join('');
    grid.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', () => this.openModal(card.dataset.id));
    });
  },

  renderCard(project) {
    const projectTasks = this.tasks.filter(t => t.project_id === project.id);
    const doneTasks = projectTasks.filter(t => t.status === 'Готово').length;
    const activeTasks = projectTasks.filter(t => !['Готово', 'Отменена'].includes(t.status)).length;
    const deadline = project.deadline
      ? new Date(project.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
      : null;

    const STATUS_CLASS = { 'Активный': 'status-active', 'Пауза': 'status-pause', 'Завершён': 'status-done' };

    return `
      <div class="project-card" data-id="${project.id}">
        <div class="project-card-header">
          <div class="project-name">${this.esc(project.name)}</div>
          <span class="project-status-badge ${STATUS_CLASS[project.status] || ''}">${project.status}</span>
        </div>
        ${project.description ? `<div class="project-desc">${this.esc(project.description)}</div>` : '<div class="project-desc" style="color:var(--text-muted);font-style:italic">Описание не добавлено</div>'}
        <div class="project-stats">
          <div class="project-stat">
            <span class="project-stat-value">${activeTasks}</span>
            <span class="project-stat-label">Активных</span>
          </div>
          <div class="project-stat">
            <span class="project-stat-value">${doneTasks}</span>
            <span class="project-stat-label">Готово</span>
          </div>
          <div class="project-stat">
            <span class="project-stat-value">${projectTasks.length}</span>
            <span class="project-stat-label">Всего</span>
          </div>
        </div>
        ${deadline ? `<div class="project-deadline">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          Дедлайн: ${deadline}
        </div>` : ''}
      </div>
    `;
  },

  openModal(projectId = null) {
    const project = projectId ? this.projects.find(p => p.id === projectId) : null;
    const projectTasks = project ? this.tasks.filter(t => t.project_id === project.id) : [];

    const modal = document.getElementById('task-modal'); // reuse task modal
    document.getElementById('task-modal-title').textContent = project ? project.name : 'Новый проект';
    document.getElementById('task-modal-delete').style.display = project ? '' : 'none';

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
        <div class="form-group">
          <label class="form-label">Задачи проекта (${projectTasks.length})</label>
          <div class="project-tasks-list">
            ${projectTasks.map(t => `
              <div class="project-task-item">
                <span style="width:8px;height:8px;border-radius:50%;background:${t.status==='Готово'?'var(--success)':'var(--accent)'};flex-shrink:0;display:inline-block"></span>
                ${this.esc(t.title)}
                <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">${t.status}</span>
              </div>
            `).join('')}
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

    document.getElementById('pf-name').focus();
    modal.classList.remove('hidden');
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
    if (!confirm('Удалить проект? Задачи останутся.')) return;
    await DB.deleteProject(id);
    this.projects = this.projects.filter(p => p.id !== id);
    document.getElementById('task-modal').classList.add('hidden');
    this.renderGrid();
    UI.toast('Проект удалён', 'info');
  },

  esc(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
