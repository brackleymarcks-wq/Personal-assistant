// ============================================
// HABITS PAGE — Habit Tracker
// ============================================

const HabitsPage = {
  habits: [],
  logs: [],
  dates: [], // Last 7 dates, today is dates[6]

  render() {
    return `
      <div class="habits-page" style="display:flex;flex-direction:column;height:100%;">
        <div class="page-header">
          <div>
            <div class="page-title">Трекер привычек</div>
            <div class="page-subtitle" id="habits-count-label">Загрузка привычек…</div>
          </div>
          <div style="display:flex;gap:var(--space-sm);align-items:center;">
             <input id="habit-name-input" type="text" class="form-input" placeholder="Например: Сделать зарядку..." style="width:250px;" />
             <button id="habit-add-btn" class="btn btn-primary" style="display:flex;align-items:center;gap:6px;">
               <i data-lucide="plus"></i> Добавить
             </button>
          </div>
        </div>

        <div id="habits-overall-heatmap-container" style="padding: 0 var(--space-xl) var(--space-md) var(--space-xl);">
           <!-- Heatmap bento card will be injected here -->
        </div>

        <div class="habits-grid" id="habits-list-body" style="flex:1;overflow-y:auto;align-content:start;">
           <!-- Habits list injected here -->
        </div>
      </div>
    `;
  },

  async init() {
    this.injectStyles();
    this.calculateDates();
    await this.load();
    this.bindEvents();
  },

  injectStyles() {
    if (document.getElementById('habits-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'habits-page-styles';
    style.textContent = `
      .heatmap-cell {
        width: 10px;
        height: 10px;
        border-radius: 2px;
        background: var(--bg-hover);
        transition: background var(--transition);
      }
      .heatmap-cell.level-0 { background: rgba(255, 255, 255, 0.05); }
      .heatmap-cell.level-1 { background: rgba(0, 184, 255, 0.25); }
      .heatmap-cell.level-2 { background: rgba(0, 184, 255, 0.45); }
      .heatmap-cell.level-3 { background: rgba(0, 184, 255, 0.7); }
      .heatmap-cell.level-4 { background: var(--accent); box-shadow: 0 0 4px var(--accent-glow); }

      body.theme-light .heatmap-cell.level-0 { background: rgba(0, 0, 0, 0.05); }
      body.theme-light .heatmap-cell.level-1 { background: rgba(234, 88, 12, 0.2); }
      body.theme-light .heatmap-cell.level-2 { background: rgba(234, 88, 12, 0.45); }
      body.theme-light .heatmap-cell.level-3 { background: rgba(234, 88, 12, 0.7); }
      body.theme-light .heatmap-cell.level-4 { background: var(--accent); }

      body.theme-comfort .heatmap-cell.level-0 { background: rgba(0, 0, 0, 0.05); }
      body.theme-comfort .heatmap-cell.level-1 { background: rgba(234, 88, 12, 0.2); }
      body.theme-comfort .heatmap-cell.level-2 { background: rgba(234, 88, 12, 0.45); }
      body.theme-comfort .heatmap-cell.level-3 { background: rgba(234, 88, 12, 0.7); }
      body.theme-comfort .heatmap-cell.level-4 { background: var(--accent); }

      .heatmap-grid-scroll::-webkit-scrollbar {
        height: 6px;
      }
      .heatmap-grid-scroll::-webkit-scrollbar-track {
        background: transparent;
      }
      .heatmap-grid-scroll::-webkit-scrollbar-thumb {
        background: var(--border);
        border-radius: var(--radius-full);
      }
      .heatmap-grid-scroll::-webkit-scrollbar-thumb:hover {
        background: var(--border-light);
      }
    `;
    document.head.appendChild(style);
  },

  calculateDates() {
    this.dates = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      this.dates.push(d);
    }
  },

  bindEvents() {
    const input = document.getElementById('habit-name-input');
    const btn = document.getElementById('habit-add-btn');

    const handleAdd = async () => {
      const name = input.value.trim();
      if (!name) return;
      try {
        await DB.createHabit(name, 'daily');
        input.value = '';
        UI.toast('Привычка добавлена!', 'success');
        await this.load();
      } catch (e) {
        UI.toast('Ошибка: ' + e.message, 'error');
      }
    };

    if (btn) btn.addEventListener('click', handleAdd);
    if (input) input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAdd();
    });
  },

  async load() {
    try {
      const startIso = DB.getMinskDateString(-115);
      const endIso = DB.getMinskDateString(0);
      
      [this.habits, this.logs] = await Promise.all([
        DB.getHabits(),
        DB.getHabitLogs(startIso, endIso)
      ]);

      this.renderContent();
    } catch (e) {
      console.error(e);
    }
  },

  renderContent() {
    this.renderHeatmap();

    const body = document.getElementById('habits-list-body');
    const countLabel = document.getElementById('habits-count-label');
    
    if (countLabel) {
      countLabel.textContent = `${this.habits.length} активных привычек`;
    }

    if (this.habits.length === 0) {
      body.innerHTML = `
        <div style="grid-column: 1 / -1;text-align:center;padding:var(--space-2xl);color:var(--text-muted);display:flex;flex-direction:column;align-items:center;gap:var(--space-md);margin-top:var(--space-2xl);">
          <i data-lucide="sparkles" style="width:48px;height:48px;color:var(--border-light);"></i>
          <div style="font-size:15px;font-weight:500;">Привычек пока нет. Самое время завести полезную рутину!</div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    body.innerHTML = this.habits.map(habit => {
      const logsForHabit = this.logs.filter(l => l.habit_id === habit.id);
      const streak = this.calculateStreak(habit.id);

      return `
        <div class="habit-card">
          <div class="habit-header">
            <div>
              <div class="habit-title">${this.escapeHtml(habit.name)}</div>
              <div class="habit-streak">
                <i data-lucide="flame" style="width:14px;height:14px;"></i> ${streak} ${this.getPlural(streak, 'день', 'дня', 'дней')} подряд
              </div>
            </div>
            <div class="habit-actions">
              <button class="habit-btn edit-habit-btn" data-id="${habit.id}" data-name="${this.escapeHtml(habit.name)}" title="Редактировать">
                <i data-lucide="pencil" style="width:16px;height:16px;"></i>
              </button>
              <button class="habit-btn danger delete-habit-btn" data-id="${habit.id}" title="Удалить">
                <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
              </button>
            </div>
          </div>
          
          <div class="habit-days">
            ${this.dates.map(date => {
              const dateStr = date.toISOString().split('T')[0];
              const dayName = date.toLocaleDateString('ru-RU', { weekday: 'short' }).toUpperCase();
              const isToday = date.toDateString() === new Date().toDateString();
              const isLogged = logsForHabit.some(l => l.date === dateStr && l.status === 'done');
              
              return `
                <div class="habit-day-col">
                  <div class="habit-day-label ${isToday ? 'today' : ''}">${dayName}</div>
                  <div class="habit-bubble ${isLogged ? 'checked' : ''}" 
                    data-habit-id="${habit.id}" 
                    data-date="${dateStr}" 
                    data-checked="${isLogged}">
                    <i data-lucide="check" style="width:16px;height:16px;"></i>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();

    body.querySelectorAll('.habit-bubble').forEach(bubble => {
      bubble.addEventListener('click', async () => {
        const habitId = bubble.dataset.habitId;
        const date = bubble.dataset.date;
        const isChecked = bubble.dataset.checked === 'true';

        try {
          if (isChecked) {
            await DB.deleteHabitLog(habitId, date);
          } else {
            await DB.logHabit(habitId, date, 'done');
          }
          await this.load();
        } catch (e) {
          UI.toast('Ошибка: ' + e.message, 'error');
        }
      });
    });

    body.querySelectorAll('.edit-habit-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const currentName = btn.dataset.name;
        const newName = prompt('Изменить название привычки:', currentName);
        if (newName && newName.trim() !== currentName) {
          try {
            await DB.updateHabit(id, { name: newName.trim() });
            UI.toast('Привычка обновлена', 'success');
            await this.load();
          } catch (e) {
            UI.toast('Ошибка: ' + e.message, 'error');
          }
        }
      });
    });

    body.querySelectorAll('.delete-habit-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm('Удалить эту привычку и всю историю её выполнения?')) return;
        try {
          await DB.deleteHabit(id);
          UI.toast('Привычка удалена', 'info');
          await this.load();
        } catch (e) {
          UI.toast('Ошибка: ' + e.message, 'error');
        }
      });
    });

    this.renderOverallHeatmap();
  },

  calculateStreak(habitId) {
    const logsForHabit = this.logs.filter(l => l.habit_id === habitId && l.status === 'done');
    let streak = 0;
    const checkDate = new Date();
    
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const hasLog = logsForHabit.some(l => l.date === dateStr);
      if (hasLog) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (streak === 0 && dateStr === new Date().toISOString().split('T')[0]) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }
    return streak;
  },

  getPlural(number, one, two, five) {
    let n = Math.abs(number);
    n %= 100;
    if (n >= 5 && n <= 20) return five;
    n %= 10;
    if (n === 1) return one;
    if (n >= 2 && n <= 4) return two;
    return five;
  },

  renderHeatmap() {
    const container = document.getElementById('habits-overall-heatmap-container');
    if (!container) return;

    if (this.habits.length === 0 || this.logs.length === 0) {
      container.innerHTML = '';
      return;
    }

    // Group logs by date
    const intensityMap = {};
    this.logs.forEach(log => {
      if (log.status === 'done') {
        intensityMap[log.date] = (intensityMap[log.date] || 0) + 1;
      }
    });

    // 116 days total (from -115 to 0)
    const dates = [];
    const today = new Date();
    for (let i = 115; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d);
    }

    const firstDate = dates[0];
    let firstDayOfWeek = firstDate.getDay(); 
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // 0=Mon, ..., 6=Sun

    let html = `
      <div class="bento-card" style="margin-bottom: var(--space-md); padding: var(--space-lg);">
        <div style="font-size:13px; font-weight:600; color:var(--text-muted); margin-bottom: 12px; text-transform:uppercase; letter-spacing:0.5px;">Активность за 4 месяца</div>
        <div class="heatmap-grid-scroll" style="overflow-x: auto; padding-bottom: 8px;">
          <div style="display: grid; grid-template-rows: repeat(7, 1fr); grid-auto-flow: column; gap: 4px; width: max-content;">
    `;

    // Padding cells for the first week to start on the correct day
    for (let i = 0; i < firstDayOfWeek; i++) {
      html += `<div class="heatmap-cell" style="background:transparent; pointer-events:none;"></div>`;
    }

    dates.forEach(d => {
      const dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      const count = intensityMap[dateStr] || 0;
      let level = 0;
      if (count === 1) level = 1;
      else if (count === 2) level = 2;
      else if (count === 3) level = 3;
      else if (count >= 4) level = 4;
      
      const tooltip = `${d.toLocaleDateString('ru-RU')}: ${count} ${this.getPlural(count, 'привычка', 'привычки', 'привычек')}`;
      html += `<div class="heatmap-cell level-${level}" title="${tooltip}"></div>`;
    });

    html += `
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  escapeHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  renderOverallHeatmap() {
    const container = document.getElementById('habits-overall-heatmap-container');
    if (!container) return;

    if (this.habits.length === 0) {
      container.innerHTML = '';
      return;
    }

    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 105); 
    const dayOfWeek = start.getDay(); 
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    start.setDate(start.getDate() - diffToMonday);

    const dates = [];
    const current = new Date(start);
    while (current <= today) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    const completionCounts = {};
    this.logs.forEach(log => {
      if (log.status === 'done') {
        completionCounts[log.date] = (completionCounts[log.date] || 0) + 1;
      }
    });

    let cellsHtml = '';
    dates.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      const count = completionCounts[dateStr] || 0;
      
      let level = 0;
      if (count > 0 && this.habits.length > 0) {
        const pct = count / this.habits.length;
        if (pct <= 0.25) level = 1;
        else if (pct <= 0.5) level = 2;
        else if (pct <= 0.75) level = 3;
        else level = 4;
      }

      const formattedDate = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      const tooltip = `${formattedDate}: выполнено привычек ${count} из ${this.habits.length}`;

      cellsHtml += `
        <div class="heatmap-cell level-${level}" title="${tooltip}" data-date="${dateStr}"></div>
      `;
    });

    container.innerHTML = `
      <div class="glass-panel" style="padding:var(--space-md);border-radius:var(--radius-lg);margin-top:var(--space-sm);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-sm);">
          <div style="font-size:13px;font-weight:600;color:var(--text-secondary);display:flex;align-items:center;gap:6px;">
            <i data-lucide="activity" style="width:16px;height:16px;color:var(--accent);"></i>
            Общая активность привычек за 15 недель
          </div>
          <div class="heatmap-legend" style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-muted);">
            <span>Меньше</span>
            <div class="heatmap-cell level-0"></div>
            <div class="heatmap-cell level-1"></div>
            <div class="heatmap-cell level-2"></div>
            <div class="heatmap-cell level-3"></div>
            <div class="heatmap-cell level-4"></div>
            <span>Больше</span>
          </div>
        </div>
        <div style="display:flex;gap:var(--space-sm);align-items:center;">
          <div style="display:flex;flex-direction:column;justify-content:space-between;height:90px;font-size:10px;color:var(--text-muted);padding-bottom:4px;text-align:right;width:24px;line-height:1;">
            <span>Пн</span>
            <span>Ср</span>
            <span>Пт</span>
            <span>Вс</span>
          </div>
          <div class="heatmap-grid-scroll" style="flex:1;overflow-x:auto;padding-bottom:4px;">
            <div class="heatmap-grid" style="display:grid;grid-template-rows:repeat(7, 10px);grid-auto-flow:column;gap:3px;width:max-content;">
              ${cellsHtml}
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }
};
