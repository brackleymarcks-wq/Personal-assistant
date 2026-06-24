// ============================================
// ARCHIVE PAGE
// ============================================

const ArchivePage = {
  tasks: [],
  projects: [],
  
  render() {
    return `
      <div class="archive-page" style="display:flex; flex-direction:column; height:100%; overflow:hidden;">
        <div class="page-header">
          <div>
            <div class="page-title">Архив задач</div>
            <div class="page-subtitle" id="archive-count-label">Загрузка…</div>
          </div>
        </div>
        <div id="archive-content" style="flex:1; overflow-y:auto; margin-top: 24px; padding: 0 var(--space-xl); padding-bottom: 32px;"></div>
      </div>
    `;
  },

  async init() {
    await this.load();
  },

  async load() {
    const [allTasks, allProjects] = await Promise.all([
      DB.getTasks(),
      DB.getProjects()
    ]);
    this.projects = allProjects;
    this.tasks = allTasks.filter(t => ['Готово', 'Отменена'].includes(t.status));
    
    // Сортировка по дате обновления (сначала новые)
    this.tasks.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
    
    this.renderContent();
  },

  renderContent() {
    const container = document.getElementById('archive-content');
    document.getElementById('archive-count-label').textContent = `${this.tasks.length} завершенных задач`;

    if (this.tasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="archive" style="width:48px;height:48px;opacity:0.5;"></i></div>
          <div class="empty-text">Архив пуст</div>
          <div class="empty-subtext">Здесь будут отображаться выполненные и отмененные задачи</div>
        </div>
      `;
      return;
    }

    // Group by Month/Year
    const groups = {};
    for (const t of this.tasks) {
      const date = new Date(t.updated_at || t.created_at);
      const monthYear = date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
      const key = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }

    let html = '';
    for (const [groupName, items] of Object.entries(groups)) {
      html += `
        <div class="archive-group" style="margin-bottom: 32px;">
          <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
            ${groupName} <span style="color: var(--text-muted); font-size: 14px; font-weight: 400; margin-left: 8px;">${items.length}</span>
          </h3>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${items.map(t => this.renderArchiveCard(t)).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
    
    // Add click handlers for expanding comments
    container.querySelectorAll('.archive-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Если клик не по кнопкам
        const details = card.querySelector('.archive-card-details');
        if (details) {
          details.style.display = details.style.display === 'none' ? 'block' : 'none';
        }
      });
    });

    if (window.lucide) window.lucide.createIcons();
  },

  renderArchiveCard(task) {
    const isDone = task.status === 'Готово';
    const date = new Date(task.updated_at || task.created_at).toLocaleDateString('ru-RU');
    
    const createdDate = new Date(task.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    const updatedDate = new Date(task.updated_at || task.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    const deadlineStr = task.deadline ? new Date(task.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
    
    const prioColor = task.priority === 'Высокий' ? 'var(--danger)' : (task.priority === 'Средний' ? 'var(--warning)' : 'var(--success)');
    const statusIcon = task.status === 'Готово' ? 'check-circle-2' : 'x-circle';
    const statusColor = task.status === 'Готово' ? 'var(--success)' : 'var(--text-muted)';
    
    let directionBadge = '';
    if (task.direction) {
      const dirs = task.direction.split(',').map(d => d.trim()).filter(Boolean);
      directionBadge = dirs.map(d => `<span><i data-lucide="tag" style="width: 12px; height: 12px; vertical-align: text-bottom;"></i> ${this.escHtml(d)}</span>`).join('');
    }

    let detailsHtml = `
      <div class="archive-card-details" style="display: none; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color); font-size: 13px;">
        
        <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px;">
          <div class="glass-panel" style="padding: 8px 14px; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="${statusIcon}" style="width: 14px; height: 14px; color: ${statusColor};"></i>
            <span style="color:var(--text-muted); font-size: 11px;">Статус:</span> 
            <strong style="font-size: 13px;">${task.status}</strong>
          </div>
          
          <div class="glass-panel" style="padding: 8px 14px; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="flag" style="width: 14px; height: 14px; color: ${prioColor};"></i>
            <span style="color:var(--text-muted); font-size: 11px;">Приоритет:</span> 
            <strong style="font-size: 13px;">${task.priority || 'Средний'}</strong>
          </div>

          <div class="glass-panel" style="padding: 8px 14px; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="calendar-off" style="width: 14px; height: 14px; color: var(--text-muted);"></i>
            <span style="color:var(--text-muted); font-size: 11px;">Дедлайн:</span> 
            <strong style="font-size: 13px;">${deadlineStr}</strong>
          </div>

          <div class="glass-panel" style="padding: 8px 14px; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="calendar-plus" style="width: 14px; height: 14px; color: var(--text-muted);"></i>
            <span style="color:var(--text-muted); font-size: 11px;">Создана:</span> 
            <strong style="font-size: 13px;">${createdDate}</strong>
          </div>
          
          ${task.pomodoros_done ? `
          <div class="glass-panel" style="padding: 8px 14px; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="timer" style="width: 14px; height: 14px; color: var(--warning);"></i>
            <span style="color:var(--text-muted); font-size: 11px;">Помодоро:</span> 
            <strong style="font-size: 13px;">${task.pomodoros_done}</strong>
          </div>
          ` : ''}
        </div>

        ${task.next_step ? `
          <div style="margin-bottom: 20px;">
            <div style="font-weight: 600; color:var(--text-secondary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
              <i data-lucide="corner-down-right" style="width: 16px; height: 16px;"></i> Следующий шаг
            </div>
            <div class="glass-panel" style="padding: 14px 18px; border-left: 4px solid var(--accent); border-radius: 12px; color: var(--text-primary); font-size: 14px;">
              ${this.escHtml(task.next_step)}
            </div>
          </div>
        ` : ''}

        ${task.description ? `
          <div>
            <div style="font-weight: 600; color:var(--text-secondary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
              <i data-lucide="file-text" style="width: 16px; height: 16px;"></i> Комментарии / Заметки
            </div>
            <div class="glass-panel" style="padding: 16px 20px; border-radius: 12px; white-space: pre-wrap; color: var(--text-primary); line-height: 1.6; font-size: 14px;">
              ${this.escHtml(task.description)}
            </div>
          </div>
        ` : ''}

      </div>
    `;

    return `
      <div class="archive-card glass-panel" style="padding: 20px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; border-left: 4px solid ${isDone ? 'var(--success)' : 'var(--text-muted)'}; margin-bottom: 16px;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow-md)'" onmouseout="this.style.transform='none'; this.style.boxShadow='var(--shadow-glass)'">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-weight: 500; font-size: 15px; margin-bottom: 4px; ${!isDone ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${this.escHtml(task.title)}</div>
            <div style="display: flex; gap: 12px; font-size: 12px; color: var(--text-muted);">
              ${directionBadge}
              ${task.project_id ? (() => {
                const proj = this.projects.find(p => p.id === task.project_id);
                return proj ? `<span><i data-lucide="folder" style="width: 12px; height: 12px; vertical-align: text-bottom;"></i> ${this.escHtml(proj.name)}</span>` : '';
              })() : ''}
            </div>
          </div>
          <div style="font-size: 12px; color: var(--text-muted); white-space: nowrap; text-align: right;">
            <div>${date}</div>
            <div style="margin-top: 4px;">
              <span style="background: var(--bg-secondary); padding: 2px 6px; border-radius: 4px; font-size: 10px;">Развернуть ↓</span>
            </div>
          </div>
        </div>
        ${detailsHtml}
      </div>
    `;
  },

  escHtml(text) {
    if (!text) return '';
    return text.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};
