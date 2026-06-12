// ============================================
// KNOWLEDGE BASE PAGE
// ============================================

const KnowledgePage = {
  items: [],
  filters: { type: '', search: '', tag: '' },

  TYPES: ['Промт', 'Инструмент', 'Статья', 'Кейс', 'Урок', 'Заметка'],
  TYPE_CLASS: {
    'Промт': 'type-prompt',
    'Инструмент': 'type-tool',
    'Статья': 'type-article',
    'Кейс': 'type-case',
    'Урок': 'type-lesson',
    'Заметка': 'type-note'
  },
  TYPE_ICONS: {
    'Промт': '🤖', 'Инструмент': '🔧', 'Статья': '📰',
    'Кейс': '💼', 'Урок': '🎓', 'Заметка': '📝'
  },

  render() {
    return `
      <div class="knowledge-page">
        <div class="page-header">
          <div>
            <div class="page-title">База знаний</div>
            <div class="page-subtitle" id="knowledge-count-label">Загрузка…</div>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" id="add-knowledge-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Новая запись
            </button>
          </div>
        </div>

        <div class="knowledge-toolbar">
          <div class="search-input-wrapper" style="flex:1;min-width:200px">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input id="knowledge-search" type="text" class="form-input search-input" placeholder="Поиск по названию и содержимому…" />
          </div>
          <select id="knowledge-type-filter" class="form-input filter-select">
            <option value="">Все типы</option>
            ${this.TYPES.map(t => `<option value="${t}">${this.TYPE_ICONS[t]} ${t}</option>`).join('')}
          </select>
        </div>

        <div class="knowledge-grid" id="knowledge-grid"></div>
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
    this.items = await DB.getKnowledge();
    this.renderGrid();
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
    document.getElementById('knowledge-count-label').textContent =
      `${this.items.length} записей · показано ${filtered.length}`;

    const grid = document.getElementById('knowledge-grid');

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="empty-state">
        <div class="empty-icon">📚</div>
        <div class="empty-text">Записей не найдено</div>
        <div class="empty-subtext">Создай первую запись или измени фильтры</div>
      </div>`;
      return;
    }

    grid.innerHTML = filtered.map(item => this.renderCard(item)).join('');
    grid.querySelectorAll('.knowledge-card').forEach(card => {
      card.addEventListener('click', () => this.openModal(card.dataset.id));
    });
  },

  renderCard(item) {
    const preview = (item.content || '').replace(/[#*`_\[\]]/g, '').trim();
    const tags = (item.tags || []).slice(0, 4);
    const date = new Date(item.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

    return `
      <div class="knowledge-card" data-id="${item.id}">
        <div class="knowledge-card-type ${this.TYPE_CLASS[item.type] || 'type-note'}">
          ${this.TYPE_ICONS[item.type] || '📝'} ${item.type || 'Заметка'}
        </div>
        <div class="knowledge-card-title">${this.esc(item.title)}</div>
        ${preview ? `<div class="knowledge-card-preview">${this.esc(preview)}</div>` : ''}
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:var(--space-sm)">
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
    document.getElementById('knowledge-modal-title').textContent = item ? 'Редактировать запись' : 'Новая запись';
    document.getElementById('knowledge-modal-delete').style.display = item ? '' : 'none';

    const tagsValue = (item?.tags || []).join(', ');

    document.getElementById('knowledge-modal-body').innerHTML = `
      <div class="form-group">
        <label class="form-label">Заголовок *</label>
        <input id="kf-title" type="text" class="form-input" value="${item ? this.esc(item.title) : ''}" placeholder="Название записи" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Тип</label>
          <select id="kf-type" class="form-input">
            ${this.TYPES.map(t => `<option value="${t}" ${(item?.type||'Заметка')===t?'selected':''}>${this.TYPE_ICONS[t]} ${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Теги (через запятую)</label>
          <input id="kf-tags" type="text" class="form-input" value="${this.esc(tagsValue)}" placeholder="ии, анализ, работа" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Содержимое (Markdown)</label>
        <textarea id="kf-content" class="form-input" style="min-height:280px;font-family:var(--font-mono);font-size:13px">${item ? this.esc(item.content || '') : ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Источник (URL)</label>
        <input id="kf-source" type="url" class="form-input" value="${item ? this.esc(item.source_url || '') : ''}" placeholder="https://…" />
      </div>
    `;

    const close = () => modal.classList.add('hidden');
    document.getElementById('knowledge-modal-save').onclick = () => this.saveItem(item?.id);
    document.getElementById('knowledge-modal-cancel').onclick = close;
    document.getElementById('knowledge-modal-close').onclick = close;
    document.getElementById('knowledge-modal-delete').onclick = () => this.deleteItem(item?.id);
    modal.onclick = (e) => { if (e.target === modal) close(); };

    document.getElementById('kf-title').focus();
    modal.classList.remove('hidden');
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
