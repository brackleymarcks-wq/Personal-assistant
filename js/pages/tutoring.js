// ============================================
// TUTORING PAGE — English lessons management
// ============================================

const TutoringPage = {
  students: [],
  lessons: [],

  render() {
    return `
      <div class="tutoring-page" style="display:flex;flex-direction:column;height:100%;background:var(--bg-primary);">
        <div class="page-header" style="background:var(--bg-surface);padding:var(--space-lg) var(--space-xl);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;z-index:10;">
          <div>
            <div class="page-title" style="font-size:24px;font-weight:800;background:linear-gradient(90deg, var(--accent), var(--accent-vibrant));-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Репетиторство 🇬🇧</div>
            <div class="page-subtitle" id="tutoring-subtitle" style="font-size:13px;color:var(--text-secondary);margin-top:4px;">Управление учениками и финансами</div>
          </div>
          <div class="page-actions" style="display:flex;gap:12px;">
            <button class="btn btn-secondary" id="add-student-btn" style="display:flex;align-items:center;gap:6px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
              <i data-lucide="user-plus" style="width:16px;height:16px;"></i>
              Добавить ученика
            </button>
            <button class="btn btn-primary" id="add-lesson-btn" style="display:flex;align-items:center;gap:6px;border-radius:12px;box-shadow:0 4px 12px var(--accent-alpha);">
              <i data-lucide="plus" style="width:16px;height:16px;"></i>
              Новый урок
            </button>
          </div>
        </div>

        <div style="padding:var(--space-xl);display:flex;flex-direction:column;gap:var(--space-xl);flex:1;overflow-y:auto;">
          
          <!-- Metrics Dashboard -->
          <div id="tutoring-metrics-container" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:var(--space-lg);">
            <!-- Metrics will be injected here -->
          </div>
          
          <!-- 2 Column Layout -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-xl);align-items:start;">
            
            <!-- Left Column: Students -->
            <div style="display:flex;flex-direction:column;gap:var(--space-md);">
              <h3 style="font-size:16px;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
                <i data-lucide="users" style="color:var(--accent);width:18px;height:18px;"></i> Мои ученики
              </h3>
              <div id="students-list-container" style="display:flex;flex-direction:column;gap:var(--space-md);"></div>
            </div>

            <!-- Right Column: Lessons -->
            <div style="display:flex;flex-direction:column;gap:var(--space-xl);">
              
              <div style="display:flex;flex-direction:column;gap:var(--space-md);">
                <h3 style="font-size:16px;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
                  <i data-lucide="calendar-clock" style="color:var(--warning);width:18px;height:18px;"></i> Ближайшие уроки
                </h3>
                <div id="upcoming-lessons-container" style="display:flex;flex-direction:column;gap:12px;"></div>
              </div>

              <div style="display:flex;flex-direction:column;gap:var(--space-md);">
                <h3 style="font-size:16px;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
                  <i data-lucide="history" style="color:var(--text-secondary);width:18px;height:18px;"></i> История уроков
                </h3>
                <div id="lessons-list-container" style="display:flex;flex-direction:column;gap:12px;"></div>
              </div>

            </div>
          </div>

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
    const uContainer = document.getElementById('upcoming-lessons-container');
    const lContainer = document.getElementById('lessons-list-container');
    const metricsContainer = document.getElementById('tutoring-metrics-container');

    const activeSt = this.students.filter(s => s.active).length;
    
    // Calculate Monthly Income & Stats
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let monthlyIncome = 0;
    let lessonsThisMonth = 0;
    let unpaidLessonsAmount = 0;

    this.lessons.forEach(ls => {
      const d = new Date(ls.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        lessonsThisMonth++;
        if (ls.status === 'Проведен') {
          // Find student price
          const st = this.students.find(s => s.id === ls.student_id);
          const price = st ? (st.price || 0) : 0;
          monthlyIncome += price;
          if (!ls.paid) {
            unpaidLessonsAmount += price;
          }
        }
      }
    });

    // Render Metrics
    metricsContainer.innerHTML = `
      <div class="glass-panel" style="padding:20px;border-radius:16px;display:flex;align-items:center;gap:16px;background:linear-gradient(145deg, var(--bg-surface), var(--bg-primary));border:1px solid var(--border-light);">
        <div style="width:48px;height:48px;border-radius:12px;background:var(--accent-alpha);color:var(--accent);display:flex;align-items:center;justify-content:center;">
          <i data-lucide="users" style="width:24px;height:24px;"></i>
        </div>
        <div>
          <div style="font-size:13px;color:var(--text-secondary);font-weight:500;">Активных учеников</div>
          <div style="font-size:24px;font-weight:800;color:var(--text-primary);">${activeSt}</div>
        </div>
      </div>
      <div class="glass-panel" style="padding:20px;border-radius:16px;display:flex;align-items:center;gap:16px;background:linear-gradient(145deg, var(--bg-surface), var(--bg-primary));border:1px solid var(--border-light);">
        <div style="width:48px;height:48px;border-radius:12px;background:rgba(16, 185, 129, 0.1);color:var(--success);display:flex;align-items:center;justify-content:center;">
          <i data-lucide="wallet" style="width:24px;height:24px;"></i>
        </div>
        <div>
          <div style="font-size:13px;color:var(--text-secondary);font-weight:500;">Заработано в ${now.toLocaleString('ru', {month:'long'})}</div>
          <div style="font-size:24px;font-weight:800;color:var(--text-primary);">${monthlyIncome} <span style="font-size:14px;color:var(--text-muted);font-weight:600;">BYN</span></div>
        </div>
      </div>
      <div class="glass-panel" style="padding:20px;border-radius:16px;display:flex;align-items:center;gap:16px;background:linear-gradient(145deg, var(--bg-surface), var(--bg-primary));border:1px solid var(--border-light);">
        <div style="width:48px;height:48px;border-radius:12px;background:rgba(245, 158, 11, 0.1);color:var(--warning);display:flex;align-items:center;justify-content:center;">
          <i data-lucide="book-open-check" style="width:24px;height:24px;"></i>
        </div>
        <div>
          <div style="font-size:13px;color:var(--text-secondary);font-weight:500;">Уроков за месяц</div>
          <div style="font-size:24px;font-weight:800;color:var(--text-primary);">${lessonsThisMonth}</div>
        </div>
      </div>
    `;

    // Render Students
    if (this.students.length === 0) {
      sContainer.innerHTML = `<div class="empty-state" style="padding:32px;background:var(--bg-surface);border-radius:16px;text-align:center;"><i data-lucide="user-plus" style="width:32px;height:32px;opacity:0.3;margin-bottom:12px;"></i><br><span style="color:var(--text-secondary);font-size:14px;">Нет добавленных учеников</span></div>`;
    } else {
      sContainer.innerHTML = this.students.map(st => {
        const opacity = st.active ? '1' : '0.5';
        
        // Find unpaid lessons for this student
        const unpaidCount = this.lessons.filter(l => l.student_id === st.id && l.status === 'Проведен' && !l.paid).length;
        const debtBadge = unpaidCount > 0 ? `<div style="background:rgba(239, 68, 68, 0.1);color:var(--danger);font-size:11px;font-weight:700;padding:2px 8px;border-radius:12px;border:1px solid rgba(239,68,68,0.2);">Не оплачено: ${unpaidCount}</div>` : '';

        return `
          <div class="glass-panel" data-id="${st.id}" style="padding:20px;border-radius:16px;cursor:pointer;opacity:${opacity};transition:all 0.2s;background:var(--bg-surface);border:1px solid var(--border-light);position:relative;overflow:hidden;" onmouseover="this.style.transform='translateY(-2px)';this.style.borderColor='var(--accent)';" onmouseout="this.style.transform='none';this.style.borderColor='var(--border-light)';">
            ${!st.active ? '<div style="position:absolute;top:12px;right:12px;font-size:10px;background:var(--bg-secondary);padding:2px 8px;border-radius:12px;font-weight:600;">АРХИВ</div>' : ''}
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:16px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg, var(--accent), var(--accent-vibrant));color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;box-shadow:0 2px 8px var(--accent-alpha);">
                  ${st.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style="font-weight:700;font-size:16px;color:var(--text-primary);">${this.escapeHtml(st.name)}</div>
                  <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${this.escapeHtml(st.grade || 'Уровень не указан')}</div>
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-weight:800;color:var(--accent);font-size:16px;">${st.price} <span style="font-size:12px;">BYN</span></div>
              </div>
            </div>
            
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary);background:var(--bg-primary);padding:4px 8px;border-radius:8px;">
                <i data-lucide="clock" style="width:14px;height:14px;color:var(--accent);"></i>
                ${this.escapeHtml(st.schedule || 'Нет расписания')}
              </div>
              ${debtBadge}
            </div>
          </div>
        `;
      }).join('');
    }

    // Split Lessons into Upcoming and History
    const upcoming = [];
    const history = [];
    this.lessons.forEach(ls => {
      if (ls.status === 'Запланирован') upcoming.push(ls);
      else history.push(ls);
    });

    const renderLessonList = (list, containerId, emptyText) => {
      const container = document.getElementById(containerId);
      if (list.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:16px;background:var(--bg-surface);border-radius:12px;text-align:center;border:1px dashed var(--border-light);">${emptyText}</div>`;
      } else {
        container.innerHTML = list.map(ls => {
          const d = new Date(ls.date);
          const isToday = d.toDateString() === now.toDateString();
          const dateStr = d.toLocaleDateString('ru-RU', { day:'numeric', month:'short' });
          const timeStr = d.toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' });
          
          let statusColor = 'var(--accent)';
          let statusIcon = 'calendar';
          if (ls.status === 'Проведен') { statusColor = 'var(--success)'; statusIcon = 'check-circle'; }
          if (ls.status === 'Отменен') { statusColor = 'var(--text-muted)'; statusIcon = 'x-circle'; }
          
          const studentName = ls.students?.name || 'Ученик';

          return `
            <div class="glass-panel lesson-card" data-id="${ls.id}" style="padding:14px;border-radius:12px;display:flex;align-items:center;gap:16px;cursor:pointer;border-left:4px solid ${statusColor};background:var(--bg-surface);transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
              <div style="flex-shrink:0;width:56px;text-align:center;">
                <div style="font-size:12px;color:${isToday ? 'var(--accent)' : 'var(--text-secondary)'};font-weight:700;text-transform:uppercase;">${isToday ? 'СЕГОДНЯ' : dateStr}</div>
                <div style="font-size:16px;font-weight:800;color:var(--text-primary);">${timeStr}</div>
              </div>
              <div style="flex:1;border-left:1px solid var(--border-light);padding-left:16px;">
                <div style="font-weight:700;font-size:15px;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
                  ${this.escapeHtml(studentName)}
                  ${ls.status === 'Проведен' ? (ls.paid ? '<span style="font-size:10px;background:rgba(16,185,129,0.1);color:var(--success);padding:2px 6px;border-radius:8px;font-weight:700;">ОПЛАЧЕНО</span>' : '<span style="font-size:10px;background:rgba(239,68,68,0.1);color:var(--danger);padding:2px 6px;border-radius:8px;font-weight:700;">НЕ ОПЛАЧЕНО</span>') : ''}
                </div>
                <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;display:flex;flex-direction:column;gap:2px;">
                  ${ls.topic ? `<div style="display:flex;align-items:center;gap:6px;"><i data-lucide="book" style="width:12px;height:12px;"></i> <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.escapeHtml(ls.topic)}</span></div>` : ''} 
                  ${ls.homework ? `<div style="display:flex;align-items:center;gap:6px;"><i data-lucide="edit-3" style="width:12px;height:12px;"></i> <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.escapeHtml(ls.homework)}</span></div>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    };

    // Sort upcoming ascending (nearest first), history descending (newest first)
    upcoming.sort((a,b) => new Date(a.date) - new Date(b.date));
    history.sort((a,b) => new Date(b.date) - new Date(a.date));

    renderLessonList(upcoming, 'upcoming-lessons-container', 'Нет запланированных уроков');
    renderLessonList(history, 'lessons-list-container', 'История пуста');

    if (window.lucide) window.lucide.createIcons();

    // Bind card clicks
    sContainer.querySelectorAll('.glass-panel').forEach(card => {
      card.addEventListener('click', () => this.openStudentModal(card.dataset.id));
    });
    uContainer.querySelectorAll('.lesson-card').forEach(card => {
      card.addEventListener('click', () => this.openLessonModal(card.dataset.id));
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
