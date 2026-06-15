// ============================================
// HABITS PAGE — Habit Tracker
// ============================================

const HabitsPage = {
  habits: [],
  logs: [],
  dates: [], // Last 7 dates, today is dates[6]

  render() {
    return `
      <div class="habits-page" style="display:flex;flex-direction:column;height:100%;background:var(--bg-primary);">
        <div class="page-header" style="background:var(--bg-surface);padding:var(--space-lg) var(--space-xl);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
          <div>
            <div class="page-title" style="font-size:20px;font-weight:700;">Трекер привычек</div>
            <div class="page-subtitle" id="habits-count-label" style="font-size:13px;color:var(--text-secondary);margin-top:2px;">Загрузка привычек…</div>
          </div>
          <div style="display:flex;gap:var(--space-sm);align-items:center;">
             <input id="habit-name-input" type="text" class="form-input" placeholder="Например: Сделать зарядку..." style="width:250px;" />
             <button id="habit-add-btn" class="btn btn-primary" style="display:flex;align-items:center;gap:6px;">
               <i data-lucide="plus"></i> Добавить
             </button>
          </div>
        </div>

        <div class="habits-grid" id="habits-list-body" style="flex:1;overflow-y:auto;align-content:start;padding:var(--space-xl);display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:var(--space-lg);">
           <!-- Habits list injected here -->
        </div>
      </div>
    `;
  },

  async init() {
    this.calculateDates();
    await this.load();
    this.bindEvents();
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
      const startIso = this.dates[0].toISOString().split('T')[0];
      const endIso = this.dates[6].toISOString().split('T')[0];
      
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
        <div class="habit-card" style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-lg);box-shadow:var(--shadow-sm);">
          <div class="habit-header" style="display:flex;justify-content:space-between;align-items:start;margin-bottom:var(--space-md);">
            <div>
              <div class="habit-title" style="font-weight:600;font-size:16px;">${this.escapeHtml(habit.name)}</div>
              <div class="habit-streak" style="font-size:12px;color:var(--warning);display:flex;align-items:center;gap:4px;margin-top:2px;">
                <i data-lucide="flame" style="width:14px;height:14px;"></i> ${streak} ${this.getPlural(streak, 'день', 'дня', 'дней')} подряд
              </div>
            </div>
            <div class="habit-actions" style="display:flex;gap:4px;">
              <button class="habit-btn edit-habit-btn" data-id="${habit.id}" data-name="${this.escapeHtml(habit.name)}" style="background:none;border:none;cursor:pointer;padding:4px;color:var(--text-secondary);">
                <i data-lucide="pencil" style="width:16px;height:16px;"></i>
              </button>
              <button class="habit-btn danger delete-habit-btn" data-id="${habit.id}" style="background:none;border:none;cursor:pointer;padding:4px;color:var(--text-secondary);">
                <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
              </button>
            </div>
          </div>
          
          <div class="habit-days" style="display:flex;justify-content:space-between;gap:8px;">
            ${this.dates.map(date => {
              const dateStr = date.toISOString().split('T')[0];
              const dayName = date.toLocaleDateString('ru-RU', { weekday: 'short' }).toUpperCase();
              const isToday = date.toDateString() === new Date().toDateString();
              const isLogged = logsForHabit.some(l => l.date === dateStr && l.status === 'done');
              
              return `
                <div class="habit-day-col" style="display:flex;flex-direction:column;align-items:center;gap:6px;">
                  <div class="habit-day-label" style="font-size:10px;color:${isToday ? 'var(--accent)' : 'var(--text-muted)'};font-weight:600;">${dayName}</div>
                  <div class="habit-bubble ${isLogged ? 'checked' : ''}" 
                    data-habit-id="${habit.id}" 
                    data-date="${dateStr}" 
                    data-checked="${isLogged}"
                    style="width:32px;height:32px;border-radius:var(--radius-md);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;background:${isLogged ? 'var(--success)' : 'var(--bg-secondary)'};color:${isLogged ? 'white' : 'transparent'};">
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

  escapeHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
