// ============================================
// ANALYTICS PAGE — Productivity Reports
// ============================================

const AnalyticsPage = {
  tasks: [],
  habits: [],
  habitLogs: [],
  goals: [],
  transactions: [],

  render() {
    return `
      <div class="analytics-page">
        <div class="page-header" style="background:var(--bg-surface);padding:var(--space-lg) var(--space-xl);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
          <div>
            <div class="page-title" style="font-size:20px;font-weight:700;">Аналитика</div>
            <div class="page-subtitle" style="font-size:13px;color:var(--text-secondary);margin-top:2px;">Командный центр вашей жизни</div>
          </div>
        </div>
        <div class="analytics-grid" id="analytics-grid">
          <div style="grid-column:1/-1;text-align:center;padding:var(--space-3xl);color:var(--text-muted);display:flex;flex-direction:column;align-items:center;gap:var(--space-md);">
            <i data-lucide="loader-2" class="spin" style="width:32px;height:32px;"></i>
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
      const threeMonthsAgo = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      [this.tasks, this.habits, this.habitLogs, this.goals, this.transactions] = await Promise.all([
        DB.getTasks(),
        DB.getHabits(),
        DB.getHabitLogs(threeMonthsAgo, today),
        DB.getGoals(),
        DB.getTransactions()
      ]);

      this.renderCharts();
    } catch (e) {
      console.error('Analytics load error:', e);
    }
  },

  renderCharts() {
    const grid = document.getElementById('analytics-grid');
    const doneTasks = this.tasks.filter(t => t.status === 'Готово');
    const activeTasks = this.tasks.filter(t => !['Готово', 'Отменена'].includes(t.status));
    const today = new Date().toISOString().split('T')[0];

    // === Summary Stats ===
    const overdue = this.tasks.filter(t => t.deadline && t.deadline < today && !['Готово', 'Отменена'].includes(t.status)).length;
    const avgProgress = this.goals.length > 0 ? Math.round(this.goals.reduce((s, g) => s + (g.progress || 0), 0) / this.goals.length) : 0;
    const bestStreak = this.calculateBestStreak();

    // === Finances ===
    let income = 0, expense = 0;
    const now = new Date();
    this.transactions.forEach(t => {
      const d = new Date(t.date);
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        if (t.type === 'income') income += Number(t.amount);
        if (t.type === 'expense') expense += Number(t.amount);
      }
    });

    // === Tasks by week (last 8 weeks) ===
    const weeklyData = this.getWeeklyTaskData(doneTasks, 8);

    // === Tasks by direction (donut data) ===
    const directionData = this.getDirectionData();

    // === Habits heatmap ===
    const heatmapData = this.getHeatmapData();

    grid.innerHTML = `
      <!-- Summary Cards -->
      <div class="analytics-card">
        <div class="analytics-card-title"><i data-lucide="bar-chart-2" style="width:18px;height:18px;"></i> Общая статистика</div>
        <div class="stat-grid">
          <div class="stat-item">
            <div class="stat-val">${this.tasks.length}</div>
            <div class="stat-label">Всего задач</div>
          </div>
          <div class="stat-item">
            <div class="stat-val" style="color:var(--success)">${doneTasks.length}</div>
            <div class="stat-label">Выполнено</div>
          </div>
          <div class="stat-item">
            <div class="stat-val" style="color:${overdue > 0 ? 'var(--danger)' : 'var(--text-primary)'}">${overdue}</div>
            <div class="stat-label">Просрочено</div>
          </div>
          <div class="stat-item">
            <div class="stat-val">${avgProgress}%</div>
            <div class="stat-label">Ср. прогресс целей</div>
          </div>
        </div>
      </div>

      <!-- Financial Summary -->
      <div class="analytics-card">
        <div class="analytics-card-title"><i data-lucide="wallet" style="width:18px;height:18px;color:var(--warning);"></i> Финансы за месяц</div>
        <div class="stat-grid" style="margin-top:var(--space-sm);">
          <div class="stat-item" style="grid-column:1/-1;">
            <div class="stat-label" style="margin-top:0;">Остаток</div>
            <div class="stat-val" style="font-size:36px;color:${(income-expense) < 0 ? 'var(--danger)' : 'var(--text-primary)'}">${(income - expense).toLocaleString('ru-RU')} BYN</div>
          </div>
          <div class="stat-item">
            <div class="stat-val" style="font-size:20px;color:var(--success)">+${income.toLocaleString('ru-RU')}</div>
            <div class="stat-label">Доходы</div>
          </div>
          <div class="stat-item">
            <div class="stat-val" style="font-size:20px;color:var(--danger)">-${expense.toLocaleString('ru-RU')}</div>
            <div class="stat-label">Расходы</div>
          </div>
        </div>
      </div>

      <!-- Weekly Task Chart -->
      <div class="analytics-card">
        <div class="analytics-card-title"><i data-lucide="trending-up" style="width:18px;height:18px;color:var(--info);"></i> Задачи по неделям</div>
        <div class="chart-container" style="display:flex;align-items:flex-end;gap:8px;padding-top:var(--space-md);height:140px;">
          ${weeklyData.map(w => {
            const maxVal = Math.max(...weeklyData.map(x => x.count), 1);
            const heightPct = Math.max(5, (w.count / maxVal) * 100);
            return `
              <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;">
                <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;width:100%;">
                  <div style="text-align:center;font-size:11px;font-weight:600;color:var(--text-primary);margin-bottom:4px;">${w.count}</div>
                  <div style="width:100%;height:${heightPct}%;background:linear-gradient(180deg, var(--accent), rgba(var(--accent-rgb),0.5));border-radius:var(--radius-sm) var(--radius-sm) 0 0;transition:height 0.5s ease;"></div>
                </div>
                <span style="font-size:10px;color:var(--text-muted);white-space:nowrap;">${w.label}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Direction Distribution -->
      <div class="analytics-card">
        <div class="analytics-card-title"><i data-lucide="pie-chart" style="width:18px;height:18px;color:var(--success);"></i> По направлениям</div>
        <div style="display:flex;flex-direction:column;gap:var(--space-md);margin-top:var(--space-sm)">
          ${directionData.map(d => {
            const maxCount = Math.max(...directionData.map(x => x.count), 1);
            const pct = Math.round((d.count / this.tasks.length) * 100);
            return `
              <div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                  <span style="font-size:13px;font-weight:500;display:flex;align-items:center;gap:6px;">
                    <div style="width:10px;height:10px;border-radius:50%;background:${d.color}"></div>
                    ${d.direction}
                  </span>
                  <span style="font-size:12px;color:var(--text-muted);font-weight:600;">${d.count} <span style="font-weight:400">(${pct}%)</span></span>
                </div>
                <div class="progress-bar" style="height:6px;background:var(--bg-elevated);">
                  <div class="progress-bar-fill" style="width:${(d.count / maxCount) * 100}%;background:${d.color}"></div>
                </div>
              </div>
            `;
          }).join('')}
          ${directionData.length === 0 ? '<div style="color:var(--text-muted);font-size:13px;text-align:center;">Нет задач для статистики</div>' : ''}
        </div>
      </div>

      <!-- Habits Heatmap -->
      <div class="analytics-card" style="grid-column:1/-1;">
        <div class="analytics-card-title"><i data-lucide="calendar-days" style="width:18px;height:18px;color:var(--accent);"></i> Тепловая карта привычек (90 дней)</div>
        <div style="display:flex;flex-wrap:wrap;gap:var(--space-2xl);margin-top:var(--space-sm)">
          ${this.habits.map(habit => {
            const logs = this.habitLogs.filter(l => l.habit_id === habit.id && l.status === 'done');
            return `
              <div class="heatmap-wrapper">
                <div style="font-size:13px;font-weight:600;color:var(--text-primary);display:flex;justify-content:space-between;">
                  ${this.esc(habit.name)}
                  <span style="color:var(--text-muted);font-weight:400;font-size:11px;">Выполнено: ${logs.length}</span>
                </div>
                <div class="heatmap-grid" style="grid-template-columns: repeat(13, 1fr);">
                  ${heatmapData.dates.map(date => {
                    const dateStr = date.toISOString().split('T')[0];
                    const done = logs.some(l => l.date === dateStr);
                    return `<div class="heatmap-cell ${done ? 'level-3' : ''}" title="${new Date(date).toLocaleDateString('ru-RU')} ${done ? ' ✓' : ''}"></div>`;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
          ${this.habits.length === 0 ? '<div style="color:var(--text-muted);font-size:13px;text-align:center;width:100%;padding:var(--space-lg) 0;">Добавьте привычки для отслеживания контрибуций</div>' : ''}
        </div>
      </div>

      <!-- Goals Timeline -->
      <div class="analytics-card">
        <div class="analytics-card-title"><i data-lucide="target" style="width:18px;height:18px;color:var(--danger);"></i> Прогресс целей</div>
        ${this.goals.length === 0 ? '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:var(--space-lg)">Нет целей</div>' : ''}
        <div style="display:flex;flex-direction:column;gap:var(--space-lg);margin-top:var(--space-sm);">
          ${this.goals.map(g => `
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <span style="font-size:14px;font-weight:600">${this.esc(g.title)}</span>
                <span class="status-badge ${g.status === 'Достигнута' ? 'status-done' : g.status === 'Отменена' ? 'status-cancelled' : 'status-working'}" style="font-size:10px;">${g.status}</span>
              </div>
              <div class="progress-bar" style="height:8px;background:var(--bg-elevated);">
                <div class="progress-bar-fill" style="width:${g.progress || 0}%;${g.status === 'Достигнута' ? 'background:linear-gradient(90deg,var(--success),#34d399)' : 'background:linear-gradient(90deg,var(--accent),var(--accent-vibrant))'}"></div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-top:6px;font-weight:500;">
                <span>Прогресс: ${g.progress || 0}%</span>
                <span>${g.target_date ? 'До ' + new Date(g.target_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : ''}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Best Streaks -->
      <div class="analytics-card">
        <div class="analytics-card-title"><i data-lucide="flame" style="width:18px;height:18px;color:var(--warning);"></i> Лучшие серии привычек</div>
        ${bestStreak.length === 0 ? '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:var(--space-lg)">Нет данных</div>' : ''}
        <div style="display:flex;flex-direction:column;gap:var(--space-xs);margin-top:var(--space-sm);">
          ${bestStreak.map((s, idx) => `
            <div class="best-streak-item">
              <span style="font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px;">
                <span style="color:var(--text-muted);font-size:12px;">#${idx+1}</span> ${this.esc(s.name)}
              </span>
              <span style="font-size:15px;font-weight:800;color:var(--warning);display:flex;align-items:center;gap:4px;">
                <i data-lucide="flame" style="width:16px;height:16px;"></i> ${s.streak} дн.
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  },

  getWeeklyTaskData(doneTasks, weeks) {
    const data = [];
    const now = new Date();
    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const count = doneTasks.filter(t => {
        const updated = new Date(t.updated_at);
        return updated >= weekStart && updated < weekEnd;
      }).length;

      const label = weekStart.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      data.push({ label, count });
    }
    return data;
  },

  getDirectionData() {
    const map = {};
    const colors = ['linear-gradient(90deg,var(--accent),var(--accent-vibrant))', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];
    this.tasks.forEach(t => {
      const dir = t.direction || 'Личное';
      map[dir] = (map[dir] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([direction, count], i) => ({ direction, count, color: colors[i % colors.length] }));
  },

  getHeatmapData() {
    const dates = [];
    for (let i = 90; i >= 1; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      dates.push(d);
    }
    return { dates };
  },

  calculateBestStreak() {
    return this.habits.map(habit => {
      const logs = this.habitLogs
        .filter(l => l.habit_id === habit.id && l.status === 'done')
        .map(l => l.date)
        .sort();

      let maxStreak = 0, current = 0, prev = null;
      logs.forEach(dateStr => {
        const d = new Date(dateStr);
        if (prev) {
          const diff = (d - prev) / 86400000;
          if (diff === 1) { current++; }
          else { current = 1; }
        } else { current = 1; }
        maxStreak = Math.max(maxStreak, current);
        prev = d;
      });

      return { name: habit.name, streak: maxStreak };
    }).filter(s => s.streak > 0).sort((a, b) => b.streak - a.streak).slice(0, 5);
  },

  esc(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
