// ============================================
// KNOWLEDGE BASE PAGE
// ============================================

const KnowledgePage = {
  items: [],
  activeItemId: null,
  filters: { type: '', search: '', tag: '' },

  TYPES: ['Промт', 'Инструмент', 'Статья', 'Кейс', 'Урок', 'Заметка'],
  TYPE_ICONS: {
    'Промт': 'bot', 'Инструмент': 'wrench', 'Статья': 'newspaper',
    'Кейс': 'briefcase', 'Урок': 'graduation-cap', 'Заметка': 'edit-3'
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
      this.tasks = await DB.getTasks();
      this.renderSidebar();
      if (this.activeItemId) {
        this.openItem(this.activeItemId);
      } else {
        document.getElementById('kb-editor-pane').innerHTML = this.renderEmptyEditor();
      }
    } catch (e) {
      console.error('Knowledge load error:', e);
    }
    
    // Intercept clicks on links in the editor preview
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href');
      if (href && href.startsWith('#kb:')) {
        e.preventDefault();
        const title = decodeURIComponent(href.substring(4));
        KnowledgePage.openItemByTitle(title);
      }
    });
  },

  openItemByTitle(title) {
    const item = this.items.find(i => i.title.toLowerCase() === title.toLowerCase());
    if (item) {
      this.openItem(item.id);
    } else {
      UI.toast('Документ не найден: ' + title, 'warning');
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

    const grouped = {};
    filtered.forEach(item => {
      const f = item.folder || 'Общее';
      if (!grouped[f]) grouped[f] = [];
      grouped[f].push(item);
    });

    const html = [];
    Object.keys(grouped).sort().forEach(folderName => {
      html.push(`
        <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin:16px 8px 4px; display:flex; align-items:center; gap:6px;">
          <i data-lucide="folder" style="width:12px;height:12px;"></i> ${this.esc(folderName)}
        </div>
      `);
      grouped[folderName].forEach(item => {
        const isSelected = item.id === this.activeItemId;
        const icon = this.TYPE_ICONS[item.type] || 'file-text';
        
        let dateObj = item.updated_at ? new Date(item.updated_at) : (item.created_at ? new Date(item.created_at) : new Date());
        if (isNaN(dateObj.getTime())) dateObj = new Date();
        const date = dateObj.toLocaleDateString('ru-RU', { day:'numeric', month:'short' });
        
        html.push(`
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
        `);
      });
    });

    listEl.innerHTML = html.join('');

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
          <button class="btn btn-secondary" onclick="KnowledgePage.closeActiveItem()" title="Вернуться к списку">
            <i data-lucide="arrow-left" style="width:16px;height:16px;"></i>
            Назад
          </button>
          <div style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:6px;">
            <i data-lucide="clock" style="width:14px;height:14px;"></i>
            ${item.isNew ? 'Новая запись' : 'Изменено: ' + new Date(item.updated_at || item.created_at).toLocaleString('ru-RU', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
          </div>
        </div>
        <div class="kb-editor-actions" style="display:flex;gap:var(--space-sm);">
          <button class="btn btn-icon" onclick="KnowledgePage.deleteActiveItem()" title="${item.isNew ? 'Отменить создание' : 'Удалить документ'}" style="background:var(--bg-surface);border:1px solid var(--border-light);">
            <i data-lucide="trash-2" style="color:var(--danger);width:16px;height:16px;"></i>
          </button>
          <button class="btn btn-secondary" onclick="document.getElementById('kb-file-upload').click()" title="Загрузить файл (TXT, MD, DOCX, XLSX и др.)" style="display:flex;align-items:center;gap:6px;">
            <i data-lucide="upload-cloud" style="width:16px;height:16px;"></i>
            Загрузить файл
          </button>
          <input type="file" id="kb-file-upload" accept=".txt,.md,.csv,.js,.json,.html,.docx,.xlsx" style="display:none;" onchange="KnowledgePage.handleFileUpload(event)" />
          
          <button class="btn btn-ghost" onclick="KnowledgePage.handleAutoFill()" title="ИИ сам прочтет текст и заполнит заголовок, тип и теги" style="display:flex;align-items:center;gap:6px; color:var(--accent); background:rgba(var(--accent-rgb),0.1);">
            <i data-lucide="sparkles" style="width:16px;height:16px;"></i>
            Авто-заполнение
          </button>
          <button class="btn btn-icon btn-ghost" onclick="KnowledgePage.downloadActiveItem()" title="Скачать документ" style="background:var(--bg-surface);border:1px solid var(--border-light);">
            <i data-lucide="download" style="width:16px;height:16px;"></i>
          </button>
          <button class="btn btn-primary" onclick="KnowledgePage.saveActiveItem()" style="display:flex;align-items:center;gap:6px;box-shadow:var(--shadow-sm);">
            <i data-lucide="save" style="width:16px;height:16px;"></i>
            Сохранить
          </button>
        </div>
      </div>
      
      <div id="kb-drop-zone" class="kb-editor-body" style="flex:1; display:flex; flex-direction:column; overflow:hidden; position:relative; background: var(--bg-body);"
           ondragover="event.preventDefault(); this.style.backgroundColor='rgba(var(--accent-rgb), 0.05)';"
           ondragleave="this.style.backgroundColor='var(--bg-body)';"
           ondrop="KnowledgePage.handleFileDrop(event)">
        
        <div id="kb-loading" style="display:none; position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(255,255,255,0.7); backdrop-filter:blur(4px); z-index:10; align-items:center; justify-content:center; flex-direction:column; color:var(--accent);">
          <i data-lucide="loader-2" class="spin" style="width:32px;height:32px;margin-bottom:12px;"></i>
          <span style="font-size:14px;font-weight:500;">ИИ анализирует текст...</span>
        </div>

        <div style="padding: 24px 10% 0; flex-shrink: 0;">
          <input type="text" id="kb-editor-title" value="${this.esc(item.title)}" placeholder="Заголовок документа..." style="font-size:36px; font-weight:800; border:none; background:transparent; color:var(--text-primary); outline:none; width:100%;" />
          
          <div class="note-meta-bar" style="display:flex; flex-wrap:wrap; gap:16px; padding:8px 0; border-top:1px solid var(--border-light); border-bottom:1px solid var(--border-light); margin-top:16px;">
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
            <div class="note-meta-item" style="display:flex; align-items:center; gap:8px;">
              <i data-lucide="folder" style="width:16px;height:16px;color:var(--text-muted);"></i>
              <input type="text" id="kb-editor-folder" value="${this.esc(item.folder || 'Общее')}" placeholder="Папка..." style="border:none;background:transparent;font-size:14px;color:var(--text-primary);outline:none;width:120px;" />
            </div>
            <div style="width:1px; height:20px; background:var(--border-light); margin:auto 0;"></div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">URL источника (опционально)</label>
              <input type="text" id="kb-editor-source" class="form-input" placeholder="https://" value="${this.esc(item.source_url || '')}" style="background:transparent;border:none;border-bottom:1px solid var(--border-light);border-radius:0;padding-left:0;font-size:13px;" />
            </div>
          </div>
          
          <div class="form-group" style="margin-top: 16px;">
            <label class="form-label" style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Прикрепленные задачи</label>
            <div style="max-height: 120px; overflow-y: auto; border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 8px;">
              ${(!this.tasks || this.tasks.length === 0) ? '<div style="font-size:12px; color:var(--text-muted);">Задач нет</div>' : ''}
              ${(this.tasks || []).map(t => `
                <label style="display:flex; align-items:center; gap:8px; margin-bottom:6px; font-size:13px; cursor:pointer;">
                  <input type="checkbox" class="kb-linked-task" value="${t.id}" ${(item?.linked_tasks || []).includes(t.id) ? 'checked' : ''}>
                  <i data-lucide="check-square" style="width:14px;height:14px;color:var(--accent);"></i>
                  ${this.esc(t.title)}
                </label>
              `).join('')}
            </div>
          </div>
        </div>

        <div style="flex:1; padding: 0 10% 40px; display:flex; flex-direction:column; overflow:hidden;">
          <div id="kb-editor-toastui" style="flex:1; width:100%;"></div>
        </div>
      </div>
    `;
    
    if (window.lucide) window.lucide.createIcons();
    
    setTimeout(() => {
      if (KnowledgePage.editorInstance) {
        KnowledgePage.editorInstance.destroy();
      }
      
      if (window.toastui && window.toastui.Editor) {
        KnowledgePage.editorInstance = new window.toastui.Editor({
          el: document.querySelector('#kb-editor-toastui'),
          height: '100%',
          initialEditType: 'wysiwyg',
          previewStyle: 'vertical',
          initialValue: (item.content || '').replace(/\[\[(.*?)\]\]/g, '[$1](#kb:$1)'),
          autofocus: false,
          toolbarItems: [
            ['heading', 'bold', 'italic', 'strike'],
            ['hr', 'quote'],
            ['ul', 'ol', 'task', 'indent', 'outdent'],
            ['table', 'image', 'link'],
            ['code', 'codeblock']
          ],
          hooks: {
            addImageBlobHook: async (blob, callback) => {
              try {
                UI.toast('Загрузка картинки...', 'info');
                const url = await DB.uploadKnowledgeImage(blob);
                callback(url, 'Изображение');
              } catch (e) {
                console.error('Image upload failed:', e);
                UI.toast('Ошибка при загрузке картинки', 'error');
              }
            }
          }
        });
        
        // Hide toolbar border for cleaner UI
        const toolbar = document.querySelector('.toastui-editor-toolbar');
        if (toolbar) toolbar.style.border = 'none';
      }
    }, 50);
  },

  closeActiveItem() {
    if (this.activeItemId) {
      this.saveActiveItem(true);
    }
    this.activeItemId = null;
    this.renderSidebar();
    document.getElementById('kb-editor-pane').innerHTML = this.renderEmptyEditor();
  },

  async saveActiveItem(silent = false) {
    if (!this.activeItemId) return;
    
    const titleEl = document.getElementById('kb-editor-title');
    if (!titleEl || !KnowledgePage.editorInstance) return;

    let title = titleEl.value.trim();
    let content = KnowledgePage.editorInstance.getMarkdown().trim();
    // 1. Unescape WYSIWYG typed brackets \[\[Title\]\]
    content = content.replace(/\\\[\\\[(.*?)\\\]\\\]/g, '[[$1]]');
    // 2. Unescape manually typed markdown links if any
    content = content.replace(/\\\[(.*?)\\\]\(#kb:(.*?)\)/g, '[[$1]]');
    // 3. Convert valid markdown links back to wiki
    content = content.replace(/\[(.*?)\]\(#kb:(.*?)\)/g, '[[$1]]');
    
    const type = document.getElementById('kb-editor-type').value;
    const folder = document.getElementById('kb-editor-folder').value.trim() || 'Общее';
    const source_url = document.getElementById('kb-editor-source').value.trim() || null;
    const tagsStr = document.getElementById('kb-editor-tags').value;
    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    const linked_tasks = Array.from(document.querySelectorAll('.kb-linked-task:checked')).map(cb => cb.value);

    const itemIdx = this.items.findIndex(i => i.id === this.activeItemId);
    if (itemIdx < 0) return;
    const item = this.items[itemIdx];

    // Auto-delete if new and completely empty
    if (item.isNew && !title && !content && silent) {
      this.items = this.items.filter(i => i.id !== this.activeItemId);
      if (!this.activeItemId) return; // already handled
      return;
    }

    title = title || 'Без заголовка';
    const dataToSave = { title, content, type, tags, source_url, folder, linked_tasks };

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
      UI.toast('Ошибка при сохранении: ' + (e.message || e.details || ''), 'error');
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
    const titleEl = document.getElementById('kb-editor-title');
    if (!titleEl || !KnowledgePage.editorInstance) return;

    const content = KnowledgePage.editorInstance.getMarkdown().trim();
    if (content.length < 10) {
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

  async readFileContent(file) {
    const titleEl = document.getElementById('kb-editor-title');
    const contentEl = document.getElementById('kb-editor-content');
    
    if (titleEl && !titleEl.value) titleEl.value = file.name;
    
    const ext = file.name.split('.').pop().toLowerCase();
    
    try {
      let text = '';
      if (ext === 'docx') {
        if (!window.mammoth) throw new Error('Mammoth.js не загружен');
        const arrayBuffer = await file.arrayBuffer();
        const result = await window.mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        text = result.value;
      } else if (ext === 'xlsx' || ext === 'xls') {
        if (!window.XLSX) throw new Error('SheetJS (XLSX) не загружен');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
        text = '';
        workbook.SheetNames.forEach(sheetName => {
          const csv = window.XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
          text += `## Лист: ${sheetName}\n\n${csv}\n\n`;
        });
      } else {
        // Обычные текстовые файлы
        text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result);
          reader.onerror = e => reject(e);
          reader.readAsText(file);
        });
      }

      if (KnowledgePage.editorInstance) {
        const currentMarkdown = KnowledgePage.editorInstance.getMarkdown();
        KnowledgePage.editorInstance.setMarkdown(currentMarkdown + (currentMarkdown ? '\n\n' : '') + text);
      }
      UI.toast('Файл загружен', 'success');
      this.saveActiveItem(true);
    } catch (err) {
      console.error('Ошибка чтения файла:', err);
      UI.toast('Ошибка чтения: ' + err.message, 'error');
    }
  },

  downloadActiveItem() {
    if (!this.activeItemId) return;
    const titleEl = document.getElementById('kb-editor-title');
    const contentEl = document.getElementById('kb-editor-content');
    if (!titleEl || !contentEl) return;

    const title = titleEl.value.trim() || 'document';

    const modalId = 'kb-download-modal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = modalId;
    overlay.style = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5); backdrop-filter:blur(4px); z-index:9999; display:flex; align-items:center; justify-content:center;";

    overlay.innerHTML = `
      <div style="background:var(--bg-primary); width:400px; border-radius:16px; padding:24px; box-shadow:var(--shadow-lg);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h3 style="margin:0; font-size:18px;">Скачать документ</h3>
          <button class="btn btn-icon btn-ghost" onclick="document.getElementById('${modalId}').remove()">
            <i data-lucide="x" style="width:20px;height:20px;"></i>
          </button>
        </div>
        <p style="color:var(--text-muted); font-size:14px; margin-bottom:24px;">Выберите формат для скачивания <b>${this.esc(title)}</b>:</p>
        
        <div style="display:flex; flex-direction:column; gap:12px;">
          <button class="btn btn-secondary" onclick="KnowledgePage.processDownload('md')" style="justify-content:flex-start;">
            <i data-lucide="file-text" style="width:16px;height:16px;margin-right:8px;color:var(--accent);"></i> Markdown (.md) — для ИИ
          </button>
          <button class="btn btn-secondary" onclick="KnowledgePage.processDownload('txt')" style="justify-content:flex-start;">
            <i data-lucide="file" style="width:16px;height:16px;margin-right:8px;"></i> Обычный текст (.txt)
          </button>
          <button class="btn btn-secondary" onclick="KnowledgePage.processDownload('doc')" style="justify-content:flex-start;">
            <i data-lucide="file-type-2" style="width:16px;height:16px;margin-right:8px;color:#2b579a;"></i> Microsoft Word (.doc)
          </button>
          <button class="btn btn-secondary" onclick="KnowledgePage.processDownload('pdf')" style="justify-content:flex-start;">
            <i data-lucide="file-image" style="width:16px;height:16px;margin-right:8px;color:#d32f2f;"></i> Документ PDF (.pdf)
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();
  },

  processDownload(ext) {
    const modal = document.getElementById('kb-download-modal');
    if (modal) modal.remove();

    const titleEl = document.getElementById('kb-editor-title');
    if (!titleEl || !KnowledgePage.editorInstance) return;

    const title = titleEl.value.trim() || 'document';
    let content = KnowledgePage.editorInstance.getMarkdown();
    content = content.replace(/\\\[\\\[(.*?)\\\]\\\]/g, '[[$1]]');
    content = content.replace(/\\\[(.*?)\\\]\(#kb:(.*?)\)/g, '[[$1]]');
    content = content.replace(/\[(.*?)\]\(#kb:(.*?)\)/g, '[[$1]]');

    let filename = title;
    if (filename.includes('.')) {
      filename = filename.substring(0, filename.lastIndexOf('.'));
    }
    filename += '.' + ext;

    if (ext === 'pdf') {
      UI.toast('Генерация PDF...', 'info');
      const htmlContent = window.marked ? window.marked.parse(content) : content;
      const wrap = document.createElement('div');
      wrap.innerHTML = `<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; color: #333;">
        <h1 style="border-bottom: 1px solid #eee; padding-bottom: 10px;">${this.esc(title)}</h1>
        ${htmlContent}
      </div>`;
      
      if (window.html2pdf) {
        window.html2pdf().set({
          margin: 15,
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(wrap).save().then(() => {
          UI.toast('PDF успешно скачан', 'success');
        });
      } else {
        UI.toast('Библиотека PDF не загружена', 'error');
      }
      return;
    }

    let downloadContent = content;
    let mimeType = 'text/plain;charset=utf-8';
    
    if (ext === 'html' || ext === 'doc') {
      const htmlContent = window.marked ? window.marked.parse(content) : content;
      downloadContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${title}</title></head>
        <body style="font-family: Arial, sans-serif;">
          <h1>${this.esc(title)}</h1>
          ${htmlContent}
        </body>
        </html>
      `;
      mimeType = ext === 'doc' ? 'application/msword;charset=utf-8' : 'text/html;charset=utf-8';
    }

    const blob = new Blob([downloadContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  esc(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
