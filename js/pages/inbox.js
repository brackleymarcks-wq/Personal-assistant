// ============================================
// INBOX PAGE — Quick Thought Dump
// ============================================

const InboxPage = {
  items: [],

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
            <div style="font-size:15px;font-weight:600;color:var(--text-primary);">📥 Быстрый сброс мыслей</div>
            <div style="display:flex;gap:var(--space-sm);">
              <input id="inbox-add-input" type="text" class="form-input" placeholder="Запиши мысль, идею или напоминание..." style="flex:1;" />
              <button id="inbox-add-btn" class="btn btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                Записать
              </button>
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

    const handleAdd = async () => {
      const text = input.value.trim();
      if (!text) return;
      try {
        await DB.addToInbox(text);
        input.value = '';
        UI.toast('Мысль сохранена!', 'success');
        await this.load();
      } catch (e) {
        UI.toast('Ошибка сохранения: ' + e.message, 'error');
      }
    };

    btn.addEventListener('click', handleAdd);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAdd();
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

    countLabel.textContent = `${this.items.length} необработанных мыслей`;

    if (this.items.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="text-align:center;padding:var(--space-2xl) 0;color:var(--text-muted);">
          <div class="empty-icon" style="font-size:48px;margin-bottom:var(--space-md)">📥</div>
          <div class="empty-text" style="font-size:16px;font-weight:600;color:var(--text-primary)">Входящие пусты</div>
          <div class="empty-subtext" style="font-size:13px;color:var(--text-secondary);margin-top:4px">Все мысли разобраны и превращены в дела!</div>
        </div>
      `;
      return;
    }

    container.innerHTML = this.items.map(item => `
      <div class="inbox-card" style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:var(--space-md);display:flex;align-items:center;justify-content:space-between;gap:var(--space-md);transition:all var(--transition);animation:fadeInUp 0.2s ease;">
        <div style="font-size:14px;color:var(--text-primary);line-height:1.5;flex:1;word-break:break-word;">
          ${this.escapeHtml(item.content)}
        </div>
        <div style="display:flex;gap:var(--space-xs);flex-shrink:0;">
          <button class="btn btn-sm btn-secondary convert-task-btn" data-id="${item.id}" data-content="${this.escapeHtml(item.content)}" title="Создать задачу">
            📋 Задачу
          </button>
          <button class="btn btn-sm btn-secondary process-btn" data-id="${item.id}" title="Отметить обработанным">
            ✓ Ок
          </button>
          <button class="btn btn-sm btn-ghost delete-inbox-btn" data-id="${item.id}" style="color:var(--danger);" title="Удалить">
            🗑
          </button>
        </div>
      </div>
    `).join('');

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

    container.querySelectorAll('.convert-task-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const content = btn.dataset.content;
        this.convertToTask(id, content);
      });
    });
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
      // When task is saved successfully, we can mark the inbox item as processed.
      // For simplicity, we just mark it processed immediately when task modal opens, 
      // or we can let them save it manually. Let's mark it processed so it goes away from inbox!
      DB.updateInboxItem(id, { processed: true }).catch(console.error);
    });
  },

  escapeHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
