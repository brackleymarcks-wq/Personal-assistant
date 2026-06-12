// ============================================
// CALENDAR PAGE
// ============================================

const CalendarPage = {
  currentDate: new Date(),
  events: [],
  tasks: [],

  EVENT_TYPES: ['Встреча', 'Урок', 'Дедлайн', 'Личное'],
  TYPE_CLASS: {
    'Встреча': 'event-meeting',
    'Урок': 'event-lesson',
    'Дедлайн': 'event-deadline',
    'Личное': 'event-personal'
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
          <div class="calendar-nav">
            <button class="btn btn-secondary btn-icon" id="cal-prev">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <div class="calendar-month" id="cal-month-label"></div>
            <button class="btn btn-secondary btn-icon" id="cal-next">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
          <button class="btn btn-secondary btn-sm" id="cal-today">Сегодня</button>
        </div>

        <div class="calendar-body">
          <div class="calendar-grid" id="calendar-grid"></div>
        </div>
      </div>
    `;
  },

  async init() {
    document.getElementById('add-event-btn').addEventListener('click', () => this.openEventModal());
    document.getElementById('cal-prev').addEventListener('click', () => this.changeMonth(-1));
    document.getElementById('cal-next').addEventListener('click', () => this.changeMonth(1));
    document.getElementById('cal-today').addEventListener('click', () => {
      this.currentDate = new Date();
      this.renderCalendar();
    });
    await this.load();
  },

  async load() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const start = new Date(year, month - 1, 1).toISOString();
    const end = new Date(year, month + 2, 0).toISOString();
    [this.events, this.tasks] = await Promise.all([
      DB.getEvents(start, end),
      DB.getTasks({ })
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
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const now = new Date();

    document.getElementById('cal-month-label').textContent =
      new Date(year, month, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    document.getElementById('cal-subtitle').textContent =
      `${this.events.length} событий в этом месяце`;

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
      dayEl.addEventListener('click', () => {
        const dateStr = dayEl.dataset.date;
        this.openEventModal(null, dateStr);
      });
    });

    grid.querySelectorAll('.calendar-event').forEach(evEl => {
      evEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = evEl.dataset.id;
        if (id) this.openEventModal(id);
      });
    });
  },

  renderDay(date, otherMonth, now) {
    const dateStr = date.toISOString().split('T')[0];
    const isToday = date.toDateString() === now.toDateString();

    const dayEvents = this.events.filter(ev => {
      return ev.start_at && ev.start_at.startsWith(dateStr);
    });

    const dayTaskDeadlines = this.tasks.filter(t => {
      return t.deadline === dateStr && !['Готово', 'Отменена'].includes(t.status);
    });

    const eventsHtml = [
      ...dayEvents.map(ev => `
        <div class="calendar-event ${this.TYPE_CLASS[ev.type] || 'event-meeting'}" data-id="${ev.id}" title="${this.esc(ev.title)}">
          ${this.esc(ev.title)}
        </div>
      `),
      ...dayTaskDeadlines.map(t => `
        <div class="calendar-event event-deadline" title="Дедлайн: ${this.esc(t.title)}">
          ⚡ ${this.esc(t.title)}
        </div>
      `)
    ].join('');

    return `
      <div class="calendar-day ${otherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}" data-date="${dateStr}">
        <div class="calendar-day-number">${date.getDate()}</div>
        ${eventsHtml}
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
      recurrence: document.getElementById('ef-recurrence').value || null,
      notes: document.getElementById('ef-notes').value
    };

    try {
      if (id) {
        const updated = await DB.updateEvent(id, data);
        const idx = this.events.findIndex(e => e.id === id);
        if (idx >= 0) this.events[idx] = { ...this.events[idx], ...updated };
        UI.toast('Событие обновлено', 'success');
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
