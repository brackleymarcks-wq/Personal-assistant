// ============================================
// KNOWLEDGE BASE PAGE
// ============================================

const KnowledgePage = {
  items: [],
  activeItemId: null,
  filters: { type: '', search: '', tag: '' },

  TYPES: ['Промт', 'Инструмент', 'Статья', 'Кейс', 'Урок', 'Заметка', 'Документ'],
  TYPE_ICONS: {
    'Промт': 'bot', 'Инструмент': 'wrench', 'Статья': 'newspaper',
    'Кейс': 'briefcase', 'Урок': 'graduation-cap', 'Заметка': 'edit-3',
    'Документ': 'file-text'
  },

  render() {
    return `
      <div class="knowledge-page" style="display:flex; height:100%; background:var(--bg-primary); overflow:hidden;">
        
        <!-- Sidebar -->
        <div class="knowledge-sidebar" style="width:320px; background:rgba(var(--bg-surface-rgb), 0.5); border-right:1px solid var(--border-light); display:flex; flex-direction:column; flex-shrink:0;">
          <div style="padding:var(--space-xl) var(--space-xl) var(--space-md); display:flex; flex-direction:column; gap:var(--space-md);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div class="page-title" style="font-size:20px; font-weight:700;">База знаний</div>
              <button class="btn btn-primary btn-icon" onclick="KnowledgePage.createNewItem()" title="Новая запись" style="width:32px;height:32px;border-radius:8px;">
                <i data-lucide="plus" style="width:16px;height:16px;"></i>
              </button>
            </div>
            <div class="search-input-wrapper">
              <i data-lucide="search" class="search-icon" style="width:14px;height:14px;"></i>
              <input type="text" id="kb-search" class="form-input search-input" placeholder="Поиск по базе..." oninput="KnowledgePage.handleSearch(event)" style="font-size:13px; padding-left:32px; border-radius:8px;" />
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <i data-lucide="filter" style="width:14px;height:14px;color:var(--text-muted);"></i>
              <select class="form-input" onchange="KnowledgePage.setFilterType(this.value)" style="flex:1; border:none; background:transparent; font-size:13px; color:var(--text-primary); outline:none; padding:4px 0; cursor:pointer;">
                <option value="">Все типы</option>
                ${this.TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </div>
          </div>
          <div id="kb-sidebar-list" style="flex:1; overflow-y:auto; padding:0 var(--space-md) var(--space-xl); display:flex; flex-direction:column; gap:4px;">
            <!-- List items -->
          </div>
        </div>
        
        <!-- Editor Pane -->
        <div id="kb-editor-pane" style="flex:1; display:flex; flex-direction:column; position:relative; background:var(--bg-default);">
          <!-- Rendered dynamically -->
        </div>

      </div>
    `;
  },

  async init() {
    await this.load();
  },

  async load() {
    try {
      this.items = await DB.getKnowledge();
      this.renderSidebar();
      if (this.items.length > 0 && !this.activeItemId) {
        this.openItem(this.items[0].id);
      } else if (this.activeItemId) {
        this.openItem(this.activeItemId);
      } else {
        document.getElementById('kb-editor-pane').innerHTML = this.renderEmptyEditor();
      }
    } catch (e) {
      console.error('Knowledge load error:', e);
    }
  },

  handleSearch(e) {
    this.filters.search = e.target.value.toLowerCase();
    this.renderSidebar();
  },

  setFilterType(type) {
    this.filters.type = type;
    this.renderSidebar();
  },

  getFiltered() {
    return this.items.filter(item => {
      if (this.filters.type && item.type !== this.filters.type) return false;
      if (this.filters.search) {
        const s = this.filters.search;
        if (!item.title.toLowerCase().includes(s) && !(item.content || '').toLowerCase().includes(s)) return false;
      }
      return true;
    });
  },

  renderSidebar() {
    const listEl = document.getElementById('kb-sidebar-list');
    if (!listEl) return;
    const filtered = this.getFiltered();

    if (filtered.length === 0) {
      listEl.innerHTML = `<div style="text-align:center; padding:40px 20px; color:var(--text-muted); font-size:13px;">Ничего не найдено</div>`;
      return;
    }

    listEl.innerHTML = filtered.map(item => {
      const isSelected = item.id === this.activeItemId;
      const icon = this.TYPE_ICONS[item.type] || 'file-text';
      
      let dateObj = item.updated_at ? new Date(item.updated_at) : (item.created_at ? new Date(item.created_at) : new Date());
      if (isNaN(dateObj.getTime())) dateObj = new Date();
      const date = dateObj.toLocaleDateString('ru-RU', { day:'numeric', month:'short' });
      
      return `
        <div class="kb-list-item ${isSelected ? 'active' : ''}" onclick="KnowledgePage.openItem('${item.id}')" style="padding:12px; border-radius:12px; cursor:pointer; display:flex; flex-direction:column; gap:6px; background:${isSelected ? 'var(--bg-surface)' : 'transparent'}; border:1px solid ${isSelected ? 'var(--border-light)' : 'transparent'}; transition:all 0.2s;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
            <div style="font-size:14px; font-weight:600; color:var(--text-primary); line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${this.esc(item.title)}</div>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; font-size:11px; color:var(--text-muted);">
            <div style="display:flex; align-items:center; gap:4px;">
              <i data-lucide="${icon}" style="width:12px;height:12px;"></i>
              ${item.type || 'Заметка'}
            </div>
            <span>${date}</span>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  },

  renderEmptyEditor() {
    return `
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--text-muted); gap:16px;">
        <i data-lucide="library" style="width:48px;height:48px;color:var(--border-light);"></i>
        <div style="font-size:16px;font-weight:600;color:var(--text-primary);">Выберите документ</div>
        <div style="font-size:13px;">или создайте новую запись</div>
        <button class="btn btn-primary" onclick="KnowledgePage.createNewItem()">
          <i data-lucide="plus" style="width:16px;height:16px;"></i> Новая запись
        </button>
      </div>
    `;
  },

  openItem(id) {
    if (this.activeItemId && this.activeItemId !== id) {
      this.saveActiveItem(true);
    }
    this.activeItemId = id;
    this.renderSidebar();
    
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    this.renderEditor(item);
  },

  createNewItem() {
    if (this.activeItemId) {
      this.saveActiveItem(true);
    }
    
    const newItem = {
      id: 'new-' + Date.now(),
      title: '',
      content: '',
      type: 'Заметка',
      tags: [],
      source_url: '',
      isNew: true
    };
    
    this.activeItemId = newItem.id;
    this.items.unshift(newItem);
    
    // Clear filters to show new item at top
    this.filters.search = '';
    const searchInput = document.getElementById('kb-search');
    if(searchInput) searchInput.value = '';
    
    this.renderSidebar();
    this.renderEditor(newItem);
  },

  renderEditor(item) {
    const pane = document.getElementById('kb-editor-pane');
    if (!pane) return;
    
    const tagsStr = item.tags ? item.tags.join(', ') : '';
    
    pane.innerHTML = `
      <div class="kb-editor-header" style="padding: var(--space-xl) var(--space-2xl); border-bottom: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between; background: rgba(var(--bg-surface-rgb), 0.5);">
        <div style="display:flex; align-items:center; gap: 16px;">
          <div style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:6px;">
            <i data-lucide="clock" style="width:14px;height:14px;"></i>
            ${item.isNew ? 'Новая запись' : 'Изменено: ' + new Date(item.updated_at || item.created_at).toLocaleString('ru-RU', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
          </div>
        </div>
        <div class="kb-editor-actions" style="display:flex;gap:var(--space-sm);">
          <button class="btn btn-icon" onclick="KnowledgePage.deleteActiveItem()" title="${item.isNew ? 'Отменить создание' : 'Удалить документ'}" style="background:var(--bg-surface);border:1px solid var(--border-light);">
            <i data-lucide="trash-2" style="color:var(--danger);width:16px;height:16px;"></i>
          </button>
          <button class="btn btn-secondary" onclick="document.getElementById('kb-file-upload').click()" title="Загрузить текст из файла (TXT, MD, CSV, JS и др.)" style="display:flex;align-items:center;gap:6px;">
            <i data-lucide="upload-cloud" style="width:16px;height:16px;"></i>
            Загрузить файл
          </button>
          <input type="file" id="kb-file-upload" accept=".txt,.md,.csv,.js,.json,.py,.html" style="display:none;" onchange="KnowledgePage.handleFileUpload(event)" />
          
          <button class="btn btn-ghost" onclick="KnowledgePage.handleAutoFill()" title="ИИ сам прочтет текст и заполнит заголовок, тип и теги" style="display:flex;align-items:center;gap:6px; color:var(--accent); background:rgba(var(--accent-rgb),0.1);">
            <i data-lucide="sparkles" style="width:16px;height:16px;"></i>
            Авто-заполнение
          </button>
          <button class="btn btn-primary" onclick="KnowledgePage.saveActiveItem()" style="display:flex;align-items:center;gap:6px;box-shadow:var(--shadow-sm);">
            <i data-lucide="save" style="width:16px;height:16px;"></i>
            Сохранить
          </button>
        </div>
      </div>
      
      <div id="kb-drop-zone" class="kb-editor-body" style="flex:1; padding: 40px 10%; display:flex; flex-direction:column; gap:24px; overflow-y:auto; position:relative;"
           ondragover="event.preventDefault(); this.style.backgroundColor='rgba(var(--accent-rgb), 0.05)';"
           ondragleave="this.style.backgroundColor='transparent';"
           ondrop="KnowledgePage.handleFileDrop(event)">
        
        <div id="kb-loading" style="display:none; position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(255,255,255,0.7); backdrop-filter:blur(4px); z-index:10; align-items:center; justify-content:center; flex-direction:column; color:var(--accent);">
          <i data-lucide="loader-2" class="spin" style="width:32px;height:32px;margin-bottom:12px;"></i>
          <span style="font-size:14px;font-weight:500;">ИИ анализирует текст...</span>
        </div>

        <input type="text" id="kb-editor-title" value="${this.esc(item.title)}" placeholder="Заголовок документа..." style="font-size:36px; font-weight:800; border:none; background:transparent; color:var(--text-primary); outline:none; width:100%;" />
        
        <div class="note-meta-bar" style="display:flex; flex-wrap:wrap; gap:16px; padding:8px 0; border-top:1px solid var(--border-light); border-bottom:1px solid var(--border-light);">
          <div class="note-meta-item" style="display:flex; align-items:center; gap:8px;">
            <i data-lucide="layout-grid" style="width:16px;height:16px;color:var(--text-muted);"></i>
            <select id="kb-editor-type" class="form-input" style="border:none;background:transparent;padding:0;height:auto;font-size:14px;font-weight:500;color:var(--text-primary);box-shadow:none;cursor:pointer;outline:none;">
              ${this.TYPES.map(t => `<option value="${t}" ${(item.type||'Заметка')===t?'selected':''}>${t}</option>`).join('')}
            </select>
          </div>
          <div style="width:1px; height:20px; background:var(--border-light); margin:auto 0;"></div>
          <div class="note-meta-item" style="display:flex; align-items:center; gap:8px; flex:1; min-width:200px;">
            <i data-lucide="hash" style="width:16px;height:16px;color:var(--text-muted);"></i>
            <input type="text" id="kb-editor-tags" value="${this.esc(tagsStr)}" placeholder="Добавить теги через запятую..." style="border:none;background:transparent;font-size:14px;color:var(--text-primary);outline:none;width:100%;" />
          </div>
          <div style="width:1px; height:20px; background:var(--border-light); margin:auto 0;"></div>
          <div class="note-meta-item" style="display:flex; align-items:center; gap:8px; flex:1; min-width:200px;">
            <i data-lucide="link" style="width:16px;height:16px;color:var(--text-muted);"></i>
            <input type="url" id="kb-editor-source" value="${this.esc(item.source_url || '')}" placeholder="URL источника (опционально)..." style="border:none;background:transparent;font-size:14px;color:var(--text-primary);outline:none;width:100%;" />
          </div>
        </div>
        
        <div style="display:flex; gap:8px; margin-top:16px; padding:8px 12px; background:var(--bg-surface); border-radius:8px; border:1px solid var(--border-light);">
          <button class="btn btn-icon btn-ghost" onclick="KnowledgePage.insertMarkdown('**', '**')" title="Жирный">
            <i data-lucide="bold" style="width:14px;height:14px;"></i>
          </button>
          <button class="btn btn-icon btn-ghost" onclick="KnowledgePage.insertMarkdown('*', '*')" title="Курсив">
            <i data-lucide="italic" style="width:14px;height:14px;"></i>
          </button>
          <div style="width:1px; background:var(--border-light); margin:4px 0;"></div>
          <button class="btn btn-icon btn-ghost" onclick="KnowledgePage.insertMarkdown('## ')" title="Заголовок">
            <i data-lucide="heading-2" style="width:14px;height:14px;"></i>
          </button>
          <button class="btn btn-icon btn-ghost" onclick="KnowledgePage.insertMarkdown('- ')" title="Список">
            <i data-lucide="list" style="width:14px;height:14px;"></i>
          </button>
          <div style="width:1px; background:var(--border-light); margin:4px 0;"></div>
          <button class="btn btn-icon btn-ghost" onclick="KnowledgePage.insertMarkdown('[', '](url)')" title="Ссылка">
            <i data-lucide="link" style="width:14px;height:14px;"></i>
          </button>
          <button class="btn btn-icon btn-ghost" onclick="KnowledgePage.insertMarkdown('\`\`\`\n', '\n\`\`\`')" title="Блок кода">
            <i data-lucide="code" style="width:14px;height:14px;"></i>
          </button>
          <div style="flex:1;"></div>
          <button class="btn btn-icon btn-ghost" onclick="document.execCommand('undo')" title="Назад (Отменить)">
            <i data-lucide="undo" style="width:14px;height:14px;"></i>
          </button>
          <button class="btn btn-icon btn-ghost" onclick="document.execCommand('redo')" title="Вперед (Повторить)">
            <i data-lucide="redo" style="width:14px;height:14px;"></i>
          </button>
        </div>

        <textarea id="kb-editor-content" placeholder="Напишите текст или перетащите сюда файл (TXT, Markdown, CSV, JS...)" style="flex:1; border:none; background:transparent; resize:none; font-size:16px; line-height:1.7; color:var(--text-primary); outline:none; min-height: 400px; font-family:var(--font-mono); margin-top:8px;">${this.esc(item.content || '')}</textarea>
      </div>
    `;
    
    if (window.lucide) window.lucide.createIcons();
  },

  async saveActiveItem(silent = false) {
    if (!this.activeItemId) return;
    
    const titleEl = document.getElementById('kb-editor-title');
    const contentEl = document.getElementById('kb-editor-content');
    if (!titleEl || !contentEl) return;

    const title = titleEl.value.trim() || 'Без заголовка';
    const content = contentEl.value.trim();
    const type = document.getElementById('kb-editor-type').value;
    const source_url = document.getElementById('kb-editor-source').value.trim() || null;
    
    const tagsStr = document.getElementById('kb-editor-tags').value;
    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);

    const itemIdx = this.items.findIndex(i => i.id === this.activeItemId);
    if (itemIdx < 0) return;
    const item = this.items[itemIdx];

    const dataToSave = { title, content, type, tags, source_url };

    try {
      if (item.isNew) {
        const created = await DB.createKnowledge(dataToSave);
        this.items[itemIdx] = created;
        this.activeItemId = created.id;
      } else {
        await DB.updateKnowledge(this.activeItemId, dataToSave);
        this.items[itemIdx] = { ...item, ...dataToSave, updated_at: new Date().toISOString() };
      }
      
      this.items.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
      this.renderSidebar();
      
      const timeEl = document.querySelector('.kb-editor-header div:first-child');
      if (timeEl && !silent) {
        timeEl.innerHTML = `<i data-lucide="clock" style="width:14px;height:14px;"></i> Изменено: только что`;
        if (window.lucide) window.lucide.createIcons();
      }
      
      if (!silent) UI.toast('Сохранено', 'success');
    } catch (e) {
      console.error(e);
      if (!silent) UI.toast('Ошибка при сохранении', 'error');
    }
  },

  async deleteActiveItem() {
    if (!this.activeItemId) return;
    
    const item = this.items.find(i => i.id === this.activeItemId);
    
    if (item.isNew) {
      // Just remove the unsaved item from array
      this.items = this.items.filter(i => i.id !== this.activeItemId);
      this.activeItemId = null;
      this.renderSidebar();
      if (this.items.length > 0) {
        this.openItem(this.items[0].id);
      } else {
        document.getElementById('kb-editor-pane').innerHTML = this.renderEmptyEditor();
      }
      return;
    }

    if (!confirm('Удалить этот документ из Базы знаний?')) return;
    
    try {
      await DB.deleteKnowledge(this.activeItemId);
    } catch (e) {
      UI.toast('Ошибка при удалении', 'error');
      return;
    }
    
    this.items = this.items.filter(i => i.id !== this.activeItemId);
    this.activeItemId = null;
    UI.toast('Документ удален', 'info');
    
    this.renderSidebar();
    if (this.items.length > 0) {
      this.openItem(this.items[0].id);
    } else {
      document.getElementById('kb-editor-pane').innerHTML = this.renderEmptyEditor();
    }
  },

  async handleAutoFill() {
    const contentEl = document.getElementById('kb-editor-content');
    if (!contentEl) return;
    
    const content = contentEl.value.trim();
    if (content.length < 50) {
      UI.toast('Слишком мало текста для анализа', 'warning');
      return;
    }

    const loader = document.getElementById('kb-loading');
    if (loader) loader.style.display = 'flex';

    try {
      const result = await Gemini.autoFillKnowledge(content);
      if (result) {
        if (result.title) document.getElementById('kb-editor-title').value = result.title;
        if (result.type && this.TYPES.includes(result.type)) document.getElementById('kb-editor-type').value = result.type;
        if (result.tags && Array.isArray(result.tags)) {
          document.getElementById('kb-editor-tags').value = result.tags.join(', ');
        }
        UI.toast('Поля заполнены ИИ', 'success');
        // Auto-save
        await this.saveActiveItem(true);
      }
    } catch (e) {
      console.error(e);
      UI.toast('Ошибка ИИ: ' + e.message, 'error');
    } finally {
      if (loader) loader.style.display = 'none';
    }
  },

  handleFileDrop(e) {
    e.preventDefault();
    e.currentTarget.style.backgroundColor = 'transparent';
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      this.readFileContent(e.dataTransfer.files[0]);
    }
  },

  handleFileUpload(e) {
    if (e.target.files && e.target.files.length > 0) {
      this.readFileContent(e.target.files[0]);
    }
  },

  readFileContent(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const titleEl = document.getElementById('kb-editor-title');
      const contentEl = document.getElementById('kb-editor-content');
      if (titleEl && !titleEl.value) titleEl.value = file.name;
      if (contentEl) {
        contentEl.value = (contentEl.value ? contentEl.value + '\n\n' : '') + ev.target.result;
      }
      UI.toast('Файл загружен', 'success');
      this.saveActiveItem(true);
    };
    reader.readAsText(file);
  },

  insertMarkdown(prefix, suffix = '') {
    const textarea = document.getElementById('kb-editor-content');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end, text.length);

    // Using execCommand for undo support if possible
    const newText = prefix + selected + suffix;
    textarea.focus();
    if (document.execCommand('insertText', false, newText)) {
      // success
    } else {
      // fallback
      textarea.value = before + newText + after;
    }
    
    textarea.setSelectionRange(start + prefix.length, end + prefix.length);
  },

  esc(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
