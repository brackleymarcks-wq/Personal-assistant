window.CommandPalette = {
  modal: null,
  input: null,
  resultsEl: null,
  isOpen: false,
  debounceTimer: null,
  
  init() {
    this.modal = document.getElementById('cmd-palette-modal');
    this.input = document.getElementById('cmd-palette-input');
    this.resultsEl = document.getElementById('cmd-palette-results');
    
    if (!this.modal) return;

    // Listen for Ctrl+K
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.code === 'KeyK')) {
        e.preventDefault();
        this.toggle();
      }
      
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Close on click outside
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    // Handle input
    this.input.addEventListener('input', (e) => {
      clearTimeout(this.debounceTimer);
      const query = e.target.value.trim();
      
      if (!query) {
        this.resultsEl.innerHTML = `<div style="padding: 12px 20px; color: var(--text-muted); font-size: 13px; text-align: center;">Начните вводить текст...</div>`;
        return;
      }
      
      this.debounceTimer = setTimeout(() => this.search(query), 300);
    });
  },

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  },

  open() {
    this.isOpen = true;
    this.modal.classList.remove('hidden');
    this.modal.style.display = 'flex';
    this.input.value = '';
    this.input.focus();
    this.resultsEl.innerHTML = `<div style="padding: 12px 20px; color: var(--text-muted); font-size: 13px; text-align: center;">Начните вводить текст...</div>`;
  },

  close() {
    this.isOpen = false;
    this.modal.classList.add('hidden');
    this.modal.style.display = 'none';
  },

  async search(query) {
    this.resultsEl.innerHTML = `
      <div style="padding: 20px; text-align: center; color: var(--accent);">
        <i data-lucide="loader-2" class="spin" style="width:20px;height:20px;"></i>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();

    try {
      const q = query.toLowerCase();
      
      // 1. Fetch Knowledge Base
      const knowledge = await DB.getKnowledge({ search: q });
      
      // 2. Fetch Tasks (client-side filter for now)
      const allTasks = await DB.getTasks();
      const tasks = allTasks.filter(t => 
        (t.title && t.title.toLowerCase().includes(q)) || 
        (t.description && t.description.toLowerCase().includes(q))
      );
      
      // 3. Fetch Goals
      let goals = [];
      if (DB.getGoals) {
        const allGoals = await DB.getGoals();
        goals = allGoals.filter(g => g.title && g.title.toLowerCase().includes(q));
      }

      this.renderResults({ knowledge, tasks, goals }, query);
    } catch (e) {
      console.error('Search error:', e);
      this.resultsEl.innerHTML = `<div style="padding: 12px 20px; color: var(--danger); font-size: 13px; text-align: center;">Ошибка поиска</div>`;
    }
  },

  renderResults({ knowledge, tasks, goals }, query) {
    let html = '';
    const total = knowledge.length + tasks.length + goals.length;
    
    if (total === 0) {
      this.resultsEl.innerHTML = `<div style="padding: 12px 20px; color: var(--text-muted); font-size: 13px; text-align: center;">Ничего не найдено по запросу "${query}"</div>`;
      return;
    }

    // Tasks Section
    if (tasks.length > 0) {
      html += `<div style="padding: 8px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; background: rgba(0,0,0,0.02);">Задачи</div>`;
      tasks.forEach(t => {
        html += `
          <div class="cmd-item" onclick="CommandPalette.openItem('task', '${t.id}')" style="padding: 10px 20px; cursor: pointer; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border-light);">
            <i data-lucide="check-square" style="width: 16px; height: 16px; color: var(--accent);"></i>
            <div style="flex:1;">
              <div style="font-size: 14px; color: var(--text-primary); font-weight: 500;">${this.esc(t.title)}</div>
              <div style="font-size: 12px; color: var(--text-muted);">${t.status}</div>
            </div>
          </div>
        `;
      });
    }

    // Knowledge Section
    if (knowledge.length > 0) {
      html += `<div style="padding: 8px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; background: rgba(0,0,0,0.02);">База знаний</div>`;
      knowledge.forEach(k => {
        html += `
          <div class="cmd-item" onclick="CommandPalette.openItem('knowledge', '${k.id}')" style="padding: 10px 20px; cursor: pointer; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border-light);">
            <i data-lucide="file-text" style="width: 16px; height: 16px; color: #10b981;"></i>
            <div style="flex:1;">
              <div style="font-size: 14px; color: var(--text-primary); font-weight: 500;">${this.esc(k.title)}</div>
              <div style="font-size: 12px; color: var(--text-muted);">${k.folder || 'Общее'} • ${k.type}</div>
            </div>
          </div>
        `;
      });
    }

    // Goals Section
    if (goals.length > 0) {
      html += `<div style="padding: 8px 20px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; background: rgba(0,0,0,0.02);">Цели</div>`;
      goals.forEach(g => {
        html += `
          <div class="cmd-item" onclick="CommandPalette.openItem('goal', '${g.id}')" style="padding: 10px 20px; cursor: pointer; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border-light);">
            <i data-lucide="target" style="width: 16px; height: 16px; color: #f59e0b;"></i>
            <div style="flex:1;">
              <div style="font-size: 14px; color: var(--text-primary); font-weight: 500;">${this.esc(g.title)}</div>
            </div>
          </div>
        `;
      });
    }

    this.resultsEl.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
    
    // Add hover effect via JS since we don't have CSS class yet
    const items = this.resultsEl.querySelectorAll('.cmd-item');
    items.forEach(item => {
      item.addEventListener('mouseenter', () => item.style.backgroundColor = 'var(--bg-body)');
      item.addEventListener('mouseleave', () => item.style.backgroundColor = 'transparent');
    });
  },

  openItem(type, id) {
    this.close();
    
    // Switch to appropriate tab
    const tabs = {
      'task': 'tasks',
      'knowledge': 'knowledge',
      'goal': 'goals'
    };
    
    if (tabs[type] && typeof window.switchTab === 'function') {
      window.switchTab(tabs[type]);
    }
    
    // Wait for tab to switch then open item
    setTimeout(() => {
      if (type === 'task' && window.TasksPage) {
        TasksPage.editTask(id);
      } else if (type === 'knowledge' && window.KnowledgePage) {
        KnowledgePage.openItem(id);
      } else if (type === 'goal' && window.GoalsPage) {
        // Assume GoalsPage has a method to open or highlight
      }
    }, 100);
  },

  esc(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  CommandPalette.init();
});
