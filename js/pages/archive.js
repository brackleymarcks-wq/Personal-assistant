// ============================================
// ARCHIVE PAGE
// ============================================

const ArchivePage = {
  tasks: [],
  
  render() {
    return `
      <div class="page-header">
        <div>
          <div class="page-title">Архив задач</div>
          <div class="page-subtitle" id="archive-count-label">Загрузка…</div>
        </div>
      </div>
      <div id="archive-content" style="margin-top: 24px;"></div>
    `;
  },

  async init() {
    await this.load();
  },

  async load() {
    const allTasks = await DB.getTasks();
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
    
    let detailsHtml = '';
    if (task.description || task.next_step) {
      detailsHtml = `
        <div class="archive-card-details" style="display: none; margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border-color); font-size: 13px;">
          ${task.next_step ? `<div style="margin-bottom: 8px;"><strong>Следующий шаг:</strong> ${this.escHtml(task.next_step)}</div>` : ''}
          ${task.description ? `<div><strong>Комментарии / Заметки:</strong><br><span style="white-space: pre-wrap; color: var(--text-secondary);">${this.escHtml(task.description)}</span></div>` : ''}
        </div>
      `;
    }

    return `
      <div class="archive-card card" style="padding: 16px; cursor: pointer; transition: background 0.2s; border-left: 4px solid ${isDone ? 'var(--success)' : 'var(--text-muted)'};" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='var(--bg-card)'">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-weight: 500; font-size: 15px; margin-bottom: 4px; ${!isDone ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${this.escHtml(task.title)}</div>
            <div style="display: flex; gap: 12px; font-size: 12px; color: var(--text-muted);">
              <span><i data-lucide="tag" style="width: 12px; height: 12px; vertical-align: text-bottom;"></i> ${task.direction}</span>
              ${task.project?.name ? `<span><i data-lucide="folder" style="width: 12px; height: 12px; vertical-align: text-bottom;"></i> ${this.escHtml(task.project.name)}</span>` : ''}
            </div>
          </div>
          <div style="font-size: 12px; color: var(--text-muted); white-space: nowrap; text-align: right;">
            <div>${date}</div>
            <div style="margin-top: 4px;">
              ${task.description || task.next_step ? '<span style="background: var(--bg-secondary); padding: 2px 6px; border-radius: 4px; font-size: 10px;">Есть заметки ↓</span>' : ''}
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
