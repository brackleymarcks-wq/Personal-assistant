// ============================================
// NOTES / JOURNAL PAGE
// ============================================

const NotesPage = {
  notes: [],
  activeNoteId: null,
  currentChatHistory: [],

  render() {
    return `
      <div class="notes-page" style="height: 100%; display: flex; flex-direction: column; background: transparent;">
        <div class="page-header" style="background:transparent;padding:var(--space-md) var(--space-xl);display:flex;align-items:center;justify-content:space-between;flex-shrink:0; border-bottom: 1px solid var(--glass-border);">
          <div>
            <div class="page-title" style="font-size:24px;font-weight:700; color: var(--text-primary);">Дневник и Заметки</div>
            <div class="page-subtitle" id="notes-count" style="font-size:13px;color:var(--text-muted);margin-top:4px;">Загрузка...</div>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" onclick="NotesPage.createNewNote()" style="display:flex;align-items:center;gap:6px;box-shadow:var(--shadow-md);">
              <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
              Новая запись
            </button>
          </div>
        </div>
        
        <div class="notes-split-layout" style="display: flex; flex: 1; overflow: hidden; gap: var(--space-md); padding: var(--space-md);">
          <div class="notes-sidebar glass-panel" id="notes-sidebar" style="width: 320px; min-width: 320px; border-radius: var(--radius-lg); overflow-y: auto; padding: var(--space-sm); display: flex; flex-direction: column; gap: 8px;">
            <div style="text-align:center;padding:var(--space-2xl);color:var(--text-muted);display:flex;flex-direction:column;align-items:center;gap:var(--space-md);">
              <i data-lucide="loader-2" class="spin" style="width:32px;height:32px;"></i>
            </div>
          </div>
          <div class="notes-editor-pane glass-panel" id="notes-editor-pane" style="flex: 1; border-radius: var(--radius-lg); overflow: hidden; display: flex; flex-direction: column;">
            ${this.renderEmptyEditor()}
          </div>
        </div>
      </div>
    `;
  },

  renderEmptyEditor() {
    return `
      <div class="notes-empty-selection" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding: 40px;">
        <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--bg-hover); display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
          <i data-lucide="book-open" style="width:40px;height:40px;color:var(--accent);"></i>
        </div>
        <div style="font-size:20px;font-weight:700;color:var(--text-primary); margin-bottom: 8px;">Выберите заметку</div>
        <div style="font-size:14px;color:var(--text-muted); margin-bottom: 32px;">Или создайте новую из шаблона:</div>
        
        <div class="notes-template-cards" style="display:flex; gap: 16px; flex-wrap: wrap; justify-content: center;">
          <div class="glass-panel" onclick="NotesPage.createNewNote('Итоги дня', 'Сегодня я успел сделать...', '🚀', 'итоги, дневник')" style="width: 140px; padding: 20px 16px; border-radius: 16px; cursor: pointer; transition: all 0.2s; text-align: center;" onmouseover="this.style.transform='translateY(-4px)'; this.style.borderColor='var(--accent)';" onmouseout="this.style.transform='none'; this.style.borderColor='var(--glass-border)';">
            <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.1); color: var(--accent); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
              <i data-lucide="sun" style="width:20px;height:20px;"></i>
            </div>
            <div style="font-weight:600;font-size:13px;color:var(--text-primary);">Итоги дня</div>
          </div>
          <div class="glass-panel" onclick="NotesPage.createNewNote('Новая идея', 'Суть идеи в том, что...', '💡', 'идеи')" style="width: 140px; padding: 20px 16px; border-radius: 16px; cursor: pointer; transition: all 0.2s; text-align: center;" onmouseover="this.style.transform='translateY(-4px)'; this.style.borderColor='var(--accent)';" onmouseout="this.style.transform='none'; this.style.borderColor='var(--glass-border)';">
            <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(var(--warning-rgb), 0.1); color: var(--warning); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
              <i data-lucide="lightbulb" style="width:20px;height:20px;"></i>
            </div>
            <div style="font-weight:600;font-size:13px;color:var(--text-primary);">Идея</div>
          </div>
          <div class="glass-panel" onclick="NotesPage.createNewNote('Конспект созвона', 'Участники:\\nРешения:\\nЗадачи:', '📝', 'работа, конспект')" style="width: 140px; padding: 20px 16px; border-radius: 16px; cursor: pointer; transition: all 0.2s; text-align: center;" onmouseover="this.style.transform='translateY(-4px)'; this.style.borderColor='var(--accent)';" onmouseout="this.style.transform='none'; this.style.borderColor='var(--glass-border)';">
            <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(var(--success-rgb), 0.1); color: var(--success); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
              <i data-lucide="users" style="width:20px;height:20px;"></i>
            </div>
            <div style="font-weight:600;font-size:13px;color:var(--text-primary);">Конспект</div>
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
      const textContent = (note.content || '').split('\\n\\n===AI_CHAT_START===\\n')[0];
      const preview = textContent ? textContent.substring(0, 100) : 'Нет текста...';
      const dateStr = new Date(note.updated_at || note.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      
      return `
        <div class="note-list-item glass-panel" style="padding: 16px; border-radius: 12px; cursor: pointer; transition: all 0.2s; border: 1px solid ${isSelected ? 'var(--accent)' : 'var(--glass-border)'}; background: ${isSelected ? 'rgba(var(--accent-rgb), 0.05)' : 'var(--glass-bg)'}; box-shadow: ${isSelected ? 'var(--shadow-md)' : 'none'};" onclick="NotesPage.selectNote('${note.id}')" onmouseover="if(!${isSelected}) { this.style.transform='translateY(-2px)'; this.style.borderColor='var(--accent-soft)'; }" onmouseout="if(!${isSelected}) { this.style.transform='none'; this.style.borderColor='var(--glass-border)'; }">
          <div class="note-list-header" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <div class="note-list-title" style="font-weight: 600; font-size: 14px; color: ${isSelected ? 'var(--accent)' : 'var(--text-primary)'};">${note.mood || '📝'} ${this.esc(note.title) || 'Без заголовка'}</div>
            <div class="note-list-date" style="font-size: 11px; color: var(--text-muted);">${dateStr}</div>
          </div>
          <div class="note-list-preview" style="font-size: 13px; color: var(--text-secondary); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${this.esc(preview)}</div>
          ${note.tags && note.tags.length > 0 ? `
            <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:10px;">
              ${note.tags.slice(0, 3).map(tag => `<span class="note-tag-pill" style="font-size: 10px; padding: 2px 8px; border-radius: 10px; background: var(--bg-hover); color: var(--text-secondary); border: 1px solid var(--border-light);">#${this.esc(tag)}</span>`).join('')}
              ${note.tags.length > 3 ? `<span class="note-tag-pill" style="font-size: 10px; padding: 2px 8px; border-radius: 10px; background: var(--bg-hover); color: var(--text-secondary); border: 1px solid var(--border-light);">...</span>` : ''}
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

  async closeEditor() {
    if (this.activeNoteId) {
      await this.saveActiveNote(true); // silent save
    }
    this.activeNoteId = null;
    this.currentChatHistory = [];
    document.getElementById('notes-editor-pane').innerHTML = this.renderEmptyEditor();
    if (window.lucide) window.lucide.createIcons();
    this.renderSidebar();
  },

  renderEditor(note) {
    const pane = document.getElementById('notes-editor-pane');
    const tagsStr = note.tags ? note.tags.join(', ') : '';
    
    let textContent = note.content || '';
    let chatHistory = [];
    
    // Clean up old plain text AI answers if user hasn't modified them
    // (This is a best-effort cleanup for the immediate transition)
    if (textContent.includes('--- 💡 Ответ ИИ на:')) {
       // We won't try to automatically migrate old text chat to JSON to avoid data loss,
       // user can just delete it. We only parse the new format.
    }
    
    if (textContent.includes('\\n\\n===AI_CHAT_START===\\n')) {
      const parts = textContent.split('\\n\\n===AI_CHAT_START===\\n');
      textContent = parts[0];
      try {
        chatHistory = JSON.parse(parts[1]);
      } catch(e) {}
    }
    
    this.currentChatHistory = chatHistory;
    
    pane.innerHTML = `
      <div class="notes-editor-header" style="padding: var(--space-xl) var(--space-2xl); border-bottom: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between; background: rgba(var(--bg-surface-rgb), 0.5);">
        <div style="display:flex; align-items:center; gap: 16px;">
          <button class="btn btn-ghost" onclick="NotesPage.closeEditor()" style="display:flex;align-items:center;gap:6px;padding:6px 12px;" title="Назад к шаблонам">
            <i data-lucide="arrow-left" style="width:16px;height:16px;"></i>
            <span style="font-weight:500;">Назад</span>
          </button>
          <div style="width:1px; height:20px; background:var(--border-light);"></div>
          <div style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:6px;">
            <i data-lucide="clock" style="width:14px;height:14px;"></i>
            Изменено: ${new Date(note.updated_at || note.created_at).toLocaleString('ru-RU', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
          </div>
        </div>
        <div class="notes-editor-actions" style="display:flex;gap:var(--space-sm);">
          <button class="btn btn-icon" onclick="NotesPage.deleteNote('${note.id}')" title="Удалить" style="background:var(--bg-surface);border:1px solid var(--border-light);">
            <i data-lucide="trash-2" style="color:var(--danger);width:16px;height:16px;"></i>
          </button>
          <button class="btn btn-primary" onclick="NotesPage.saveActiveNote()" style="display:flex;align-items:center;gap:6px;box-shadow:var(--shadow-sm);">
            <i data-lucide="save" style="width:16px;height:16px;"></i>
            Сохранить
          </button>
        </div>
      </div>
      
      <div class="notes-editor-body" style="flex:1; padding: 40px 10%; display:flex; flex-direction:column; gap:24px; overflow-y:auto;">
        <input type="text" id="editor-title" class="note-title-input" value="${this.esc(note.title)}" placeholder="Заголовок..." style="font-size:32px; font-weight:800; border:none; background:transparent; color:var(--text-primary); outline:none; width:100%;" />
        
        <div class="note-meta-bar" style="display:flex; gap:16px; padding:12px 16px; background:var(--bg-surface); border-radius:12px; border:1px solid var(--border-light);">
          <div class="note-meta-item" style="display:flex; align-items:center; gap:8px;">
            <i data-lucide="smile" style="width:16px;height:16px;color:var(--text-muted);"></i>
            <select id="editor-mood" class="form-input" style="border:none;background:transparent;padding:0;height:auto;font-size:13px;font-weight:500;color:var(--text-primary);box-shadow:none;cursor:pointer;outline:none;">
              <option value="📝" ${note.mood === '📝' ? 'selected' : ''}>📝 Нейтральное</option>
              <option value="🚀" ${note.mood === '🚀' ? 'selected' : ''}>🚀 Продуктивное</option>
              <option value="😊" ${note.mood === '😊' ? 'selected' : ''}>😊 Радостное</option>
              <option value="🤔" ${note.mood === '🤔' ? 'selected' : ''}>🤔 Задумчивое</option>
              <option value="😫" ${note.mood === '😫' ? 'selected' : ''}>😫 Усталое</option>
              <option value="💡" ${note.mood === '💡' ? 'selected' : ''}>💡 Инсайт</option>
            </select>
          </div>
          <div style="width:1px; height:16px; background:var(--border-light); margin:auto 0;"></div>
          <div class="note-meta-item" style="flex:1; display:flex; align-items:center; gap:8px;">
            <i data-lucide="hash" style="width:16px;height:16px;color:var(--text-muted);"></i>
            <input type="text" id="editor-tags" class="note-tags-input" value="${this.esc(tagsStr)}" placeholder="теги через запятую (проект, идея...)" style="border:none;background:transparent;font-size:13px;color:var(--text-primary);outline:none;width:100%;" />
          </div>
        </div>
        
        <textarea id="editor-content" class="note-content-textarea" placeholder="Начните писать здесь... Нажмите Сохранить для записи." style="flex:1; border:none; background:transparent; resize:none; font-size:16px; line-height:1.6; color:var(--text-primary); outline:none; min-height: 200px;">${this.esc(textContent)}</textarea>
        
        <div id="ai-chat-container" style="display:flex; flex-direction:column; gap:12px; margin-top:16px;">
          ${this.renderChatMessages(this.currentChatHistory)}
        </div>
        
        <!-- AI Assistant Bar -->
        <div class="note-ai-bar" style="margin-top: auto; display:flex; flex-direction:column; gap:8px; padding:16px; background: rgba(var(--accent-rgb), 0.05); border: 1px solid var(--accent-soft); border-radius: 12px; position:relative; flex-shrink: 0;">
          <div id="ai-loading" style="display:none; position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(255,255,255,0.7); backdrop-filter:blur(4px); border-radius:12px; z-index:10; align-items:center; justify-content:center; flex-direction:column; color:var(--accent);">
            <i data-lucide="loader-2" class="spin" style="width:24px;height:24px;margin-bottom:8px;"></i>
            <span style="font-size:13px;font-weight:500;">ИИ думает...</span>
          </div>

          <div style="display:flex; align-items:center; gap:8px; margin-bottom: 4px;">
            <i data-lucide="sparkles" style="width:16px;height:16px;color:var(--accent);"></i>
            <span style="font-weight:600; font-size:13px; color:var(--text-primary);">AI-Ассистент</span>
            <button class="btn btn-ghost" onclick="NotesPage.handleAIRewrite()" style="margin-left:auto; font-size:12px; padding:4px 10px; display:flex; align-items:center; gap:4px; color:var(--accent); background:rgba(var(--accent-rgb),0.1);" title="Превратить черновик в красивый текст">
              <i data-lucide="wand-2" style="width:14px;height:14px;"></i> Причесать текст
            </button>
          </div>
          
          <div style="display:flex; gap:8px;">
            <input type="text" id="ai-prompt-input" placeholder="Спросить совет или идею по заметке..." style="flex:1; padding:10px 16px; border-radius:8px; border:1px solid var(--border-light); background:var(--bg-default); font-size:13px; outline:none;" onkeypress="if(event.key==='Enter') NotesPage.handleAIAdvice()" />
            <button class="btn btn-primary" onclick="NotesPage.handleAIAdvice()" style="padding:0 16px; border-radius:8px;" title="Отправить">
              <i data-lucide="send" style="width:16px;height:16px;"></i>
            </button>
          </div>
        </div>

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

  async saveActiveNote(silent = false) {
    if (!this.activeNoteId) return;
    
    const titleEl = document.getElementById('editor-title');
    const contentEl = document.getElementById('editor-content');
    if (!titleEl || !contentEl) return;

    const title = titleEl.value.trim() || 'Без заголовка';
    const textContent = contentEl.value.trim();
    const content = textContent + (this.currentChatHistory && this.currentChatHistory.length > 0 ? '\\n\\n===AI_CHAT_START===\\n' + JSON.stringify(this.currentChatHistory) : '');
    
    const mood = document.getElementById('editor-mood').value;
    const tagsStr = document.getElementById('editor-tags').value;
    const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);

    try {
      await DB.updateNote(this.activeNoteId, { title, content, mood, tags });
      if (!silent) UI.toast('Сохранено', 'success');
      
      const noteIdx = this.notes.findIndex(n => n.id === this.activeNoteId);
      if (noteIdx >= 0) {
        this.notes[noteIdx] = { 
          ...this.notes[noteIdx], 
          title, content, mood, tags, 
          updated_at: new Date().toISOString() 
        };
        this.notes.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        this.renderSidebar();
        
        const timeEl = document.querySelector('.notes-editor-header div:last-child');
        if (timeEl && timeEl.innerHTML.includes('Изменено')) {
          timeEl.innerHTML = `<i data-lucide="clock" style="width:14px;height:14px;"></i> Изменено: только что`;
          if (window.lucide) window.lucide.createIcons();
        }
      }
    } catch (e) {
      console.error(e);
      if (!silent) UI.toast('Ошибка при сохранении', 'error');
    }
  },

  async handleAIRewrite() {
    const contentEl = document.getElementById('editor-content');
    if (!contentEl) return;
    const content = contentEl.value.trim();
    if (!content) {
      UI.toast('Напишите что-нибудь, чтобы ИИ мог улучшить текст', 'warning');
      return;
    }

    const loader = document.getElementById('ai-loading');
    if (loader) loader.style.display = 'flex';

    try {
      const rewritten = await Gemini.assistWithNote(content, '', 'rewrite');
      contentEl.value = rewritten;
      await this.saveActiveNote(true);
      UI.toast('Текст успешно улучшен!', 'success');
    } catch (e) {
      console.error(e);
      UI.toast('Ошибка ИИ: ' + e.message, 'error');
    } finally {
      if (loader) loader.style.display = 'none';
    }
  },

  async handleAIAdvice() {
    const promptEl = document.getElementById('ai-prompt-input');
    const contentEl = document.getElementById('editor-content');
    if (!promptEl || !contentEl) return;

    const prompt = promptEl.value.trim();
    const content = contentEl.value.trim();
    if (!prompt) return;

    const loader = document.getElementById('ai-loading');
    if (loader) loader.style.display = 'flex';

    try {
      const advice = await Gemini.assistWithNote(content, prompt, 'advice');
      
      if (!this.currentChatHistory) this.currentChatHistory = [];
      this.currentChatHistory.push({ role: 'user', content: prompt });
      this.currentChatHistory.push({ role: 'assistant', content: advice });
      
      const chatContainer = document.getElementById('ai-chat-container');
      if (chatContainer) {
        chatContainer.innerHTML = this.renderChatMessages(this.currentChatHistory);
        if (window.lucide) window.lucide.createIcons();
      }
      
      promptEl.value = '';
      await this.saveActiveNote(true);
      
      const bodyEl = document.querySelector('.notes-editor-body');
      if (bodyEl) bodyEl.scrollTop = bodyEl.scrollHeight;
      
      UI.toast('Ответ ИИ добавлен', 'success');
    } catch (e) {
      console.error(e);
      UI.toast('Ошибка ИИ: ' + e.message, 'error');
    } finally {
      if (loader) loader.style.display = 'none';
    }
  },

  renderChatMessages(chatHistory) {
    if (!chatHistory || chatHistory.length === 0) return '';
    return chatHistory.map(msg => `
      <div style="display:flex; gap:12px; align-items:flex-start; background: ${msg.role === 'assistant' ? 'rgba(var(--accent-rgb),0.05)' : 'var(--bg-surface)'}; padding:16px; border-radius:12px; border:1px solid ${msg.role === 'assistant' ? 'var(--accent-soft)' : 'var(--border-light)'};">
        <div style="width:28px;height:28px;border-radius:50%;background:${msg.role === 'assistant' ? 'var(--accent)' : 'var(--border)'};display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;">
          <i data-lucide="${msg.role === 'assistant' ? 'bot' : 'user'}" style="width:16px;height:16px;"></i>
        </div>
        <div style="flex:1; font-size:14px; line-height:1.6; color:var(--text-primary); white-space:pre-wrap;">${this.esc(msg.content)}</div>
      </div>
    `).join('');
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
