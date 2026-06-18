// ============================================
// PEEK VIEW MODAL
// ============================================

window.PeekView = {
  modal: null,
  body: null,
  typeContainer: null,
  isOpen: false,
  currentType: null,
  currentId: null,

  init() {
    this.modal = document.getElementById('peek-modal');
    this.body = document.getElementById('peek-modal-body');
    this.typeContainer = document.getElementById('peek-modal-type');
    
    if (!this.modal) return;

    // Close buttons
    document.getElementById('peek-modal-close')?.addEventListener('click', () => this.close());
    
    // Close on overlay click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    // Expand button
    document.getElementById('peek-modal-expand')?.addEventListener('click', () => {
      this.expand();
    });

    // Global ESC handler is probably handled elsewhere, but let's add one here safely
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        // Only close if it's the topmost overlay
        this.close();
      }
    });
  },

  async open(type, id) {
    if (!this.modal) this.init();
    
    this.currentType = type;
    this.currentId = id;
    
    this.modal.classList.remove('hidden');
    this.modal.style.display = 'flex';
    this.isOpen = true;

    this.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);">
        <i data-lucide="loader-2" class="spin" style="width:32px;height:32px;"></i>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();

    try {
      if (type === 'task') await this.renderTask(id);
      else if (type === 'note' || type === 'knowledge') await this.renderNote(id);
      else if (type === 'project') await this.renderProject(id);
      else {
        this.body.innerHTML = `<div style="padding:40px;text-align:center;">Неизвестный тип: ${type}</div>`;
      }
    } catch (e) {
      console.error(e);
      this.body.innerHTML = `<div style="padding:40px;text-align:center;color:var(--danger)">Ошибка загрузки</div>`;
    }
  },

  close() {
    this.isOpen = false;
    this.modal.classList.add('hidden');
    this.modal.style.display = 'none';
    this.body.innerHTML = '';
  },

  expand() {
    const type = this.currentType;
    const id = this.currentId;
    this.close();
    
    // Switch to appropriate tab
    const tabs = {
      'task': 'tasks',
      'note': 'notes',
      'knowledge': 'knowledge',
      'project': 'projects'
    };
    
    if (tabs[type] && typeof window.switchTab === 'function') {
      window.switchTab(tabs[type]);
    }
    
    // Wait for tab to switch then open item
    setTimeout(() => {
      if (type === 'task' && window.TasksPage) {
        TasksPage.editTask(id);
      } else if ((type === 'note' || type === 'knowledge') && window.NotesPage) {
        NotesPage.selectNote(id);
      } else if (type === 'project' && window.ProjectsPage) {
        ProjectsPage.openProject(id);
      }
    }, 150);
  },

  async renderTask(id) {
    this.typeContainer.innerHTML = `<i data-lucide="check-square" style="width:16px;height:16px;color:var(--accent);"></i> Задача`;
    
    const tasks = await DB.getTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) throw new Error('Задача не найдена');

    // Parse Markdown and Obsidian links in description
    const descHtml = this.parseLinks(task.description || '*Нет описания*');

    this.body.innerHTML = `
      <div style="padding: 32px 40px; display: flex; flex-direction: column; gap: 24px;">
        <div style="font-size: 24px; font-weight: 800; color: var(--text-primary); line-height: 1.3;">${this.esc(task.title)}</div>
        
        <div style="display:flex; gap:16px; flex-wrap:wrap;">
          <div style="background:var(--bg-hover); padding:6px 12px; border-radius:8px; font-size:12px; font-weight:600; color:var(--text-secondary); display:flex; align-items:center; gap:6px;">
            <i data-lucide="circle-dot" style="width:14px;height:14px;"></i> ${task.status || 'К выполнению'}
          </div>
          ${task.deadline ? `
            <div style="background:rgba(var(--accent-rgb),0.1); padding:6px 12px; border-radius:8px; font-size:12px; font-weight:600; color:var(--accent); display:flex; align-items:center; gap:6px;">
              <i data-lucide="calendar" style="width:14px;height:14px;"></i> Дедлайн: ${new Date(task.deadline).toLocaleDateString('ru-RU')}
            </div>
          ` : ''}
          ${task.priority ? `
            <div style="background:var(--bg-hover); padding:6px 12px; border-radius:8px; font-size:12px; font-weight:600; color:var(--text-secondary); display:flex; align-items:center; gap:6px;">
              <i data-lucide="flag" style="width:14px;height:14px;"></i> ${task.priority}
            </div>
          ` : ''}
        </div>

        <div style="background: var(--bg-surface); padding: 24px; border-radius: 12px; border: 1px solid var(--border-light); font-size: 14px; line-height: 1.6; color: var(--text-primary); white-space: pre-wrap;">${descHtml}</div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  },

  async renderNote(id) {
    this.typeContainer.innerHTML = `<i data-lucide="file-text" style="width:16px;height:16px;color:#10b981;"></i> Заметка`;
    
    // Notes can be in getNotes or getKnowledge, check both
    let notes = [];
    if (DB.getNotes) notes = await DB.getNotes();
    let note = notes.find(n => n.id === id);
    
    if (!note) {
      if (DB.getKnowledge) {
        const kb = await DB.getKnowledge();
        note = kb.find(k => k.id === id);
      }
    }
    
    if (!note) throw new Error('Заметка не найдена');

    const contentParts = (note.content || '').split('\\n\\n===AI_CHAT_START===\\n');
    const contentText = contentParts[0] || '*Пусто*';
    
    // Convert markdown to HTML then parse Obsidian links
    const rawHtml = window.marked ? marked.parse(contentText) : this.esc(contentText);
    const contentHtml = this.parseLinks(rawHtml, true);

    this.body.innerHTML = `
      <div style="padding: 32px 40px; display: flex; flex-direction: column; gap: 24px;">
        <div style="font-size: 28px; font-weight: 800; color: var(--text-primary); line-height: 1.3;">${note.mood || ''} ${this.esc(note.title)}</div>
        
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${(note.tags || []).map(t => `<span style="background:var(--bg-hover); padding:4px 10px; border-radius:20px; font-size:11px; font-weight:600; color:var(--text-muted);">#${this.esc(t)}</span>`).join('')}
        </div>

        <div class="markdown-body" style="font-size: 15px; line-height: 1.7; color: var(--text-primary);">${contentHtml}</div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  },

  async renderProject(id) {
    this.typeContainer.innerHTML = `<i data-lucide="folder" style="width:16px;height:16px;color:#8b5cf6;"></i> Проект`;
    
    const projects = await DB.getProjects();
    const project = projects.find(p => p.id === id);
    if (!project) throw new Error('Проект не найден');

    this.body.innerHTML = `
      <div style="padding: 32px 40px; display: flex; flex-direction: column; gap: 24px;">
        <div style="font-size: 24px; font-weight: 800; color: var(--text-primary); line-height: 1.3;">${this.esc(project.name)}</div>
        <div style="font-size: 14px; color: var(--text-secondary); white-space: pre-wrap;">${this.esc(project.description || 'Нет описания')}</div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  },

  // Parses [[Target]] into clickable HTML links
  parseLinks(text, isHtmlAlready = false) {
    if (!text) return '';
    // Escape HTML only if not already HTML (like from marked)
    let html = isHtmlAlready ? text : this.esc(text);
    // Replace [[Link]] with styled clickable pill
    // Use positive lookahead/behind or just regex replacement
    html = html.replace(/\\[\\[(.*?)\\]\\]/g, (match, p1) => {
      // Find the best match across DB
      const query = p1.trim();
      return `<span class="obsidian-link" onclick="PeekView.searchAndOpen('${this.esc(query)}')" style="color: var(--accent); background: rgba(var(--accent-rgb), 0.1); padding: 2px 6px; border-radius: 4px; cursor: pointer; font-weight: 600; transition: all 0.2s; white-space: nowrap;"><i data-lucide="link-2" style="width:12px;height:12px;display:inline-block;margin-right:4px;margin-bottom:-2px;"></i>${this.esc(query)}</span>`;
    });
    return html;
  },

  async searchAndOpen(query) {
    const q = query.toLowerCase();
    
    // 1. Try exact match in tasks
    const tasks = await DB.getTasks();
    const task = tasks.find(t => t.title && t.title.toLowerCase() === q);
    if (task) return this.open('task', task.id);
    
    // 2. Try exact match in notes
    if (DB.getNotes) {
      const notes = await DB.getNotes();
      const note = notes.find(n => n.title && n.title.toLowerCase() === q);
      if (note) return this.open('note', note.id);
    }
    
    // 3. Try exact match in projects
    const projects = await DB.getProjects();
    const proj = projects.find(p => p.name && p.name.toLowerCase() === q);
    if (proj) return this.open('project', proj.id);
    
    UI.toast('Сущность "' + query + '" не найдена', 'warning');
  },

  esc(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  PeekView.init();
});
