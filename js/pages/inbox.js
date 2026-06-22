// ============================================
// INBOX PAGE — Quick Thought Dump
// ============================================

const InboxPage = {
  items: [],
  currentFilter: 'Все',

  render() {
    return `
      <div class="inbox-page" style="display:flex;flex-direction:column;height:100%;background:var(--bg-primary);">
        <div class="page-header" style="background:var(--bg-surface);padding:var(--space-lg) var(--space-xl);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:between;flex-shrink:0;">
          <div>
            <div class="page-title" style="font-size:20px;font-weight:700;">Входящие</div>
            <div class="page-subtitle" id="inbox-count-label" style="font-size:13px;color:var(--text-secondary);margin-top:2px;">Загрузка…</div>
          </div>
        </div>

        <div style="padding:var(--space-xl);display:flex;flex-direction:column;gap:var(--space-xl);flex:1;overflow-y:auto;">
          <!-- Quick add card -->
          <div style="background:var(--bg-surface);border:1px solid var(--border-light);border-radius:var(--radius-lg);padding:var(--space-lg);box-shadow:var(--shadow-sm);display:flex;flex-direction:column;gap:var(--space-md);">
            <div style="font-size:15px;font-weight:600;color:var(--text-primary);display:flex;align-items:center;justify-content:space-between;">
              <div style="display:flex;align-items:center;gap:var(--space-sm);"><i data-lucide="inbox"></i> Быстрый сброс мыслей</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:var(--space-sm);">
              <textarea id="inbox-add-input" class="form-input" placeholder="Запиши мысль, идею или напоминание..." style="flex:1;min-height:60px;resize:vertical;padding:12px;transition:all var(--transition);"></textarea>
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:12px;color:var(--text-muted);">Нажми Enter для отправки</div>
                <button id="inbox-add-btn" class="btn btn-primary" style="transition:transform 0.2s cubic-bezier(0.36, 0.07, 0.19, 0.97);">
                  <i data-lucide="pen-line" style="width:16px;height:16px;"></i> Записать
                </button>
              </div>
            </div>
          </div>

          <!-- Items list -->
          <div id="inbox-items-container" style="display:flex;flex-direction:column;gap:var(--space-sm);"></div>
        </div>
      </div>
    `;
  },

  async init() {
    this.bindEvents();
    await this.load();
  },

  bindEvents() {
    const input = document.getElementById('inbox-add-input');
    const btn = document.getElementById('inbox-add-btn');

    const handleAdd = async (e) => {
      if (e) e.preventDefault();
      const text = input.value.trim();
      if (!text) {
        btn.style.transform = 'translate3d(-4px, 0, 0)';
        setTimeout(() => btn.style.transform = 'translate3d(4px, 0, 0)', 50);
        setTimeout(() => btn.style.transform = 'translate3d(-4px, 0, 0)', 100);
        setTimeout(() => btn.style.transform = 'translate3d(4px, 0, 0)', 150);
        setTimeout(() => btn.style.transform = 'translate3d(0, 0, 0)', 200);
        input.focus();
        return;
      }
      
      const originalBtnHTML = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Запись...';
      btn.disabled = true;
      if (window.lucide) window.lucide.createIcons();

      try {
        await DB.addToInbox(text);
        input.value = '';
        UI.toast('Мысль сохранена!', 'success');
        await this.load();
      } catch (err) {
        UI.toast('Ошибка сохранения: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalBtnHTML;
        if (window.lucide) window.lucide.createIcons();
      }
    };

    btn.addEventListener('click', handleAdd);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleAdd();
      }
    });
  },

  async load() {
    try {
      this.items = await DB.getInbox(true); // Only unprocessed
      this.renderContent();
    } catch (e) {
      console.error(e);
    }
  },

  renderContent() {
    const container = document.getElementById('inbox-items-container');
    const countLabel = document.getElementById('inbox-count-label');

    if (this.items.length > 0) {
      countLabel.innerHTML = `${this.items.length} необработанных мыслей <button id="parse-all-btn" class="btn btn-sm btn-ghost" style="margin-left:8px;color:var(--accent-vibrant);"><i data-lucide="sparkles" style="width:14px;height:14px;"></i> Разобрать всё с ИИ</button>`;
      const parseAllBtn = document.getElementById('parse-all-btn');
      parseAllBtn.addEventListener('click', () => this.parseAllWithAI());
      if (window.lucide) window.lucide.createIcons({root: countLabel});
    } else {
      countLabel.textContent = `0 необработанных мыслей`;
    }

    if (this.items.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="text-align:center;padding:var(--space-2xl) 0;color:var(--text-muted);">
          <div class="empty-icon" style="margin-bottom:var(--space-md);display:flex;justify-content:center;opacity:0.6;"><i data-lucide="inbox" style="width:48px;height:48px;"></i></div>
          <div class="empty-text" style="font-size:16px;font-weight:600;color:var(--text-primary)">Входящие пусты</div>
          <div class="empty-subtext" style="font-size:13px;color:var(--text-secondary);margin-top:4px">Все мысли разобраны и превращены в дела!</div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons({root: container});
      return;
    }

    const allAreas = Array.from(new Set(this.items.map(item => item.area || 'Работа')));
    
    let filterHtml = '';
    if (allAreas.length > 1 || Config.currentArea === 'Все') {
      filterHtml = `
        <div style="display:flex;gap:8px;margin-bottom:var(--space-md);flex-wrap:wrap;">
          <button class="btn btn-sm inbox-filter-pill ${this.currentFilter === 'Все' ? 'btn-primary' : 'btn-ghost'}" data-area="Все" style="border-radius:100px;">Все</button>
          ${allAreas.map(area => `
            <button class="btn btn-sm inbox-filter-pill ${this.currentFilter === area ? 'btn-primary' : 'btn-ghost'}" data-area="${this.escapeHtml(area)}" style="border-radius:100px;">${this.escapeHtml(area)}</button>
          `).join('')}
        </div>
      `;
    }

    const groupedItems = {};
    this.items.forEach(item => {
      const area = item.area || 'Работа';
      if (this.currentFilter !== 'Все' && area !== this.currentFilter) return;
      if (!groupedItems[area]) groupedItems[area] = [];
      groupedItems[area].push(item);
    });

    let html = filterHtml;
    const showHeaders = true; // Always show headers

    for (const [area, items] of Object.entries(groupedItems)) {
      if (showHeaders) {
        html += `<div style="font-size:14px;font-weight:700;color:var(--text-secondary);margin-top:var(--space-md);margin-bottom:var(--space-xs);padding-left:4px;display:flex;align-items:center;gap:6px;">
          <i data-lucide="target" style="width:14px;height:14px;"></i> ${this.escapeHtml(area)}
        </div>`;
      }
      html += items.map(item => `
      <div class="inbox-card" style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:var(--space-md);display:flex;align-items:center;justify-content:space-between;gap:var(--space-md);transition:all var(--transition);animation:fadeInUp 0.2s ease;margin-bottom:var(--space-sm);">
        <div style="font-size:14px;color:var(--text-primary);line-height:1.5;flex:1;word-break:break-word;white-space:pre-wrap;">${this.escapeHtml(item.content)}</div>
        <div style="display:flex;flex-direction:column;gap:var(--space-xs);flex-shrink:0;">
          <div style="display:flex;gap:var(--space-xs);">
            <button class="btn btn-sm btn-ghost parse-ai-btn" data-id="${item.id}" data-content="${this.escapeHtml(item.content)}" style="color:var(--accent-vibrant);" title="Разобрать с ИИ">
              <i data-lucide="sparkles" style="width:16px;height:16px;"></i> ИИ
            </button>
            <button class="btn btn-sm btn-secondary process-btn" data-id="${item.id}" title="Отметить обработанным">
              <i data-lucide="check" style="width:16px;height:16px;"></i>
            </button>
          </div>
          <div style="display:flex;gap:var(--space-xs);">
            <button class="btn btn-sm btn-secondary convert-task-btn" data-id="${item.id}" data-content="${this.escapeHtml(item.content)}" title="Создать задачу вручную">
              <i data-lucide="check-square" style="width:16px;height:16px;"></i>
            </button>
            <button class="btn btn-sm btn-ghost delete-inbox-btn" data-id="${item.id}" style="color:var(--danger);" title="Удалить">
              <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
            </button>
          </div>
        </div>
      </div>
      `).join('');
    }

    container.innerHTML = html;

    // Bind filter pills
    container.querySelectorAll('.inbox-filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentFilter = btn.dataset.area;
        this.renderContent();
      });
    });

    // Bind item buttons
    container.querySelectorAll('.process-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await this.processItem(id);
      });
    });

    container.querySelectorAll('.delete-inbox-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await this.deleteItem(id);
      });
    });

    container.querySelectorAll('.parse-ai-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const content = btn.dataset.content;
        const origHTML = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i>';
        if(window.lucide) window.lucide.createIcons({root: btn});
        await this.parseItemWithAI(id, content);
      });
    });

    container.querySelectorAll('.convert-task-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const content = btn.dataset.content;
        this.convertToTask(id, content);
      });
    });

    if(window.lucide) window.lucide.createIcons({root: container});
  },

  async parseAllWithAI() {
    const btn = document.getElementById('parse-all-btn');
    if(btn) {
      btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Обработка...';
      btn.disabled = true;
      if(window.lucide) window.lucide.createIcons({root: btn});
    }
    UI.toast(`Отправлено ${this.items.length} мыслей на обработку ИИ...`, 'info', 4000);
    
    // Process them sequentially to avoid rate limits
    for (const item of this.items) {
      await this.parseItemWithAI(item.id, item.content, false);
    }
    
    UI.toast('Все мысли обработаны!', 'success');
    await this.load();
  },

  async parseItemWithAI(id, content, reload = true) {
    try {
      const parsedItems = await Gemini.parseInboxItem(content);
      if (!Array.isArray(parsedItems)) throw new Error('Некорректный ответ от ИИ');
      
      let createdCount = 0;
      for (const item of parsedItems) {
        if (item.type === 'task') {
          await DB.createTask({
            title: item.title,
            deadline: item.deadline,
            priority: item.priority || 'Средний'
          });
          createdCount++;
        } else if (item.type === 'event') {
          await DB.createEvent({
            title: item.title,
            start_at: item.start_at,
            end_at: item.end_at,
            notes: item.notes || ''
          });
          createdCount++;
        } else if (item.type === 'note') {
          await DB.createNote({
            title: item.title,
            content: item.content,
            tags: item.tags || []
          });
          createdCount++;
        } else if (item.type === 'project') {
          await DB.createProject({
            name: item.name,
            deadline: item.deadline || null
          });
          createdCount++;
        }
      }

      await DB.updateInboxItem(id, { processed: true });
      if (reload) {
        UI.toast(`Разобрано! Создано объектов: ${createdCount}`, 'success');
        await this.load();
      }
    } catch (e) {
      console.error(e);
      if (reload) UI.toast('Ошибка разбора ИИ: ' + e.message, 'error');
    }
  },

  async processItem(id) {
    try {
      await DB.updateInboxItem(id, { processed: true });
      UI.toast('Отмечено как обработанное', 'success');
      await this.load();
    } catch (e) {
      UI.toast('Ошибка: ' + e.message, 'error');
    }
  },

  async deleteItem(id) {
    if (!confirm('Удалить эту запись из входящих?')) return;
    try {
      await DB.deleteInboxItem(id);
      UI.toast('Удалено', 'info');
      await this.load();
    } catch (e) {
      UI.toast('Ошибка: ' + e.message, 'error');
    }
  },

  convertToTask(id, content) {
    // Navigate to tasks and open task modal with prefilled data
    App.navigateTo('tasks').then(() => {
      TasksPage.openTaskModal(null, { title: content });
      DB.updateInboxItem(id, { processed: true }).catch(console.error);
    });
  },

  escapeHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
