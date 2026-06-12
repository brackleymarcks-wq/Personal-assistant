// ============================================
// NOTES / JOURNAL PAGE
// ============================================

const NotesPage = {
  notes: [],

  render() {
    return `
      <div class="notes-page">
        <div class="page-header">
          <div>
            <div class="page-title">Дневник и Заметки</div>
            <div class="page-subtitle" id="notes-count">Загрузка...</div>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" onclick="NotesPage.openModal()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
              Новая заметка
            </button>
          </div>
        </div>
        <div class="notes-list" id="notes-list">
          <div style="text-align:center;padding:var(--space-2xl);color:var(--text-muted)">Загрузка…</div>
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
      this.renderList();
    } catch (e) {
      console.error('Notes load error:', e);
    }
  },

  renderList() {
    const list = document.getElementById('notes-list');
    const count = document.getElementById('notes-count');
    
    if (count) count.textContent = `${this.notes.length} записей`;

    if (this.notes.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <div class="empty-text">Нет заметок</div>
          <div class="empty-subtext">Запиши свои мысли, идеи или итоги дня</div>
        </div>
      `;
      return;
    }

    list.innerHTML = this.notes.map(note => `
      <div class="note-card" onclick="NotesPage.openModal('${note.id}')">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="display:flex;align-items:flex-start;gap:var(--space-sm)">
            <div class="note-mood">${note.mood || '📝'}</div>
            <div>
              <div class="note-title">${this.esc(note.title)}</div>
              <div class="note-date">${new Date(note.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        </div>
        <div class="note-preview" style="margin-top:var(--space-sm)">${this.esc(note.content)}</div>
        ${note.tags ? `
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:var(--space-md)">
            ${note.tags.map(tag => `<span class="knowledge-tag">#${this.esc(tag)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');
  },

  openModal(id = null) {
    const note = id ? this.notes.find(n => n.id === id) : null;
    const isNew = !note;
    
    const content = `
      <div class="form-group">
        <input type="text" id="note-title" class="form-input" placeholder="Заголовок заметки" style="font-size:18px;font-weight:600;border:none;background:transparent;padding:0;box-shadow:none" value="${note ? this.esc(note.title) : ''}">
      </div>
      <div class="form-group">
        <textarea id="note-content" class="form-input" placeholder="О чем думаешь?" style="min-height:200px;border:none;background:transparent;padding:0;box-shadow:none;font-size:14px">${note ? this.esc(note.content) : ''}</textarea>
      </div>
      <div class="form-row" style="margin-top:var(--space-md)">
        <div class="form-group">
          <label class="form-label">Настроение</label>
          <select id="note-mood" class="form-input">
            <option value="📝" ${note?.mood === '📝' ? 'selected' : ''}>📝 Нейтральное</option>
            <option value="🚀" ${note?.mood === '🚀' ? 'selected' : ''}>🚀 Продуктивное</option>
            <option value="😊" ${note?.mood === '😊' ? 'selected' : ''}>😊 Радостное</option>
            <option value="🤔" ${note?.mood === '🤔' ? 'selected' : ''}>🤔 Задумчивое</option>
            <option value="😫" ${note?.mood === '😫' ? 'selected' : ''}>😫 Усталое</option>
            <option value="💡" ${note?.mood === '💡' ? 'selected' : ''}>💡 Инсайт</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Теги (через запятую)</label>
          <input type="text" id="note-tags" class="form-input" placeholder="идеи, дневник, проект..." value="${note?.tags ? this.esc(note.tags.join(', ')) : ''}">
        </div>
      </div>
    `;

    const footer = `
      ${!isNew ? `<button class="btn btn-danger" onclick="NotesPage.deleteNote('${id}')">Удалить</button>` : '<div></div>'}
      <div style="display:flex;gap:var(--space-sm);margin-left:auto">
        <button class="btn btn-secondary" onclick="UI.closeModal()">Отмена</button>
        <button class="btn btn-primary" onclick="NotesPage.saveNote('${id || ''}')">Сохранить</button>
      </div>
    `;

    UI.openModal(isNew ? 'Новая заметка' : 'Редактировать заметку', content, footer);
  },

  async saveNote(id) {
    const title = document.getElementById('note-title').value.trim() || 'Без заголовка';
    const content = document.getElementById('note-content').value.trim();
    const mood = document.getElementById('note-mood').value;
    const tagsStr = document.getElementById('note-tags').value;
    const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);

    if (!content) {
      UI.toast('Текст заметки не может быть пустым', 'error');
      return;
    }

    try {
      if (id) {
        await DB.updateNote(id, { title, content, mood, tags });
        UI.toast('Заметка обновлена', 'success');
      } else {
        await DB.createNote({ title, content, mood, tags });
        UI.toast('Заметка создана', 'success');
      }
      UI.closeModal();
      this.load();
    } catch (e) {
      console.error(e);
      UI.toast('Ошибка при сохранении', 'error');
    }
  },

  async deleteNote(id) {
    if (!confirm('Точно удалить заметку?')) return;
    try {
      await DB.deleteNote(id);
      UI.closeModal();
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
