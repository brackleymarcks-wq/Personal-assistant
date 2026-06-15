// ============================================
// NOTES / JOURNAL PAGE
// ============================================

const NotesPage = {
  notes: [],
  activeNoteId: null,

  render() {
    return `
      <div class="notes-page">
        <div class="page-header" style="background:var(--bg-surface);padding:var(--space-md) var(--space-xl);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
          <div>
            <div class="page-title" style="font-size:20px;font-weight:700;">Дневник и Заметки</div>
            <div class="page-subtitle" id="notes-count" style="font-size:13px;color:var(--text-secondary);margin-top:2px;">Загрузка...</div>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" onclick="NotesPage.createNewNote()" style="display:flex;align-items:center;gap:6px;">
              <i data-lucide="edit-3"></i>
              Новая запись
            </button>
          </div>
        </div>
        
        <div class="notes-split-layout">
          <div class="notes-sidebar" id="notes-sidebar">
            <div style="text-align:center;padding:var(--space-2xl);color:var(--text-muted);display:flex;flex-direction:column;align-items:center;gap:var(--space-md);">
              <i data-lucide="loader-2" class="spin" style="width:32px;height:32px;"></i>
            </div>
          </div>
          <div class="notes-editor-pane" id="notes-editor-pane">
            ${this.renderEmptyEditor()}
          </div>
        </div>
      </div>
    `;
  },

  renderEmptyEditor() {
    return `
      <div class="notes-empty-selection">
        <i data-lucide="book-open" style="width:64px;height:64px;color:var(--border-light);margin-bottom:var(--space-md);"></i>
        <div style="font-size:18px;font-weight:600;color:var(--text-primary);">Выберите заметку</div>
        <div style="font-size:14px;color:var(--text-secondary);">Или создайте новую из шаблона:</div>
        
        <div class="notes-template-cards">
          <div class="notes-template-card" onclick="NotesPage.createNewNote('Итоги дня', 'Сегодня я успел сделать...', '🚀', 'итоги, дневник')">
            <i data-lucide="sun" style="width:24px;height:24px;margin-bottom:8px;"></i>
            <div style="font-weight:600;font-size:13px;">Итоги дня</div>
          </div>
          <div class="notes-template-card" onclick="NotesPage.createNewNote('Новая идея', 'Суть идеи в том, что...', '💡', 'идеи')">
            <i data-lucide="lightbulb" style="width:24px;height:24px;margin-bottom:8px;"></i>
            <div style="font-weight:600;font-size:13px;">Идея</div>
          </div>
          <div class="notes-template-card" onclick="NotesPage.createNewNote('Конспект созвона', 'Участники:\\nРешения:\\nЗадачи:', '📝', 'работа, конспект')">
            <i data-lucide="users" style="width:24px;height:24px;margin-bottom:8px;"></i>
            <div style="font-weight:600;font-size:13px;">Конспект</div>
          </div>
        </div>
      </div>
    `;
  },

  async init() {
    await this.load();
  },

  async load() {
    try {
      this.notes = await DB.getNotes();
      // Sort by updated_at descending
      this.notes.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      this.renderSidebar();
      
      // If we have an active note, re-render it to get fresh data
      if (this.activeNoteId) {
        const note = this.notes.find(n => n.id === this.activeNoteId);
        if (note) {
          this.renderEditor(note);
        } else {
          this.activeNoteId = null;
          document.getElementById('notes-editor-pane').innerHTML = this.renderEmptyEditor();
          if (window.lucide) window.lucide.createIcons();
        }
      }
    } catch (e) {
      console.error('Notes load error:', e);
    }
  },

  renderSidebar() {
    const list = document.getElementById('notes-sidebar');
    const count = document.getElementById('notes-count');
    
    if (count) count.textContent = `${this.notes.length} записей`;

    if (this.notes.length === 0) {
      list.innerHTML = `
        <div style="padding:var(--space-2xl) var(--space-xl);text-align:center;color:var(--text-muted);">
          <i data-lucide="inbox" style="width:32px;height:32px;margin-bottom:var(--space-sm);color:var(--border-light);"></i>
          <div style="font-size:14px;font-weight:500;">Список пуст</div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    list.innerHTML = this.notes.map(note => {
      const isSelected = note.id === this.activeNoteId;
      const preview = note.content ? note.content.substring(0, 100) : 'Нет текста...';
      const dateStr = new Date(note.updated_at || note.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      
      return `
        <div class="note-list-item ${isSelected ? 'active' : ''}" onclick="NotesPage.selectNote('${note.id}')">
          <div class="note-list-header">
            <div class="note-list-title">${note.mood || '📝'} ${this.esc(note.title) || 'Без заголовка'}</div>
            <div class="note-list-date">${dateStr}</div>
          </div>
          <div class="note-list-preview">${this.esc(preview)}</div>
          ${note.tags && note.tags.length > 0 ? `
            <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;">
              ${note.tags.slice(0, 3).map(tag => `<span class="note-tag-pill">#${this.esc(tag)}</span>`).join('')}
              ${note.tags.length > 3 ? `<span class="note-tag-pill">...</span>` : ''}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
    
    if (window.lucide) window.lucide.createIcons();
  },

  selectNote(id) {
    this.activeNoteId = id;
    this.renderSidebar(); // update active class
    const note = this.notes.find(n => n.id === id);
    if (note) {
      this.renderEditor(note);
    }
  },

  async createNewNote(title = '', content = '', mood = '📝', tagsStr = '') {
    const data = {
      title: title || 'Новая запись',
      content: content || '',
      mood: mood,
      tags: tagsStr ? tagsStr.split(',').map(t=>t.trim()) : []
    };
    try {
      const created = await DB.createNote(data);
      this.activeNoteId = created.id;
      await this.load(); // reloads sidebar and sets active note
    } catch (e) {
      console.error(e);
      UI.toast('Ошибка при создании', 'error');
    }
  },

  renderEditor(note) {
    const pane = document.getElementById('notes-editor-pane');
    const tagsStr = note.tags ? note.tags.join(', ') : '';
    
    pane.innerHTML = `
      <div class="notes-editor-header">
        <div style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:6px;">
          <i data-lucide="clock" style="width:14px;height:14px;"></i>
          Изменено: ${new Date(note.updated_at || note.created_at).toLocaleString('ru-RU', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
        </div>
        <div class="notes-editor-actions">
          <button class="btn btn-icon" onclick="NotesPage.deleteNote('${note.id}')" title="Удалить">
            <i data-lucide="trash-2" style="color:var(--danger);"></i>
          </button>
          <button class="btn btn-primary" onclick="NotesPage.saveActiveNote()" style="display:flex;align-items:center;gap:6px;">
            <i data-lucide="save"></i>
            Сохранить
          </button>
        </div>
      </div>
      
      <div class="notes-editor-body">
        <input type="text" id="editor-title" class="note-title-input" value="${this.esc(note.title)}" placeholder="Заголовок..." />
        
        <div class="note-meta-bar">
          <div class="note-meta-item" style="width: 140px;">
            <i data-lucide="smile" style="width:16px;height:16px;color:var(--text-muted);"></i>
            <select id="editor-mood" class="form-input" style="border:none;background:transparent;padding:0;height:auto;font-size:13px;color:var(--text-primary);box-shadow:none;cursor:pointer;">
              <option value="📝" ${note.mood === '📝' ? 'selected' : ''}>📝 Нейтральное</option>
              <option value="🚀" ${note.mood === '🚀' ? 'selected' : ''}>🚀 Продуктивное</option>
              <option value="😊" ${note.mood === '😊' ? 'selected' : ''}>😊 Радостное</option>
              <option value="🤔" ${note.mood === '🤔' ? 'selected' : ''}>🤔 Задумчивое</option>
              <option value="😫" ${note.mood === '😫' ? 'selected' : ''}>😫 Усталое</option>
              <option value="💡" ${note.mood === '💡' ? 'selected' : ''}>💡 Инсайт</option>
            </select>
          </div>
          
          <div class="note-meta-item" style="flex:1;">
            <i data-lucide="hash" style="width:16px;height:16px;color:var(--text-muted);"></i>
            <input type="text" id="editor-tags" class="note-tags-input" value="${this.esc(tagsStr)}" placeholder="теги через запятую (проект, идея...)" />
          </div>
        </div>
        
        <textarea id="editor-content" class="note-content-textarea" placeholder="Начните писать здесь... Нажмите Сохранить для записи.">${this.esc(note.content || '')}</textarea>
      </div>
    `;
    
    if (window.lucide) window.lucide.createIcons();
    
    // Auto-resize textarea
    const textarea = document.getElementById('editor-content');
    if (textarea) {
      // Optional: you can add an input listener for auto-save here
      // For now, using manual save button to avoid too many DB calls
    }
  },

  async saveActiveNote() {
    if (!this.activeNoteId) return;
    
    const title = document.getElementById('editor-title').value.trim() || 'Без заголовка';
    const content = document.getElementById('editor-content').value.trim();
    const mood = document.getElementById('editor-mood').value;
    const tagsStr = document.getElementById('editor-tags').value;
    const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);

    try {
      await DB.updateNote(this.activeNoteId, { title, content, mood, tags });
      UI.toast('Сохранено', 'success');
      // We don't want to lose cursor position if we do a full reload,
      // so we just update the local data and sidebar silently
      const noteIdx = this.notes.findIndex(n => n.id === this.activeNoteId);
      if (noteIdx >= 0) {
        this.notes[noteIdx] = { 
          ...this.notes[noteIdx], 
          title, content, mood, tags, 
          updated_at: new Date().toISOString() 
        };
        // Re-sort notes by updated_at descending
        this.notes.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        this.renderSidebar();
        
        // Update header time
        const timeEl = document.querySelector('.notes-editor-header div:first-child');
        if (timeEl) {
          timeEl.innerHTML = `<i data-lucide="clock" style="width:14px;height:14px;"></i> Изменено: только что`;
          if (window.lucide) window.lucide.createIcons();
        }
      }
    } catch (e) {
      console.error(e);
      UI.toast('Ошибка при сохранении', 'error');
    }
  },

  async deleteNote(id) {
    if (!confirm('Точно удалить заметку?')) return;
    try {
      await DB.deleteNote(id);
      this.activeNoteId = null;
      UI.toast('Заметка удалена', 'success');
      this.load();
    } catch (e) {
      console.error(e);
      UI.toast('Ошибка при удалении', 'error');
    }
  },

  esc(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
