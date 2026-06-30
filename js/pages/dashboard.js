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

      const [tasks, events, habits, habitLogs, goals, inbox, transactions, lessons, rpg] = await Promise.all([
        DB.getTasks(),
        DB.getEvents(
          new Date(today + 'T00:00:00').toISOString(),
          new Date(today + 'T23:59:59').toISOString()
        ),
        DB.getHabits(),
        DB.getHabitLogs(weekAgo, today),
        DB.getGoals(),
        DB.getInbox(true),
        DB.getTransactions(),
        DB.getLessons(),
        DB.getGamificationStats()
      ]);

      // Fetch finance config note
      let financeConfig = {};
      try {
        const { data: configNotes } = await DB.client
          .from('notes')
          .select('*')
          .eq('title', 'SYSTEM_CONFIG_FINANCES')
          .limit(1);
        if (configNotes && configNotes.length > 0) {
          financeConfig = JSON.parse(configNotes[0].content || '{}');
        }
      } catch (e) {
        console.error('Failed to load finance config on dashboard', e);
      }

      this.data = { tasks, events, habits, habitLogs, goals, inbox, transactions, lessons, financeConfig, rpg };
      this.renderWidgets();
    } catch (e) {
      console.error('Dashboard load error:', e);
    }
  },

  renderWidgets() {
    const { tasks, events, habits, habitLogs, goals, inbox, transactions, lessons, financeConfig, rpg } = this.data;
    const today = new Date().toISOString().split('T')[0];

    // RPG Calculations
    const xp = rpg?.totalXp || 0;
    const level = Math.floor(Math.sqrt(xp / 50)) + 1;
    let rank = 'Новичок';
    if (level >= 20) rank = 'Босс Жизни 👑';
    else if (level >= 13) rank = 'Сеньор-Достигатор 💎';
    else if (level >= 8) rank = 'Мастер Времени ⏳';
    else if (level >= 4) rank = 'Джуниор 🚀';
    else if (level >= 2) rank = 'Ученик 🌱';

    const currentLevelBaseXp = Math.pow(level - 1, 2) * 50;
    const nextLevelBaseXp = Math.pow(level, 2) * 50;
    const xpInCurrentLevel = xp - currentLevelBaseXp;
    const xpNeededForNextLevel = nextLevelBaseXp - currentLevelBaseXp;
    const progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100));

    // Check level up celebration
    const lastLevel = localStorage.getItem('last_user_level');
    if (lastLevel && Number(lastLevel) < level) {
      setTimeout(() => this.triggerLevelUpCelebration(level, rank), 500);
    }
    localStorage.setItem('last_user_level', level);

    // Finances stats
    const finances = this.getFinanceStats(transactions || [], financeConfig || {});

    // Tutoring lessons
    const upcomingLessons = (lessons || []).filter(ls => ls.status === 'Запланирован');
    upcomingLessons.sort((a, b) => new Date(a.date) - new Date(b.date));
    const nextLesson = upcomingLessons[0] || null;

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
    if (!grid) return; // Prevent crash if navigated away before load completes
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
          <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:12px;width:100%;flex:1;align-content:space-between;justify-content:space-between;">
            ${[...overdueTasks, ...todayTasks.filter(t => !overdueTasks.includes(t))].slice(0, 6).map((t, i, arr) => {
              const sc = (typeof TasksPage !== 'undefined' ? TasksPage.STATUS_COLORS[t.status] : null) || '#64748b';
              const spanClass = (arr.length % 2 !== 0 && i === arr.length - 1) ? 'grid-column: span 2;' : '';
              return `
              <div style="${spanClass}display:flex;align-items:center;gap:12px;padding:16px;border-radius:12px;background:${sc}0f;border:1px solid ${sc}40;cursor:pointer;transition:all 0.2s ease;width:100%;min-height:54px;box-sizing:border-box;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'" onclick="App.navigateTo('tasks')">
                <div style="width:12px;height:12px;border-radius:50%;flex-shrink:0;background:${t.priority === 'Высокий' ? 'var(--danger)' : t.priority === 'Средний' ? 'var(--warning)' : 'var(--success)'};box-shadow:0 0 8px ${t.priority === 'Высокий' ? 'var(--danger)' : t.priority === 'Средний' ? 'var(--warning)' : 'var(--success)'}40;"></div>
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

      <!-- Finances Bento Box (4 cols) -->
      <div class="bento-item bento-col-4" style="cursor:pointer; display:flex; flex-direction:column; min-height:160px; background:linear-gradient(135deg, var(--glass-bg), var(--glass-bg-heavy));" onclick="App.navigateTo('finances')">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div style="font-size:16px; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
            <i data-lucide="wallet" style="color:var(--success);"></i> Финансы за месяц
          </div>
          <span style="font-size:13px; color:var(--text-muted);">Баланс</span>
        </div>
        <div style="font-size:24px; font-weight:800; color:${finances.balance >= 0 ? 'var(--success)' : 'var(--danger)'}; margin-bottom:12px;">
          ${(finances.balance >= 0 ? '+' : '')}${finances.balance.toLocaleString('ru-RU')} BYN
        </div>
        ${finances.monthlyLimit > 0 ? `
          <div style="margin-top:auto; width:100%;">
            <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px; color:var(--text-secondary);">
              <span>Лимит трат: ${finances.monthlyLimit.toLocaleString('ru-RU')} BYN</span>
              <span style="font-weight:700; color:${finances.expense > finances.monthlyLimit ? 'var(--danger)' : 'var(--text-primary)'};">
                ${Math.min(100, Math.round((finances.expense / finances.monthlyLimit) * 100))}%
              </span>
            </div>
            <div style="height:6px; background:var(--bg-hover); border-radius:3px; overflow:hidden; border:1px solid var(--border-light);">
              <div style="height:100%; width:${Math.min(100, Math.round((finances.expense / finances.monthlyLimit) * 100))}%; background:${finances.expense > finances.monthlyLimit ? 'var(--danger)' : 'var(--accent)'}; border-radius:3px; box-shadow:0 0 8px ${finances.expense > finances.monthlyLimit ? 'var(--danger)' : 'var(--accent)'}40;"></div>
            </div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:6px;">
              ${finances.expense > finances.monthlyLimit 
                ? `Перерасход на ${(finances.expense - finances.monthlyLimit).toLocaleString('ru-RU')} BYN!` 
                : `Осталось ${(finances.monthlyLimit - finances.expense).toLocaleString('ru-RU')} BYN трат.`}
            </div>
          </div>
        ` : `
          <div style="margin-top:auto; font-size:13px; color:var(--text-muted);">
            Доходы: <span style="color:var(--success); font-weight:600;">+${finances.income.toLocaleString('ru-RU')} BYN</span><br/>
            Расходы: <span style="color:var(--danger); font-weight:600;">-${finances.expense.toLocaleString('ru-RU')} BYN</span>
          </div>
        `}
      </div>

      <!-- Tutoring Bento Box (4 cols) -->
      <div class="bento-item bento-col-4" style="cursor:pointer; display:flex; flex-direction:column; min-height:160px; background:linear-gradient(135deg, var(--glass-bg), var(--glass-bg-heavy));" onclick="App.navigateTo('tutoring')">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div style="font-size:16px; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
            <i data-lucide="book-open" style="color:var(--accent-vibrant);"></i> Ближайший урок
          </div>
        </div>
        ${nextLesson ? `
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
            <div style="width:40px; height:40px; border-radius:10px; background:var(--accent-dim); color:var(--accent-vibrant); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="user" style="width:20px; height:20px;"></i>
            </div>
            <div>
              <div style="font-size:15px; font-weight:700; color:var(--text-primary);">${this.esc(nextLesson.students?.name || 'Ученик')}</div>
              <div style="font-size:13px; color:var(--accent-vibrant); font-weight:600;">
                ${this.formatLessonTime(nextLesson.date)}
              </div>
            </div>
          </div>
          <div style="margin-top:auto; font-size:13px; line-height:1.4; color:var(--text-secondary);">
            ${nextLesson.topic ? `📚 <b>Тема:</b> ${this.esc(nextLesson.topic)}<br/>` : ''}
            ${nextLesson.homework ? `✏️ <b>ДЗ:</b> ${this.esc(nextLesson.homework)}` : ''}
          </div>
        ` : `
          <div style="margin-top:auto; margin-bottom:auto; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; color:var(--text-muted); width:100%;">
            <i data-lucide="smile" style="width:24px; height:24px; color:var(--success);"></i>
            <div style="font-size:14px; font-weight:500;">Нет запланированных уроков</div>
          </div>
        `}
      </div>

      <!-- RPG Bento Box (4 cols) -->
      <div class="bento-item bento-col-4" style="display:flex; flex-direction:column; min-height:160px; background:linear-gradient(135deg, var(--glass-bg), var(--glass-bg-heavy));">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div style="font-size:16px; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
            <i data-lucide="award" style="color:var(--warning);"></i> Прогресс RPG
          </div>
          <span style="font-size:13px; color:var(--warning); font-weight:800;">Ур. ${level}</span>
        </div>
        <div style="font-size:18px; font-weight:800; color:var(--text-primary); margin-bottom:12px;">
          ${rank}
        </div>
        <div style="margin-top:auto; width:100%;">
          <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px; color:var(--text-secondary);">
            <span>Опыт: ${xp} / ${nextLevelBaseXp} XP</span>
            <span style="font-weight:700; color:var(--accent-vibrant);">${Math.round(progressPercent)}%</span>
          </div>
          <div style="height:6px; background:var(--bg-hover); border-radius:3px; overflow:hidden; border:1px solid var(--border-light);">
            <div style="height:100%; width:${progressPercent}%; background:linear-gradient(90deg, var(--accent), var(--accent-vibrant)); border-radius:3px; box-shadow:0 0 8px rgba(var(--accent-rgb), 0.4);"></div>
          </div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:6px;">
            Выполняй задачи и привычки для повышения уровня!
          </div>
        </div>
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
  },

  formatLessonTime(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const todayStr = now.toDateString();
    
    const tomorrow = new Date(now.getTime() + 86400000);
    const tomorrowStr = tomorrow.toDateString();
    
    const timeStr = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    if (d.toDateString() === todayStr) {
      return `Сегодня в ${timeStr}`;
    } else if (d.toDateString() === tomorrowStr) {
      return `Завтра в ${timeStr}`;
    } else {
      const datePart = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      return `${datePart} в ${timeStr}`;
    }
  },

  getFinanceStats(transactions, financeConfig) {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const monthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    let income = 0;
    let expense = 0;

    monthTx.forEach(t => {
      let isCorrection = false;
      try { if (JSON.parse(t.description || '{}').text === 'Ручная корректировка баланса') isCorrection = true; } catch(e){}
      
      if (!isCorrection) {
        if (t.type === 'income') income += Number(t.amount);
        if (t.type === 'expense') expense += Number(t.amount);
      }
    });

    const balance = income - expense;

    // Calculate total balance across accounts
    const accountBalances = {};
    const accounts = financeConfig.accounts || [];
    accounts.forEach(a => accountBalances[a.id] = Number(a.initialBalance) || 0);

    transactions.forEach(t => {
      try {
        const descData = JSON.parse(t.description || '{}');
        const amt = Number(t.amount);
        let accId = descData.account;
        if (!accId && accounts.length > 0) {
          const defaultAcc = accounts.find(a => a.name.toLowerCase().includes('карта')) || accounts[0];
          accId = defaultAcc.id;
        }

        if (t.type === 'income' && accId && accountBalances[accId] !== undefined) {
          accountBalances[accId] += amt;
        } else if (t.type === 'expense' && accId && accountBalances[accId] !== undefined) {
          accountBalances[accId] -= amt;
        } else if (t.type === 'transfer' && descData.fromAccount && descData.toAccount) {
          if (accountBalances[descData.fromAccount] !== undefined) accountBalances[descData.fromAccount] -= amt;
          if (accountBalances[descData.toAccount] !== undefined) accountBalances[descData.toAccount] += amt;
        }
      } catch(e) {}
    });

    return {
      income,
      expense,
      balance,
      monthlyLimit: Number(financeConfig.monthlyLimit) || 0
    };
  },

  triggerLevelUpCelebration(newLevel, rank) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'level-up-overlay';
    overlay.style = `
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.5s ease;
    `;

    overlay.innerHTML = `
      <div class="glass-panel" style="padding: var(--space-2xl); border-radius: 24px; max-width: 450px; text-align: center; border: 1px solid var(--accent); box-shadow: 0 0 40px rgba(255,107,43,0.3); transform: scale(0.8); transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); position: relative; background: linear-gradient(145deg, #2a2a2e, #1a1a1c); color: #fff;">
        <div style="font-size: 64px; margin-bottom: 16px; animation: bounce 2s infinite;">👑</div>
        <div style="font-size: 14px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Новый Уровень!</div>
        <div style="font-size: 42px; font-weight: 900; color: #ffffff; margin-bottom: 12px; text-shadow: 0 0 15px var(--accent-glow);">УРОВЕНЬ ${newLevel}</div>
        <div style="font-size: 16px; font-weight: 600; color: #a0a0a5; margin-bottom: 24px;">Твой новый ранг: <span style="color:var(--accent-vibrant); font-weight:800;">${rank}</span></div>
        <button class="btn btn-primary" style="width: 100%; border-radius: 12px; font-weight: 700; padding: 12px; font-size: 16px; box-shadow: 0 4px 15px rgba(255,107,43,0.4);" onclick="document.getElementById('level-up-overlay').remove()">Вперёд к целям! 🚀</button>
      </div>
    `;

    document.body.appendChild(overlay);
    
    // Trigger animations
    setTimeout(() => {
      overlay.style.opacity = '1';
      overlay.querySelector('.glass-panel').style.transform = 'scale(1)';
    }, 50);
  }
};
