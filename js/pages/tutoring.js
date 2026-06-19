// ============================================
// TUTORING PAGE — English lessons management
// ============================================

const TutoringPage = {
  students: [],
  lessons: [],

  render() {
    return `
      <div class="tutoring-page" style="display:flex;flex-direction:column;height:100%;background:var(--bg-primary);">
        <div class="page-header" style="background:var(--bg-surface);padding:var(--space-lg) var(--space-xl);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
          <div>
            <div class="page-title" style="font-size:20px;font-weight:700;">Репетиторство 🇬🇧</div>
            <div class="page-subtitle" id="tutoring-count-label" style="font-size:13px;color:var(--text-secondary);margin-top:2px;">Загрузка данных…</div>
          </div>
          <div class="page-actions" style="display:flex;gap:8px;">
            <button class="btn btn-secondary" id="add-student-btn" style="display:flex;align-items:center;gap:6px;">
              <i data-lucide="user-plus"></i>
              Ученик
            </button>
            <button class="btn btn-primary" id="add-lesson-btn" style="display:flex;align-items:center;gap:6px;">
              <i data-lucide="plus"></i>
              Урок
            </button>
          </div>
        </div>

        <div style="padding:var(--space-xl);display:flex;flex-direction:column;gap:var(--space-xl);flex:1;overflow-y:auto;align-content:start;">
          
          <h3 style="font-size: 15px; margin-bottom: -10px; display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--text-primary);">
            <i data-lucide="users" style="color: var(--accent); width: 18px; height: 18px;"></i>
            Мои ученики
          </h3>
          <div id="students-list-container" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:var(--space-lg);"></div>
          
          <h3 style="font-size: 15px; margin-top: 10px; margin-bottom: -10px; display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--text-primary);">
            <i data-lucide="calendar" style="color: var(--success); width: 18px; height: 18px;"></i>
            История уроков
          </h3>
          <div id="lessons-list-container" style="display:flex;flex-direction:column;gap:12px;"></div>

        </div>

        <!-- Student Modal -->
        <div id="student-modal" class="modal-overlay hidden">
          <div class="modal">
            <div class="modal-header">
              <h2 class="modal-title" id="student-modal-title"><i data-lucide="user"></i> Карточка ученика</h2>
              <button class="modal-close" id="student-modal-close"><i data-lucide="x"></i></button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Имя ученика *</label>
                <input id="st-name" type="text" class="form-input" placeholder="Например: Соня Коршук" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Класс / Уровень</label>
                  <input id="st-grade" type="text" class="form-input" placeholder="Например: 5 класс" />
                </div>
                <div class="form-group">
                  <label class="form-label">Стоимость урока (BYN)</label>
                  <input id="st-price" type="number" step="0.1" class="form-input" value="0" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Расписание</label>
                <input id="st-schedule" type="text" class="form-input" placeholder="Например: Пн 18:00, Вс утро" />
              </div>
              <div class="form-group" style="display:flex;align-items:center;gap:8px;margin-top:8px;">
                <input id="st-active" type="checkbox" checked />
                <label for="st-active" style="font-size:13px;color:var(--text-primary);">Активный ученик</label>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-ghost danger" id="student-modal-delete" style="display:none;">Удалить</button>
              <div style="flex:1"></div>
              <button class="btn btn-secondary" id="student-modal-cancel">Отмена</button>
              <button class="btn btn-primary" id="student-modal-save">Сохранить</button>
            </div>
          </div>
        </div>

        <!-- Lesson Modal -->
        <div id="lesson-modal" class="modal-overlay hidden">
          <div class="modal">
            <div class="modal-header">
              <h2 class="modal-title" id="lesson-modal-title"><i data-lucide="book-open"></i> Запись об уроке</h2>
              <button class="modal-close" id="lesson-modal-close"><i data-lucide="x"></i></button>
            </div>
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Ученик *</label>
                  <select id="ls-student" class="form-input"></select>
                </div>
                <div class="form-group">
                  <label class="form-label">Дата и время *</label>
                  <input id="ls-date" type="datetime-local" class="form-input" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Тема урока</label>
                <input id="ls-topic" type="text" class="form-input" placeholder="Например: Past Simple" />
              </div>
              <div class="form-group">
                <label class="form-label">Домашнее задание</label>
                <textarea id="ls-homework" class="form-input" rows="2" placeholder="Что задано на следующий раз?"></textarea>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Статус урока</label>
                  <select id="ls-status" class="form-input">
                    <option value="Запланирован">Запланирован</option>
                    <option value="Проведен">Проведен</option>
                    <option value="Отменен">Отменен</option>
                  </select>
                </div>
                <div class="form-group" style="display:flex;align-items:center;padding-top:28px;">
                  <input id="ls-paid" type="checkbox" />
                  <label for="ls-paid" style="font-size:13px;color:var(--text-primary);margin-left:8px;">Урок оплачен</label>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-ghost danger" id="lesson-modal-delete" style="display:none;">Удалить</button>
              <div style="flex:1"></div>
              <button class="btn btn-secondary" id="lesson-modal-cancel">Отмена</button>
              <button class="btn btn-primary" id="lesson-modal-save">Сохранить</button>
            </div>
          </div>
        </div>

      </div>
    `;
  },

  async init() {
    this.bindEvents();
    await this.load();
  },

  bindEvents() {
    document.getElementById('add-student-btn').addEventListener('click', () => this.openStudentModal());
    document.getElementById('add-lesson-btn').addEventListener('click', () => this.openLessonModal());
  },

  async load() {
    try {
      [this.students, this.lessons] = await Promise.all([
        DB.getStudents(),
        DB.getLessons()
      ]);
      this.renderContent();
    } catch (e) {
      console.error(e);
    }
  },

  renderContent() {
    const sContainer = document.getElementById('students-list-container');
    const lContainer = document.getElementById('lessons-list-container');
    const countLabel = document.getElementById('tutoring-count-label');

    const activeSt = this.students.filter(s => s.active).length;
    countLabel.textContent = `${activeSt} активных учеников · ${this.lessons.length} уроков всего`;

    // Render Students
    if (this.students.length === 0) {
      sContainer.innerHTML = `<div style="color:var(--text-muted);font-size:13px;grid-column:1/-1;">Нет добавленных учеников. Нажмите «Ученик», чтобы добавить.</div>`;
    } else {
      sContainer.innerHTML = this.students.map(st => {
        const opacity = st.active ? '1' : '0.5';
        return `
          <div class="glass-panel" data-id="${st.id}" style="padding:16px;border-radius:12px;cursor:pointer;opacity:${opacity};transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
            <div style="display:flex;justify-content:space-between;align-items:start;">
              <div>
                <div style="font-weight:600;font-size:15px;color:var(--text-primary);display:flex;align-items:center;gap:6px;">
                  ${this.escapeHtml(st.name)}
                  ${!st.active ? '<span style="font-size:10px;background:var(--bg-secondary);padding:2px 6px;border-radius:10px;">Архив</span>' : ''}
                </div>
                <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">${this.escapeHtml(st.grade || '—')}</div>
              </div>
              <div style="font-weight:700;color:var(--accent);font-size:14px;">${st.price} BYN</div>
            </div>
            <div style="margin-top:12px;font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:6px;">
              <i data-lucide="clock" style="width:12px;height:12px;"></i>
              ${this.escapeHtml(st.schedule || 'Расписание не задано')}
            </div>
          </div>
        `;
      }).join('');
    }

    // Render Lessons
    if (this.lessons.length === 0) {
      lContainer.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:16px 0;">История уроков пуста.</div>`;
    } else {
      lContainer.innerHTML = this.lessons.map(ls => {
        const d = new Date(ls.date);
        const dateStr = d.toLocaleDateString('ru-RU', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
        
        let statusColor = 'var(--accent)';
        let statusIcon = 'calendar';
        if (ls.status === 'Проведен') { statusColor = 'var(--success)'; statusIcon = 'check-circle'; }
        if (ls.status === 'Отменен') { statusColor = 'var(--text-muted)'; statusIcon = 'x-circle'; }
        
        return `
          <div class="glass-panel lesson-card" data-id="${ls.id}" style="padding:12px 16px;border-radius:12px;display:flex;align-items:center;gap:16px;cursor:pointer;border-left:4px solid ${statusColor};">
            <div style="flex-shrink:0;width:90px;font-size:13px;font-weight:500;color:var(--text-secondary);">
              ${dateStr}
            </div>
            <div style="flex:1;">
              <div style="font-weight:600;font-size:14px;color:var(--text-primary);display:flex;align-items:center;gap:6px;">
                ${this.escapeHtml(ls.students?.name || 'Неизвестно')}
                ${ls.paid ? '<span style="font-size:10px;background:var(--success);color:white;padding:2px 6px;border-radius:10px;font-weight:600;">ОПЛАЧЕНО</span>' : ''}
              </div>
              <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">
                <span style="color:var(--text-primary);font-weight:500;">Тема:</span> ${this.escapeHtml(ls.topic || '—')} 
                <span style="margin:0 4px;color:var(--border);">|</span>
                <span style="color:var(--text-primary);font-weight:500;">ДЗ:</span> ${this.escapeHtml(ls.homework || '—')}
              </div>
            </div>
            <div style="color:${statusColor};display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;">
              <i data-lucide="${statusIcon}" style="width:14px;height:14px;"></i>
              ${ls.status}
            </div>
          </div>
        `;
      }).join('');
    }

    if (window.lucide) window.lucide.createIcons();

    // Bind card clicks
    sContainer.querySelectorAll('.glass-panel').forEach(card => {
      card.addEventListener('click', () => this.openStudentModal(card.dataset.id));
    });
    lContainer.querySelectorAll('.lesson-card').forEach(card => {
      card.addEventListener('click', () => this.openLessonModal(card.dataset.id));
    });
  },

  // ---- STUDENT MODAL ----
  openStudentModal(id = null) {
    const st = id ? this.students.find(s => s.id === id) : null;
    const modal = document.getElementById('student-modal');
    
    document.getElementById('st-name').value = st ? st.name : '';
    document.getElementById('st-grade').value = st ? (st.grade || '') : '';
    document.getElementById('st-price').value = st ? st.price : 0;
    document.getElementById('st-schedule').value = st ? (st.schedule || '') : '';
    document.getElementById('st-active').checked = st ? st.active : true;

    const delBtn = document.getElementById('student-modal-delete');
    delBtn.style.display = st ? '' : 'none';

    document.getElementById('student-modal-save').onclick = () => this.saveStudent(st?.id);
    document.getElementById('student-modal-cancel').onclick = () => modal.classList.add('hidden');
    document.getElementById('student-modal-close').onclick = () => modal.classList.add('hidden');
    delBtn.onclick = () => { modal.classList.add('hidden'); this.deleteStudent(st?.id); };

    modal.classList.remove('hidden');
  },

  async saveStudent(id = null) {
    const name = document.getElementById('st-name').value.trim();
    if (!name) return UI.toast('Введите имя ученика', 'warning');

    const data = {
      name,
      grade: document.getElementById('st-grade').value,
      price: parseFloat(document.getElementById('st-price').value) || 0,
      schedule: document.getElementById('st-schedule').value,
      active: document.getElementById('st-active').checked
    };

    try {
      if (id) await DB.updateStudent(id, data);
      else await DB.createStudent(data);
      document.getElementById('student-modal').classList.add('hidden');
      UI.toast('Ученик сохранен', 'success');
      await this.load();
    } catch(e) { UI.toast('Ошибка: ' + e.message, 'error'); }
  },

  async deleteStudent(id) {
    if (!confirm('Удалить ученика и все его уроки?')) return;
    try {
      await DB.deleteStudent(id);
      UI.toast('Ученик удален', 'info');
      await this.load();
    } catch(e) { UI.toast('Ошибка: ' + e.message, 'error'); }
  },

  // ---- LESSON MODAL ----
  openLessonModal(id = null) {
    if (this.students.length === 0) return UI.toast('Сначала добавьте ученика', 'warning');
    
    const ls = id ? this.lessons.find(l => l.id === id) : null;
    const modal = document.getElementById('lesson-modal');
    
    const sSelect = document.getElementById('ls-student');
    sSelect.innerHTML = this.students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    if (ls) sSelect.value = ls.student_id;

    // Set date to now if new
    const dStr = ls ? new Date(ls.date).toISOString().slice(0,16) : new Date().toLocaleString('sv-SE', {timeZone: 'Europe/Minsk'}).replace(' ', 'T').slice(0,16);
    document.getElementById('ls-date').value = dStr;
    
    document.getElementById('ls-topic').value = ls ? (ls.topic || '') : '';
    document.getElementById('ls-homework').value = ls ? (ls.homework || '') : '';
    document.getElementById('ls-status').value = ls ? ls.status : 'Запланирован';
    document.getElementById('ls-paid').checked = ls ? ls.paid : false;

    const delBtn = document.getElementById('lesson-modal-delete');
    delBtn.style.display = ls ? '' : 'none';

    document.getElementById('lesson-modal-save').onclick = () => this.saveLesson(ls?.id);
    document.getElementById('lesson-modal-cancel').onclick = () => modal.classList.add('hidden');
    document.getElementById('lesson-modal-close').onclick = () => modal.classList.add('hidden');
    delBtn.onclick = () => { modal.classList.add('hidden'); this.deleteLesson(ls?.id); };

    modal.classList.remove('hidden');
  },

  async saveLesson(id = null) {
    const student_id = document.getElementById('ls-student').value;
    const dStr = document.getElementById('ls-date').value;
    if (!student_id || !dStr) return UI.toast('Заполните обязательные поля', 'warning');

    const data = {
      student_id,
      date: new Date(dStr).toISOString(),
      topic: document.getElementById('ls-topic').value,
      homework: document.getElementById('ls-homework').value,
      status: document.getElementById('ls-status').value,
      paid: document.getElementById('ls-paid').checked
    };

    try {
      if (id) await DB.updateLesson(id, data);
      else await DB.createLesson(data);
      document.getElementById('lesson-modal').classList.add('hidden');
      UI.toast('Урок сохранен', 'success');
      await this.load();
    } catch(e) { UI.toast('Ошибка: ' + e.message, 'error'); }
  },

  async deleteLesson(id) {
    if (!confirm('Удалить урок?')) return;
    try {
      await DB.deleteLesson(id);
      UI.toast('Урок удален', 'info');
      await this.load();
    } catch(e) { UI.toast('Ошибка: ' + e.message, 'error'); }
  },

  escapeHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
