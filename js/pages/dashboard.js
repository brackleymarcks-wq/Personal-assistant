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
    const todayTasks = tasks.filter(t => t.deadline === today);
    const activeTasks = tasks.filter(t => !['Готово', 'Отменена'].includes(t.status));
    const doneTasks = tasks.filter(t => t.status === 'Готово');
    const overdueTasks = tasks.filter(t => t.deadline && t.deadline < today && !['Готово', 'Отменена'].includes(t.status));
    const todayHabitsDone = habitLogs.filter(l => l.date === today && l.status === 'done').length;
    const activeGoals = goals.filter(g => g.status === 'В работе');

    // Rhythm block
    const rhythm = this.getCurrentRhythmBlock();

    const grid = document.getElementById('dashboard-grid');
    grid.innerHTML = `
      <!-- Rhythm / Current Block -->
      <div class="dashboard-widget dashboard-welcome">
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
          <div>
            <div style="font-size:13px;color:var(--text-secondary);font-weight:500;margin-bottom:4px">Сейчас</div>
            <div style="font-size:22px;font-weight:700;color:var(--text-primary)">${rhythm.icon} ${rhythm.label}</div>
            <div style="font-size:13px;color:var(--text-secondary);margin-top:4px">${rhythm.hint}</div>
          </div>
          <div style="display:flex;gap:var(--space-lg)">
            <div class="dashboard-stat">
              <div class="stat-value">${activeTasks.length}</div>
              <div class="stat-label">Активных задач</div>
            </div>
            <div class="dashboard-stat">
              <div class="stat-value">${doneTasks.length}</div>
              <div class="stat-label">Выполнено</div>
            </div>
            <div class="dashboard-stat">
              <div class="stat-value">${todayHabitsDone}/${habits.length}</div>
              <div class="stat-label">Привычки</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Today's Tasks -->
      <div class="dashboard-widget">
        <div class="widget-title"><span class="widget-icon">✅</span> Задачи на сегодня</div>
        ${overdueTasks.length > 0 ? `
          <div style="background:var(--danger-dim);border:1px solid rgba(248,113,113,0.2);border-radius:var(--radius-md);padding:var(--space-sm) var(--space-md);margin-bottom:var(--space-sm);font-size:12.5px;color:var(--danger);font-weight:500">
            ⚠️ ${overdueTasks.length} просроченных задач
          </div>
        ` : ''}
        ${todayTasks.length === 0 && overdueTasks.length === 0 ? `
          <div style="text-align:center;padding:var(--space-lg) 0;color:var(--text-muted);font-size:13px">
            Нет задач с дедлайном на сегодня
          </div>
        ` : ''}
        <div style="display:flex;flex-direction:column;gap:var(--space-xs)">
          ${[...overdueTasks.slice(0, 3), ...todayTasks.filter(t => !overdueTasks.includes(t)).slice(0, 5)].map(t => `
            <div style="display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-sm);border-radius:var(--radius-md);background:var(--glass-bg);border:1px solid var(--glass-border);cursor:pointer" onclick="App.navigateTo('tasks')">
              <div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${t.priority === 'Высокий' ? 'var(--danger)' : t.priority === 'Средний' ? 'var(--warning)' : 'var(--success)'}"></div>
              <span style="font-size:13px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this.esc(t.title)}</span>
              <span style="font-size:11px;color:${t.deadline < new Date().toISOString().split('T')[0] ? 'var(--danger)' : 'var(--text-muted)'}">${t.deadline ? this.shortDate(t.deadline) : ''}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Today's Events -->
      <div class="dashboard-widget">
        <div class="widget-title"><span class="widget-icon">📅</span> Сегодня в календаре</div>
        ${events.length === 0 ? `
          <div style="text-align:center;padding:var(--space-lg) 0;color:var(--text-muted);font-size:13px">
            Нет событий на сегодня
          </div>
        ` : ''}
        <div style="display:flex;flex-direction:column;gap:var(--space-xs)">
          ${events.slice(0, 6).map(ev => {
            const start = new Date(ev.start_at);
            const end = new Date(ev.end_at);
            const timeStr = start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' – ' + end.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            return `
              <div style="display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-sm);border-radius:var(--radius-md);background:var(--glass-bg);border:1px solid var(--glass-border)">
                <span style="font-size:11px;color:var(--accent-soft);font-weight:600;min-width:90px">${timeStr}</span>
                <span style="font-size:13px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this.esc(ev.title)}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Habits Today -->
      <div class="dashboard-widget">
        <div class="widget-title"><span class="widget-icon">⭐</span> Привычки сегодня</div>
        ${habits.length === 0 ? `
          <div style="text-align:center;padding:var(--space-lg) 0;color:var(--text-muted);font-size:13px">
            Добавь привычки в трекере
          </div>
        ` : `
          <div style="display:flex;flex-direction:column;gap:var(--space-xs)">
            ${habits.map(h => {
              const done = habitLogs.some(l => l.habit_id === h.id && l.date === today && l.status === 'done');
              return `
                <div style="display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-sm);border-radius:var(--radius-md);background:var(--glass-bg);border:1px solid var(--glass-border);cursor:pointer" onclick="App.navigateTo('habits')">
                  <div style="width:24px;height:24px;border-radius:50%;border:2px solid ${done ? 'var(--success)' : 'var(--glass-border-light)'};background:${done ? 'var(--success-dim)' : 'transparent'};display:flex;align-items:center;justify-content:center;color:${done ? 'var(--success)' : 'transparent'};font-size:12px;flex-shrink:0">✓</div>
                  <span style="font-size:13px;color:${done ? 'var(--text-muted)' : 'var(--text-primary)'}; ${done ? 'text-decoration:line-through' : ''}">${this.esc(h.name)}</span>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Goals Progress -->
      <div class="dashboard-widget">
        <div class="widget-title"><span class="widget-icon">🎯</span> Цели</div>
        ${activeGoals.length === 0 ? `
          <div style="text-align:center;padding:var(--space-lg) 0;color:var(--text-muted);font-size:13px">
            Нет активных целей
          </div>
        ` : `
          <div style="display:flex;flex-direction:column;gap:var(--space-md)">
            ${activeGoals.slice(0, 5).map(g => `
              <div style="cursor:pointer" onclick="App.navigateTo('goals')">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                  <span style="font-size:13px;font-weight:500">${this.esc(g.title)}</span>
                  <span style="font-size:12px;color:var(--accent-soft);font-weight:600">${g.progress || 0}%</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-bar-fill" style="width:${g.progress || 0}%"></div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- Inbox -->
      <div class="dashboard-widget">
        <div class="widget-title"><span class="widget-icon">📥</span> Входящие <span style="font-size:12px;color:var(--text-muted);font-weight:400;margin-left:auto">${inbox.length} необработанных</span></div>
        ${inbox.length === 0 ? `
          <div style="text-align:center;padding:var(--space-lg) 0;color:var(--text-muted);font-size:13px">
            Все мысли разобраны! 🎉
          </div>
        ` : `
          <div style="display:flex;flex-direction:column;gap:var(--space-xs)">
            ${inbox.slice(0, 5).map(item => `
              <div style="padding:var(--space-sm);border-radius:var(--radius-md);background:var(--glass-bg);border:1px solid var(--glass-border);font-size:13px;cursor:pointer" onclick="App.navigateTo('inbox')">
                ${this.esc(item.content).substring(0, 80)}${item.content.length > 80 ? '…' : ''}
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

      if (timeStr < r.wake) return { icon: '😴', label: 'Сон', hint: `Подъём в ${r.wake}` };
      if (timeStr < r.deep_work_start) return { icon: '☀️', label: 'Утреннее время', hint: 'Разминка, планирование, подготовка' };
      if (timeStr < r.deep_work_end) return { icon: '🧠', label: 'Deep Work', hint: 'Никаких отвлечений! Максимальная концентрация.' };
      if (timeStr < r.lunch_end) return { icon: '🍽', label: 'Обед', hint: 'Время отдохнуть и перезарядиться' };
      if (timeStr < r.work_stop) return { icon: '💼', label: 'Рабочее время', hint: 'Встречи, задачи, коммуникация' };
      if (timeStr < r.sleep) return { icon: '🌆', label: 'Вечер', hint: 'Время для себя и близких' };
      return { icon: '🌙', label: 'Время сна', hint: 'Пора отдыхать!' };
    } catch {
      return { icon: '💡', label: 'Рабочее время', hint: 'Настрой ритм дня в настройках' };
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
