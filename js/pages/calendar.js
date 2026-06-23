// ============================================
// CALENDAR PAGE
// ============================================

const CalendarPage = {
  currentDate: new Date(),
  currentTab: 'events', // 'events' or 'tasks'
  events: [],
  tasks: [],
  projects: [],

  EVENT_TYPES: ['Встреча', 'Урок', 'Дедлайн', 'Личное'],
  TYPE_CLASS: {
    'Встреча': 'event-meeting',
    'Урок': 'event-lesson',
    'Дедлайн': 'event-deadline',
    'Личное': 'event-personal'
  },
  TYPE_ICON: {
    'Встреча': 'users',
    'Урок': 'book-open',
    'Дедлайн': 'zap',
    'Личное': 'user'
  },

  render() {
    return `
      <div class="calendar-page">
        <div class="page-header">
          <div>
            <div class="page-title">Календарь</div>
            <div class="page-subtitle" id="cal-subtitle">Загрузка…</div>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" id="add-event-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Новое событие
            </button>
          </div>
        </div>

        <div class="calendar-controls">
          <div style="display:flex; gap: 8px;">
            <button class="btn btn-secondary btn-sm" id="cal-tab-events" style="border-radius: 20px;">
              <i data-lucide="clock" style="width:14px;height:14px;margin-right:6px;"></i> Встречи
            </button>
            <button class="btn btn-secondary btn-sm" id="cal-tab-tasks" style="border-radius: 20px;">
              <i data-lucide="check-square" style="width:14px;height:14px;margin-right:6px;"></i> Задачи
            </button>
          </div>
          
          <div class="calendar-nav">
            <button class="btn btn-secondary btn-icon" id="cal-prev" style="border:none;background:transparent;">
              <i data-lucide="chevron-left" style="width:18px;height:18px;"></i>
            </button>
            <div class="calendar-month" id="cal-month-label"></div>
            <button class="btn btn-secondary btn-icon" id="cal-next" style="border:none;background:transparent;">
              <i data-lucide="chevron-right" style="width:18px;height:18px;"></i>
            </button>
          </div>
          <button class="btn btn-secondary btn-sm" id="cal-today">
            <i data-lucide="calendar" style="width:14px;height:14px;margin-right:6px;vertical-align:middle;"></i> Сегодня
          </button>
        </div>

        <div class="calendar-body">
          <div class="calendar-grid" id="calendar-grid"></div>
        </div>
      </div>
    `;
  },

  async init() {
    document.getElementById('add-event-btn').addEventListener('click', () => {
      console.log("Calendar add btn clicked. Tab:", this.currentTab);
      if (this.currentTab === 'tasks') {
        const today = new Date().toISOString().slice(0, 10);
        console.log("Calling TasksPage.openTaskModal...");
        if (window.TasksPage) {
          TasksPage.openTaskModal(null, { deadline: today }).catch(err => {
            console.error("Error from openTaskModal promise:", err);
            alert("Error: " + err.message);
          });
        } else {
          alert("TasksPage is not loaded!");
        }
      } else {
        this.openEventModal();
      }
    });
    document.getElementById('cal-prev').addEventListener('click', () => this.changeMonth(-1));
    document.getElementById('cal-next').addEventListener('click', () => this.changeMonth(1));
    document.getElementById('cal-today').addEventListener('click', () => {
      this.currentDate = new Date();
      this.renderCalendar();
    });
    
    document.getElementById('cal-tab-events').addEventListener('click', () => {
      this.currentTab = 'events';
      this.renderCalendar();
    });
    document.getElementById('cal-tab-tasks').addEventListener('click', () => {
      this.currentTab = 'tasks';
      this.renderCalendar();
    });

    await this.load();
  },

  async load() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const start = new Date(year, month - 1, 1).toISOString();
    const end = new Date(year, month + 2, 0).toISOString();
    [this.events, this.tasks, this.projects, this.lessons] = await Promise.all([
      DB.getEvents(start, end),
      DB.getTasks({ }),
      DB.getProjects(),
      DB.getLessons()
    ]);
    this.renderCalendar();
  },

  changeMonth(delta) {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + delta,
      1
    );
    this.load();
  },

  renderCalendar() {
    // Update active tab styles
    const tabEvents = document.getElementById('cal-tab-events');
    const tabTasks = document.getElementById('cal-tab-tasks');
    if (this.currentTab === 'events') {
      tabEvents.classList.add('btn-primary');
      tabEvents.classList.remove('btn-secondary');
      tabTasks.classList.add('btn-secondary');
      tabTasks.classList.remove('btn-primary');
    } else {
      tabTasks.classList.add('btn-primary');
      tabTasks.classList.remove('btn-secondary');
      tabEvents.classList.add('btn-secondary');
      tabEvents.classList.remove('btn-primary');
    }

    const btn = document.getElementById('add-event-btn');
    if (this.currentTab === 'events') {
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg> Новое событие`;
    } else {
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg> Новая задача`;
    }

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const now = new Date();

    document.getElementById('cal-month-label').textContent =
      new Date(year, month, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    
    const count = this.currentTab === 'events' ? this.events.length : this.tasks.length;
    const countLabel = this.currentTab === 'events' ? 'событий' : 'дедлайнов';
    document.getElementById('cal-subtitle').textContent = `${count} ${countLabel} в этом месяце`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // Monday-first week
    let startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    let html = DAY_NAMES.map(d => `<div class="calendar-day-header">${d}</div>`).join('');

    // Prev month days
    for (let i = 0; i < startDow; i++) {
      const d = new Date(year, month, -startDow + i + 1);
      html += this.renderDay(d, true, now);
    }

    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      html += this.renderDay(date, false, now);
    }

    // Next month fill
    const total = startDow + lastDay.getDate();
    const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d);
      html += this.renderDay(date, true, now);
    }

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = html;

    grid.querySelectorAll('.calendar-day').forEach(dayEl => {
      // Setup drag and drop for days
      dayEl.addEventListener('dragover', (e) => e.preventDefault());
      dayEl.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dayEl.classList.add('drag-over');
      });
      dayEl.addEventListener('dragleave', (e) => {
        if (!dayEl.contains(e.relatedTarget)) {
          dayEl.classList.remove('drag-over');
        }
      });
      dayEl.addEventListener('drop', async (e) => {
        e.preventDefault();
        dayEl.classList.remove('drag-over');
        
        try {
          const dataStr = e.dataTransfer.getData('text/plain');
          if (!dataStr) return;
          const data = JSON.parse(dataStr);
          const newDateStr = dayEl.dataset.date;
          
          if (data.type === 'task') {
             // Optimistic update optional, but we can just reload
             await DB.updateTask(data.id, { deadline: newDateStr });
             UI.toast('Дедлайн задачи перенесен', 'success');
           } else if (data.type === 'event') {
             const ev = this.events.find(x => x.id === data.id);
             if (ev && ev.start_at) {
                const oldStart = new Date(ev.start_at);
                const newStart = new Date(newDateStr);
                newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), oldStart.getSeconds());
                
                let updates = { start_at: newStart.toISOString() };
                
                if (ev.end_at) {
                  const oldEnd = new Date(ev.end_at);
                  const durationMs = oldEnd.getTime() - oldStart.getTime();
                  const newEnd = new Date(newStart.getTime() + durationMs);
                  updates.end_at = newEnd.toISOString();
                }
                
                await DB.updateEvent(data.id, updates);
                UI.toast('Событие перенесено', 'success');
             }
           } else if (data.type === 'lesson') {
             const ls = this.lessons.find(x => x.id === data.id);
             if (ls && ls.date) {
                const oldStart = new Date(ls.date);
                const newStart = new Date(newDateStr);
                newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), oldStart.getSeconds());
                
                await DB.updateLesson(data.id, { date: newStart.toISOString() });
                UI.toast('Урок перенесен', 'success');
             }
           }
           await this.load(); // Refresh data and re-render
         } catch (err) {
           console.error('Drop error:', err);
           UI.toast('Ошибка при переносе', 'error');
         }
       });

      dayEl.addEventListener('click', () => {
        const dateStr = dayEl.dataset.date;
        console.log("Day clicked:", dateStr, "Tab:", this.currentTab);
        if (this.currentTab === 'tasks') {
          console.log("Calling TasksPage.openTaskModal for date:", dateStr);
          if (window.TasksPage) {
            TasksPage.openTaskModal(null, { deadline: dateStr }).catch(err => {
              console.error(err);
              alert("Error: " + err.message);
            });
          } else {
            alert("TasksPage is not loaded!");
          }
        } else {
          this.openEventModal(null, dateStr);
        }
      });
    });

    grid.querySelectorAll('.calendar-event').forEach(evEl => {
      // Drag start & end
      evEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ id: evEl.dataset.id, type: evEl.dataset.type }));
        setTimeout(() => evEl.classList.add('dragging'), 0);
      });
      evEl.addEventListener('dragend', () => {
        evEl.classList.remove('dragging');
        grid.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('drag-over'));
      });
      evEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = evEl.dataset.id;
        const type = evEl.dataset.type;
        if (type === 'task') {
          const t = this.tasks.find(x => x.id === id);
          if (t) {
            const isDone = t.status === 'Готово';
            const bodyHtml = `
              <div style="display: flex; flex-direction: column; gap: 16px; font-size: 15px; color: var(--text-primary); margin-top: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: 600; min-width: 100px; color: var(--text-secondary);">Статус:</span>
                  <span class="badge ${isDone ? 'badge-success' : 'badge-primary'}">${t.status}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: 600; min-width: 100px; color: var(--text-secondary);">Приоритет:</span>
                  <span>${t.priority}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: 600; min-width: 100px; color: var(--text-secondary);">Направление:</span>
                  <span>${t.direction || '—'}</span>
                </div>
                ${t.project_id ? `
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: 600; min-width: 100px; color: var(--text-secondary);">Проект:</span>
                  <span><i data-lucide="folder" style="width: 12px; height: 12px; margin-right: 4px; vertical-align: text-bottom;"></i>${this.esc(this.projects?.find(p => p.id === t.project_id)?.name || 'Неизвестный проект')}</span>
                </div>` : ''}
                ${t.next_step ? `
                <div style="margin-top: 8px; padding: 12px; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-light);">
                  <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px;">Следующий шаг:</div>
                  <div>${this.esc(t.next_step)}</div>
                </div>` : ''}
              </div>
            `;
            const footerHtml = `
              <button class="btn btn-secondary" onclick="UI.closeModal()">Закрыть</button>
              <button class="btn btn-primary" onclick="App.navigateTo('tasks').then(() => TasksPage.openTaskModal('${id}')); UI.closeModal();">Перейти к задаче</button>
            `;
            const titleHtml = `
              <i data-lucide="target" style="color: var(--danger); width: 24px; height: 24px;"></i>
              <span style="font-size: 18px; font-weight: 700;">${this.esc(t.title)}</span>
            `;
            UI.openModal(titleHtml, bodyHtml, footerHtml);
          }
        } else if (type === 'lesson') {
          App.navigateTo('tutoring').then(() => {
            if (window.TutoringPage) {
              TutoringPage.openLessonModal(id);
            }
          });
        } else if (id) {
          this.openEventModal(id);
        }
      });
    });
    
    if (window.lucide) window.lucide.createIcons();
  },

  renderDay(date, otherMonth, now) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const isToday = date.toDateString() === now.toDateString();

    const dayEvents = this.events.filter(ev => {
      if (!ev.start_at) return false;
      const evDate = new Date(ev.start_at);
      const evY = evDate.getFullYear();
      const evM = String(evDate.getMonth() + 1).padStart(2, '0');
      const evD = String(evDate.getDate()).padStart(2, '0');
      return `${evY}-${evM}-${evD}` === dateStr;
    });

    const dayTaskDeadlines = this.tasks.filter(t => t.deadline === dateStr && t.status !== 'Отменена');

    const dayLessons = (this.lessons || []).filter(ls => {
      if (!ls.date) return false;
      const lsDate = new Date(ls.date);
      const lsY = lsDate.getFullYear();
      const lsM = String(lsDate.getMonth() + 1).padStart(2, '0');
      const lsD = String(lsDate.getDate()).padStart(2, '0');
      return `${lsY}-${lsM}-${lsD}` === dateStr;
    });

    const eventsHtml = [];
    
    if (this.currentTab === 'events') {
      eventsHtml.push(...dayEvents.map(ev => `
        <div class="calendar-event ${this.TYPE_CLASS[ev.type] || 'event-meeting'}" data-id="${ev.id}" data-type="event" title="${this.esc(ev.title)}" draggable="true">
          <i data-lucide="${this.TYPE_ICON[ev.type] || 'calendar'}" style="width:12px;height:12px;min-width:12px;"></i>
          ${this.esc(ev.title)}
        </div>
      `));
      
      if (!Config.currentArea || Config.currentArea === 'Все' || Config.currentArea === 'Репетиторство') {
        eventsHtml.push(...dayLessons.map(ls => {
          const studentName = ls.students?.name || 'Ученик';
          const lsTime = new Date(ls.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
          return `
          <div class="calendar-event event-lesson" data-id="${ls.id}" data-type="lesson" title="Урок: ${this.esc(studentName)}" draggable="true" style="background:var(--bg-hover);border:1px solid var(--accent);color:var(--accent);">
            <i data-lucide="book-open" style="width:12px;height:12px;min-width:12px;"></i>
            ${lsTime} ${this.esc(studentName)}
          </div>
        `}));
      }
    }
    
    if (this.currentTab === 'tasks') {
      eventsHtml.push(...dayTaskDeadlines.map(t => {
        const isDone = t.status === 'Готово';
        let projectIcon = '';
        if (t.project_id) {
          const project = this.projects.find(p => p.id === t.project_id);
          if (project) {
            projectIcon = `[${this.esc(project.name)}] `;
          }
        }
        return `
          <div class="calendar-event event-deadline ${isDone ? 'event-done' : ''} ${t.status === 'В работе' ? 'event-in-progress' : ''}" data-id="${t.id}" data-type="task" title="Дедлайн: ${this.esc(t.title)}" draggable="true">
            <i data-lucide="${isDone ? 'check-square' : 'target'}" style="width:12px;height:12px;min-width:12px;"></i>
            ${projectIcon}${this.esc(t.title)}
          </div>
        `;
      }));
    }

    return `
      <div class="calendar-day ${otherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}" data-date="${dateStr}">
        <div class="calendar-day-number">${date.getDate()}</div>
        ${eventsHtml.join('')}
      </div>
    `;
  },

  openEventModal(eventId = null, defaultDate = null) {
    const event = eventId ? this.events.find(e => e.id === eventId) : null;
    const modal = document.getElementById('event-modal');
    document.getElementById('event-modal-title').textContent = event ? 'Редактировать событие' : 'Новое событие';
    document.getElementById('event-modal-delete').style.display = event ? '' : 'none';

    const defaultStart = defaultDate
      ? `${defaultDate}T10:00`
      : event ? event.start_at?.slice(0, 16) : new Date().toISOString().slice(0, 16);
    const defaultEnd = defaultDate
      ? `${defaultDate}T11:00`
      : event ? event.end_at?.slice(0, 16) : new Date(Date.now() + 3600000).toISOString().slice(0, 16);

    document.getElementById('event-modal-body').innerHTML = `
      <div class="form-group">
        <label class="form-label">Название *</label>
        <input id="ef-title" type="text" class="form-input" value="${event ? this.esc(event.title) : ''}" placeholder="Название события" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Начало</label>
          <input id="ef-start" type="datetime-local" class="form-input" value="${defaultStart}" />
        </div>
        <div class="form-group">
          <label class="form-label">Конец</label>
          <input id="ef-end" type="datetime-local" class="form-input" value="${defaultEnd}" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Тип</label>
          <select id="ef-type" class="form-input">
            ${this.EVENT_TYPES.map(t => `<option value="${t}" ${(event?.type||'Встреча')===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Сфера (Workspace)</label>
          <select id="ef-area" class="form-input">
            <option value="Работа" ${(event?.area || Config.currentArea === 'Работа' ? 'Работа' : '') === 'Работа' ? 'selected' : ''}>🏢 Работа</option>
            <option value="Репетиторство" ${(event?.area || Config.currentArea === 'Репетиторство' ? 'Репетиторство' : '') === 'Репетиторство' ? 'selected' : ''}>👨‍🏫 Репетиторство</option>
            <option value="Личное" ${(event?.area || Config.currentArea === 'Личное' ? 'Личное' : '') === 'Личное' ? 'selected' : ''}>🏠 Личное</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Повторение</label>
          <select id="ef-recurrence" class="form-input">
            <option value="">Нет</option>
            <option value="daily" ${event?.recurrence==='daily'?'selected':''}>Ежедневно</option>
            <option value="weekly" ${event?.recurrence==='weekly'?'selected':''}>Еженедельно</option>
            <option value="monthly" ${event?.recurrence==='monthly'?'selected':''}>Ежемесячно</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Заметки</label>
        <textarea id="ef-notes" class="form-input" placeholder="Дополнительная информация…" style="min-height:70px">${event ? this.esc(event.notes || '') : ''}</textarea>
      </div>
    `;

    const close = () => modal.classList.add('hidden');
    document.getElementById('event-modal-save').onclick = () => this.saveEvent(event?.id);
    document.getElementById('event-modal-cancel').onclick = close;
    document.getElementById('event-modal-close').onclick = close;
    document.getElementById('event-modal-delete').onclick = () => this.deleteEvent(event?.id);
    modal.onclick = (e) => { if (e.target === modal) close(); };

    document.getElementById('ef-title').focus();
    modal.classList.remove('hidden');
  },

  async saveEvent(id = null) {
    const title = document.getElementById('ef-title').value.trim();
    if (!title) { UI.toast('Введи название события', 'warning'); return; }

    const data = {
      title,
      start_at: document.getElementById('ef-start').value,
      end_at: document.getElementById('ef-end').value,
      type: document.getElementById('ef-type').value,
      area: document.getElementById('ef-area').value,
      recurrence: document.getElementById('ef-recurrence').value || null,
      notes: document.getElementById('ef-notes').value
    };

    try {
      if (id) {
        const updated = await DB.updateEvent(id, data);
        const idx = this.events.findIndex(e => e.id === id);
        if (idx >= 0) this.events[idx] = { ...this.events[idx], ...updated };
        UI.toast('Событие обновлено', 'success');
        
        // Remove from current view if area changed to something else
        if (Config.currentArea !== 'Все' && data.area !== Config.currentArea) {
          this.events = this.events.filter(e => e.id !== id);
        }
      } else {
        const created = await DB.createEvent(data);
        this.events.push(created);
        UI.toast('Событие создано', 'success');
      }
      document.getElementById('event-modal').classList.add('hidden');
      this.renderCalendar();
    } catch (e) {
      UI.toast('Ошибка: ' + e.message, 'error');
    }
  },

  async deleteEvent(id) {
    if (!confirm('Удалить событие?')) return;
    await DB.deleteEvent(id);
    this.events = this.events.filter(e => e.id !== id);
    document.getElementById('event-modal').classList.add('hidden');
    this.renderCalendar();
    UI.toast('Событие удалено', 'info');
  },

  esc(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
