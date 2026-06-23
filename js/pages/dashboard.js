// ============================================
// DASHBOARD PAGE — Daily Overview
// ============================================

const DashboardPage = {
  data: { tasks: [], events: [], habits: [], habitLogs: [], goals: [], inbox: [] },

  render() {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
    return `
      <div class="dashboard-page">
        <div class="page-header">
          <div>
            <div class="page-title">${greeting}, ${Config.userName}!</div>
            <div class="page-subtitle" id="dashboard-date">${this.formatDate()}</div>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" onclick="App.navigateTo('chat')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Спросить ассистента
            </button>
          </div>
        </div>

        <div class="dashboard-grid" id="dashboard-grid">
          <div class="dashboard-widget" style="grid-column: 1 / -1; display:flex; align-items:center; justify-content:center; padding:var(--space-2xl); color:var(--text-muted);">
            Загрузка данных…
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
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

      const [tasks, events, habits, habitLogs, goals, inbox] = await Promise.all([
        DB.getTasks(),
        DB.getEvents(
          new Date(today + 'T00:00:00').toISOString(),
          new Date(today + 'T23:59:59').toISOString()
        ),
        DB.getHabits(),
        DB.getHabitLogs(weekAgo, today),
        DB.getGoals(),
        DB.getInbox(true)
      ]);

      this.data = { tasks, events, habits, habitLogs, goals, inbox };
      this.renderWidgets();
    } catch (e) {
      console.error('Dashboard load error:', e);
    }
  },

  renderWidgets() {
    const { tasks, events, habits, habitLogs, goals, inbox } = this.data;
    const today = new Date().toISOString().split('T')[0];

    // Stats
    const todayTasks = tasks.filter(t => t.deadline === today && t.status !== 'Отменена');
    const todayTasksDone = todayTasks.filter(t => t.status === 'Готово').length;
    const todayTasksTotal = todayTasks.length;
    const taskProgress = todayTasksTotal === 0 ? 100 : Math.round((todayTasksDone / todayTasksTotal) * 100);
    const taskDashOffset = 150 - (150 * taskProgress) / 100;

    const overdueTasks = tasks.filter(t => t.deadline && t.deadline < today && !['Готово', 'Отменена'].includes(t.status));
    
    const todayHabitsDone = habitLogs.filter(l => l.date === today && l.status === 'done').length;
    const totalHabits = habits.length;
    const habitProgress = totalHabits === 0 ? 0 : Math.round((todayHabitsDone / totalHabits) * 100);
    const habitDashOffset = 150 - (150 * habitProgress) / 100;

    const activeGoals = goals.filter(g => g.status === 'В работе');
    const rhythm = this.getCurrentRhythmBlock();

    const grid = document.getElementById('dashboard-grid');
    grid.className = 'bento-grid';

    grid.innerHTML = `
      <!-- Hero Bento Box (8 cols) -->
      <div class="bento-item bento-col-8" style="display:flex;flex-direction:column;justify-content:center;min-height:160px;background:linear-gradient(135deg, var(--glass-bg), var(--glass-bg-heavy));">
        <div style="font-size:14px;color:var(--accent-vibrant);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
          <i data-lucide="${rhythm.icon}" style="width:16px;height:16px;"></i> ${rhythm.label}
        </div>
        <div style="font-size:28px;font-weight:800;color:var(--text-primary);line-height:1.2;margin-bottom:8px;">
          Твой фокус: ${rhythm.hint}
        </div>
        <div style="font-size:14px;color:var(--text-secondary);">
          Сегодня у тебя ${todayTasksTotal} задач и ${events.length} встреч. ${overdueTasks.length > 0 ? `<span style="color:var(--danger);font-weight:600;">🔥 ${overdueTasks.length} просрочено.</span>` : ''}
        </div>
      </div>

      <!-- Calendar Events Bento Box (4 cols, right column) -->
      <div class="bento-item bento-col-4" style="display:flex;flex-direction:column;grid-row:span 2;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-size:16px;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
            <i data-lucide="calendar" style="color:var(--info);"></i> Расписание
          </div>
          <button class="btn btn-ghost btn-sm" onclick="App.navigateTo('calendar')">Все</button>
        </div>
        ${events.length === 0 ? `<div style="color:var(--text-muted);font-size:14px;">Свободный день! 🎉</div>` : `
          <div style="display:flex;flex-direction:column;gap:12px;overflow-y:auto;max-height:300px;padding-right:4px;">
            ${events.map(ev => {
              const start = new Date(ev.start_at);
              const timeStr = start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
              return `
                <div style="display:flex;align-items:center;gap:16px;padding-bottom:12px;border-bottom:1px solid var(--glass-border-light);">
                  <div style="font-size:14px;font-weight:700;color:var(--text-primary);width:45px;">${timeStr}</div>
                  <div style="width:3px;height:16px;background:var(--info);border-radius:3px;"></div>
                  <div style="font-size:15px;font-weight:500;color:var(--text-secondary);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.esc(ev.title)}</div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Tasks List Bento Box (8 cols) -->
      <div class="bento-item bento-col-8" style="display:flex;flex-direction:column;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-size:16px;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
            <i data-lucide="check-square" style="color:var(--accent-vibrant);"></i> Задачи на сегодня
          </div>
          <div style="font-size:13px;color:var(--text-muted);">${todayTasksDone} из ${todayTasksTotal}</div>
        </div>
        ${todayTasks.length === 0 && overdueTasks.length === 0 ? `<div style="color:var(--text-muted);font-size:14px;">Всё выполнено! 🎉</div>` : `
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(250px, 1fr));gap:8px;">
            ${[...overdueTasks, ...todayTasks.filter(t => !overdueTasks.includes(t))].slice(0, 6).map(t => {
              const sc = (typeof TasksPage !== 'undefined' ? TasksPage.STATUS_COLORS[t.status] : null) || '#64748b';
              return `
              <div style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:12px;background:${sc}0f;border:1px solid ${sc}40;cursor:pointer;transition:all 0.2s ease;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'" onclick="App.navigateTo('tasks')">
                <div style="width:10px;height:10px;border-radius:50%;flex-shrink:0;background:${t.priority === 'Высокий' ? 'var(--danger)' : t.priority === 'Средний' ? 'var(--warning)' : 'var(--success)'};box-shadow:0 0 8px ${t.priority === 'Высокий' ? 'var(--danger)' : t.priority === 'Средний' ? 'var(--warning)' : 'var(--success)'}40;"></div>
                <span style="font-size:14px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-primary);font-weight:500;">${this.esc(t.title)}</span>
              </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Habits Bento Box (4 cols) -->
      <div class="bento-item bento-col-4" style="cursor:pointer;" onclick="App.navigateTo('habits')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-size:16px;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
            <i data-lucide="star" style="color:var(--success);"></i> Привычки
          </div>
          <div style="font-size:13px;color:var(--text-muted);">${todayHabitsDone} / ${totalHabits}</div>
        </div>
        ${habits.length === 0 ? `<div style="color:var(--text-muted);font-size:14px;">Добавь привычки в трекере.</div>` : `
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${habits.slice(0, 4).map(h => {
              const done = habitLogs.some(l => l.habit_id === h.id && l.date === today && l.status === 'done');
              return `
                <div style="display:flex;align-items:center;gap:12px;padding:4px 0;">
                  <div style="width:24px;height:24px;border-radius:8px;border:2px solid ${done ? 'var(--success)' : 'var(--glass-border-light)'};background:${done ? 'var(--success)' : 'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.3s ease;">
                    ${done ? `<i data-lucide="check" style="color:white;width:14px;height:14px;"></i>` : ''}
                  </div>
                  <span style="font-size:15px;font-weight:500;color:${done ? 'var(--text-muted)' : 'var(--text-primary)'};${done ? 'text-decoration:line-through' : ''};transition:all 0.3s ease;">${this.esc(h.name)}</span>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Inbox Bento Box (4 cols) -->
      <div class="bento-item bento-col-4" style="cursor:pointer;" onclick="App.navigateTo('inbox')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-size:16px;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
            <i data-lucide="inbox" style="color:var(--warning);"></i> Входящие мыслей
          </div>
          <div style="background:var(--warning-dim);color:var(--warning);padding:4px 10px;border-radius:12px;font-size:12px;font-weight:700;">${inbox.length}</div>
        </div>
        ${inbox.length === 0 ? `<div style="color:var(--text-muted);font-size:14px;">Входящие пусты.</div>` : `
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${inbox.slice(0, 3).map(item => `
              <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:var(--warning-dim);border:1px solid rgba(234, 88, 12, 0.1);border-radius:12px;transition:transform 0.2s ease;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                <i data-lucide="message-square" style="width:14px;height:14px;color:var(--warning);flex-shrink:0;margin-top:2px;"></i>
                <div style="font-size:13px;color:var(--text-secondary);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                  ${this.esc(item.content)}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- Goals Bento Box (4 cols) -->
      <div class="bento-item bento-col-4" style="cursor:pointer;" onclick="App.navigateTo('goals')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-size:16px;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
            <i data-lucide="target" style="color:var(--danger);"></i> Цели
          </div>
        </div>
        ${activeGoals.length === 0 ? `<div style="color:var(--text-muted);font-size:14px;">Нет активных целей.</div>` : `
          <div style="display:flex;flex-direction:column;gap:16px;">
            ${activeGoals.slice(0, 2).map(g => `
              <div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                  <span style="font-size:14px;font-weight:600;color:var(--text-secondary);">${this.esc(g.title)}</span>
                  <span style="font-size:13px;color:var(--text-primary);font-weight:800;">${g.progress || 0}%</span>
                </div>
                <div style="height:8px;background:var(--bg-hover);border-radius:4px;overflow:hidden;border:1px solid var(--border-light);">
                  <div style="height:100%;width:${g.progress || 0}%;background:linear-gradient(90deg, var(--danger), var(--warning));border-radius:4px;box-shadow:0 0 10px var(--danger);"></div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  },

  getCurrentRhythmBlock() {
    const now = new Date();
    const timeStr = now.toTimeString().substring(0, 5); // HH:MM

    // Default rhythm
    const defaults = { wake: '07:00', deep_work_start: '10:00', deep_work_end: '13:00', lunch_start: '13:00', lunch_end: '14:00', work_stop: '20:00', sleep: '23:30' };

    try {
      const settings = DB._cachedSettings || {};
      const rhythm = settings.rhythm || defaults;
      const r = { ...defaults, ...rhythm };

      if (timeStr < r.wake) return { icon: 'moon', label: 'Сон', hint: `Подъём в ${r.wake}` };
      if (timeStr < r.deep_work_start) return { icon: 'sun', label: 'Утреннее время', hint: 'Разминка, планирование, подготовка' };
      if (timeStr < r.deep_work_end) return { icon: 'brain', label: 'Deep Work', hint: 'Никаких отвлечений! Максимальная концентрация.' };
      if (timeStr < r.lunch_end) return { icon: 'coffee', label: 'Обед', hint: 'Время отдохнуть и перезарядиться' };
      if (timeStr < r.work_stop) return { icon: 'briefcase', label: 'Рабочее время', hint: 'Встречи, задачи, коммуникация' };
      if (timeStr < r.sleep) return { icon: 'sunset', label: 'Вечер', hint: 'Время для себя и близких' };
      return { icon: 'moon', label: 'Время сна', hint: 'Пора отдыхать!' };
    } catch {
      return { icon: 'zap', label: 'Рабочее время', hint: 'Настрой ритм дня в настройках' };
    }
  },

  formatDate() {
    return new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  },

  shortDate(dateStr) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  },

  esc(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
