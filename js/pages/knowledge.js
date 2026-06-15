// ============================================
// KNOWLEDGE BASE PAGE
// ============================================

const KnowledgePage = {
  items: [],
  filters: { type: '', search: '', tag: '' },

  TYPES: ['Промт', 'Инструмент', 'Статья', 'Кейс', 'Урок', 'Заметка', 'Документ'],
  TYPE_CLASS: {
    'Промт': 'type-prompt',
    'Инструмент': 'type-tool',
    'Статья': 'type-article',
    'Кейс': 'type-case',
    'Урок': 'type-lesson',
    'Заметка': 'type-note',
    'Документ': 'type-document'
  },
  TYPE_ICONS: {
    'Промт': 'bot', 'Инструмент': 'wrench', 'Статья': 'newspaper',
    'Кейс': 'briefcase', 'Урок': 'graduation-cap', 'Заметка': 'edit-3',
    'Документ': 'file-text'
  },

  render() {
    return `
      <div class="knowledge-page" style="display:flex;flex-direction:column;height:100%;background:var(--bg-primary);">
        <div class="page-header" style="background:var(--bg-surface);padding:var(--space-lg) var(--space-xl);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
          <div>
            <div class="page-title" style="font-size:20px;font-weight:700;">База знаний</div>
            <div class="page-subtitle" id="knowledge-count-label" style="font-size:13px;color:var(--text-secondary);margin-top:2px;">Загрузка…</div>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" id="add-knowledge-btn" style="display:flex;align-items:center;gap:6px;">
              <i data-lucide="plus"></i>
              Новая запись
            </button>
          </div>
        </div>

        <div class="knowledge-toolbar">
          <div class="search-input-wrapper" style="flex:1;min-width:200px">
            <i data-lucide="search" class="search-icon" style="width:16px;height:16px;"></i>
            <input id="knowledge-search" type="text" class="form-input search-input" placeholder="Поиск по названию и содержимому…" />
          </div>
          <select id="knowledge-type-filter" class="form-input filter-select">
            <option value="">Все типы</option>
            ${this.TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>

        <div style="flex:1;overflow-y:auto;">
          <div class="knowledge-grid" id="knowledge-grid"></div>
        </div>
      </div>
    `;
  },

  async init() {
    document.getElementById('add-knowledge-btn').addEventListener('click', () => this.openModal());

    const search = document.getElementById('knowledge-search');
    let timer;
    search.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { this.filters.search = search.value; this.renderGrid(); }, 300);
    });

    document.getElementById('knowledge-type-filter').addEventListener('change', (e) => {
      this.filters.type = e.target.value;
      this.renderGrid();
    });

    await this.load();
  },

  async load() {
    try {
      this.items = await DB.getKnowledge();
      this.renderGrid();
    } catch (e) {
      console.error('Knowledge load error:', e);
    }
  },

  getFiltered() {
    return this.items.filter(item => {
      if (this.filters.type && item.type !== this.filters.type) return false;
      if (this.filters.search) {
        const s = this.filters.search.toLowerCase();
        if (!item.title.toLowerCase().includes(s) && !(item.content || '').toLowerCase().includes(s)) return false;
      }
      return true;
    });
  },

  renderGrid() {
    const filtered = this.getFiltered();
    const countLabel = document.getElementById('knowledge-count-label');
    if (countLabel) {
      countLabel.textContent = `${this.items.length} записей · показано ${filtered.length}`;
    }

    const grid = document.getElementById('knowledge-grid');

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;text-align:center;padding:var(--space-3xl) 0;color:var(--text-muted);display:flex;flex-direction:column;align-items:center;gap:var(--space-md);">
          <i data-lucide="library" style="width:48px;height:48px;color:var(--border-light);"></i>
          <div class="empty-text" style="font-size:16px;font-weight:600;color:var(--text-primary)">Записей не найдено</div>
          <div class="empty-subtext" style="font-size:13px;color:var(--text-secondary);">Создай первую запись или загрузи текстовый документ</div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    grid.innerHTML = filtered.map(item => this.renderCard(item)).join('');
    grid.querySelectorAll('.knowledge-card').forEach(card => {
      card.addEventListener('click', () => this.openModal(card.dataset.id));
    });

    if (window.lucide) window.lucide.createIcons();
  },

  renderCard(item) {
    const preview = (item.content || '').replace(/[#*`_\[\]]/g, '').trim();
    const tags = (item.tags || []).slice(0, 4);
    const date = new Date(item.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    const icon = this.TYPE_ICONS[item.type] || 'file';

    return `
      <div class="knowledge-card" data-id="${item.id}">
        <div class="knowledge-card-type ${this.TYPE_CLASS[item.type] || 'type-note'}">
          <i data-lucide="${icon}" style="width:12px;height:12px;"></i> ${item.type || 'Заметка'}
        </div>
        <div class="knowledge-card-title">${this.esc(item.title)}</div>
        ${preview ? `<div class="knowledge-card-preview">${this.esc(preview)}</div>` : ''}
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:var(--space-sm);">
          <div class="knowledge-tags">
            ${tags.map(tag => `<span class="knowledge-tag">${this.esc(tag)}</span>`).join('')}
          </div>
          <span style="font-size:11px;color:var(--text-muted)">${date}</span>
        </div>
      </div>
    `;
  },

  openModal(itemId = null) {
    const item = itemId ? this.items.find(i => i.id === itemId) : null;
    const modal = document.getElementById('knowledge-modal');
    
    document.getElementById('knowledge-modal-title').innerHTML = item 
      ? '<i data-lucide="edit"></i> Редактировать запись' 
      : '<i data-lucide="plus-circle"></i> Новая запись';
      
    document.getElementById('knowledge-modal-delete').style.display = item ? '' : 'none';

    const tagsValue = (item?.tags || []).join(', ');

    // Hidden file input for uploading documents
    const fileInputHtml = !item ? `
      <div style="margin-bottom:var(--space-md);">
        <input type="file" id="kf-file-upload" accept=".txt,.md,.csv,.js,.py,.html,.json" style="display:none;" />
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('kf-file-upload').click()" style="display:flex;align-items:center;gap:6px;width:100%;justify-content:center;">
          <i data-lucide="upload-cloud"></i>
          Загрузить текст из файла (TXT, MD, CSV, Код)
        </button>
      </div>
    ` : '';

    document.getElementById('knowledge-modal-body').innerHTML = `
      ${fileInputHtml}
      <div class="form-group">
        <label class="form-label">Заголовок *</label>
        <input id="kf-title" type="text" class="form-input" value="${item ? this.esc(item.title) : ''}" placeholder="Название записи" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Тип</label>
          <select id="kf-type" class="form-input">
            ${this.TYPES.map(t => `<option value="${t}" ${(item?.type||'Заметка')===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Теги (через запятую)</label>
          <input id="kf-tags" type="text" class="form-input" value="${this.esc(tagsValue)}" placeholder="ии, анализ, работа" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Содержимое (Markdown)</label>
        <textarea id="kf-content" class="form-input" style="min-height:280px;font-family:var(--font-mono);font-size:13px;line-height:1.5;">${item ? this.esc(item.content || '') : ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Источник (URL)</label>
        <input id="kf-source" type="url" class="form-input" value="${item ? this.esc(item.source_url || '') : ''}" placeholder="https://…" />
      </div>
    `;

    // Bind file upload logic
    if (!item) {
      document.getElementById('kf-file-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          document.getElementById('kf-title').value = file.name;
          document.getElementById('kf-type').value = 'Документ';
          document.getElementById('kf-content').value = ev.target.result;
          UI.toast('Файл загружен', 'success');
        };
        reader.readAsText(file);
      });
    }

    const close = () => modal.classList.add('hidden');
    document.getElementById('knowledge-modal-save').onclick = () => this.saveItem(item?.id);
    document.getElementById('knowledge-modal-cancel').onclick = close;
    document.getElementById('knowledge-modal-close').onclick = close;
    document.getElementById('knowledge-modal-delete').onclick = () => this.deleteItem(item?.id);
    modal.onclick = (e) => { if (e.target === modal) close(); };

    if (window.lucide) window.lucide.createIcons();

    modal.classList.remove('hidden');
    document.getElementById('kf-title').focus();
  },

  async saveItem(id = null) {
    const title = document.getElementById('kf-title').value.trim();
    if (!title) { UI.toast('Введи заголовок', 'warning'); return; }

    const tagsRaw = document.getElementById('kf-tags').value;
    const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

    const data = {
      title,
      type: document.getElementById('kf-type').value,
      content: document.getElementById('kf-content').value,
      tags,
      source_url: document.getElementById('kf-source').value || null
    };

    try {
      if (id) {
        const updated = await DB.updateKnowledge(id, data);
        const idx = this.items.findIndex(i => i.id === id);
        if (idx >= 0) this.items[idx] = { ...this.items[idx], ...updated };
        UI.toast('Запись обновлена', 'success');
      } else {
        const created = await DB.createKnowledge(data);
        this.items.unshift(created);
        UI.toast('Запись сохранена', 'success');
      }
      document.getElementById('knowledge-modal').classList.add('hidden');
      this.renderGrid();
    } catch (e) {
      UI.toast('Ошибка: ' + e.message, 'error');
    }
  },

  async deleteItem(id) {
    if (!confirm('Удалить запись?')) return;
    await DB.deleteKnowledge(id);
    this.items = this.items.filter(i => i.id !== id);
    document.getElementById('knowledge-modal').classList.add('hidden');
    this.renderGrid();
    UI.toast('Запись удалена', 'info');
  },

  esc(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
