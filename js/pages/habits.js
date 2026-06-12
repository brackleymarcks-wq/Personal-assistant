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
        <div class="page-header" style="background:var(--bg-surface);padding:var(--space-lg) var(--space-xl);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:between;flex-shrink:0;">
          <div>
            <div class="page-title" style="font-size:20px;font-weight:700;">Трекер привычек</div>
            <div class="page-subtitle" id="habits-count-label" style="font-size:13px;color:var(--text-secondary);margin-top:2px;">Загрузка привычек…</div>
          </div>
        </div>

        <div style="padding:var(--space-xl);display:flex;flex-direction:column;gap:var(--space-xl);flex:1;overflow-y:auto;">
          <!-- Quick add habit -->
          <div style="background:var(--bg-surface);border:1px solid var(--border-light);border-radius:var(--radius-lg);padding:var(--space-lg);box-shadow:var(--shadow-sm);display:flex;flex-direction:column;gap:var(--space-md);">
            <div style="font-size:15px;font-weight:600;color:var(--text-primary);">✨ Добавить привычку</div>
            <div style="display:flex;gap:var(--space-sm);">
              <input id="habit-name-input" type="text" class="form-input" placeholder="Например: Сделать зарядку, Пить воду..." style="flex:1;" />
              <button id="habit-add-btn" class="btn btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                Добавить
              </button>
            </div>
          </div>

          <!-- Habits Grid -->
          <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-lg);overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;min-width:600px;">
              <thead>
                <tr style="border-bottom:1px solid var(--border);">
                  <th style="text-align:left;padding:var(--space-sm) var(--space-md);color:var(--text-secondary);font-size:13px;font-weight:600;width:35%;">Привычка</th>
                  ${this.dates.map(d => {
                    const dayName = d.toLocaleDateString('ru-RU', { weekday: 'short' });
                    const dayNum = d.getDate();
                    const isToday = d.toDateString() === new Date().toDateString();
                    return `
                      <th style="text-align:center;padding:var(--space-sm);width:8%;">
                        <div style="font-size:11px;color:${isToday ? 'var(--accent-soft)' : 'var(--text-muted)'};font-weight:${isToday ? '600' : '400'};">${dayName}</div>
                        <div style="font-size:14px;color:${isToday ? 'var(--accent)' : 'var(--text-primary)'};font-weight:${isToday ? '700' : '500'};margin-top:2px;">${dayNum}</div>
                      </th>
                    `;
                  }).join('')}
                  <th style="text-align:center;padding:var(--space-sm);color:var(--text-secondary);font-size:13px;font-weight:600;width:9%;">Серия</th>
                </tr>
              </thead>
              <tbody id="habits-list-body"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  async init() {
    this.calculateDates();
    this.bindEvents();
    await this.load();
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

    btn.addEventListener('click', handleAdd);
    input.addEventListener('keydown', (e) => {
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
    
    countLabel.textContent = `${this.habits.length} активных привычек`;

    if (this.habits.length === 0) {
      body.innerHTML = `
        <tr>
          <td colspan="${this.dates.length + 2}" style="text-align:center;padding:var(--space-2xl) 0;color:var(--text-muted);">
            <div style="font-size:32px;margin-bottom:var(--space-sm)">✨</div>
            <div style="font-size:14px;font-weight:500;">Привычек пока нет. Добавь первую привычку выше!</div>
          </td>
        </tr>
      `;
      return;
    }

    body.innerHTML = this.habits.map(habit => {
      const logsForHabit = this.logs.filter(l => l.habit_id === habit.id);
      
      // Calculate current streak
      const streak = this.calculateStreak(habit.id);

      return `
        <tr style="border-bottom:1px solid var(--border);height:60px;">
          <td style="padding:var(--space-sm) var(--space-md);font-size:14px;font-weight:500;color:var(--text-primary);">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span>${this.escapeHtml(habit.name)}</span>
              <button class="delete-habit-btn" data-id="${habit.id}" style="color:var(--text-muted);opacity:0.3;font-size:11px;transition:opacity var(--transition);" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.3">
                🗑 Удалить
              </button>
            </div>
          </td>
          ${this.dates.map(date => {
            const dateStr = date.toISOString().split('T')[0];
            const isLogged = logsForHabit.some(l => l.date === dateStr && l.status === 'done');
            return `
              <td style="text-align:center;padding:var(--space-sm);">
                <div class="habit-check-bubble ${isLogged ? 'checked' : ''}" 
                  data-habit-id="${habit.id}" 
                  data-date="${dateStr}" 
                  data-checked="${isLogged}"
                  style="width:28px;height:28px;border-radius:50%;margin:0 auto;cursor:pointer;border:2px solid ${isLogged ? 'var(--success)' : 'var(--border-light)'};background:${isLogged ? 'var(--success-dim)' : 'transparent'};display:flex;align-items:center;justify-content:center;color:${isLogged ? 'var(--success)' : 'transparent'};transition:all var(--transition);">
                  ✓
                </div>
              </td>
            `;
          }).join('')}
          <td style="text-align:center;padding:var(--space-sm);font-weight:700;color:var(--warning);font-size:14px;">
            🔥 ${streak}
          </td>
        </tr>
      `;
    }).join('');

    // Bind check bubble clicks
    body.querySelectorAll('.habit-check-bubble').forEach(bubble => {
      bubble.addEventListener('click', async () => {
        const habitId = bubble.dataset.habitId;
        const date = bubble.dataset.date;
        const isChecked = bubble.dataset.checked === 'true';

        try {
          if (isChecked) {
            await DB.deleteHabitLog(habitId, date);
            UI.toast('Привычка снята', 'info', 1000);
          } else {
            await DB.logHabit(habitId, date, 'done');
            UI.toast('Выполнено!', 'success', 1000);
          }
          await this.load();
        } catch (e) {
          UI.toast('Ошибка: ' + e.message, 'error');
        }
      });
    });

    // Bind delete buttons
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
        // Allow streak to continue if today is not done yet, check yesterday
        if (streak === 0 && dateStr === new Date().toISOString().split('T')[0]) {
          checkDate.setDate(checkDate.getDate() - 1);
          const yesterdayStr = checkDate.toISOString().split('T')[0];
          const hasYesterdayLog = logsForHabit.some(l => l.date === yesterdayStr);
          if (hasYesterdayLog) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
        }
        break;
      }
    }
    return streak;
  },

  escapeHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
