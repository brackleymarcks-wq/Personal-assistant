// ============================================
// ANALYTICS PAGE — Productivity Reports
// ============================================

const AnalyticsPage = {
  tasks: [],
  habits: [],
  habitLogs: [],
  goals: [],

  render() {
    return `
      <div class="analytics-page">
        <div class="page-header">
          <div>
            <div class="page-title">Аналитика</div>
            <div class="page-subtitle">Обзор продуктивности</div>
          </div>
        </div>
        <div class="analytics-grid" id="analytics-grid">
          <div style="grid-column:1/-1;text-align:center;padding:var(--space-2xl);color:var(--text-muted)">Загрузка данных…</div>
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

      [this.tasks, this.habits, this.habitLogs, this.goals] = await Promise.all([
        DB.getTasks(),
        DB.getHabits(),
        DB.getHabitLogs(threeMonthsAgo, today),
        DB.getGoals()
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

    // === Tasks by week (last 8 weeks) ===
    const weeklyData = this.getWeeklyTaskData(doneTasks, 8);

    // === Tasks by direction (donut data) ===
    const directionData = this.getDirectionData();

    // === Habits heatmap ===
    const heatmapData = this.getHeatmapData();

    grid.innerHTML = `
      <!-- Summary Cards -->
      <div class="analytics-card">
        <div class="widget-title"><span class="widget-icon">📊</span> Общая статистика</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-lg);margin-top:var(--space-md)">
          <div class="dashboard-stat">
            <div class="stat-value">${this.tasks.length}</div>
            <div class="stat-label">Всего задач</div>
          </div>
          <div class="dashboard-stat">
            <div class="stat-value">${doneTasks.length}</div>
            <div class="stat-label">Выполнено</div>
          </div>
          <div class="dashboard-stat">
            <div class="stat-value" style="color:var(--danger)">${overdue}</div>
            <div class="stat-label">Просрочено</div>
          </div>
          <div class="dashboard-stat">
            <div class="stat-value">${avgProgress}%</div>
            <div class="stat-label">Ср. прогресс целей</div>
          </div>
        </div>
      </div>

      <!-- Weekly Task Chart -->
      <div class="analytics-card">
        <div class="widget-title"><span class="widget-icon">📈</span> Задачи по неделям</div>
        <div class="chart-container" style="display:flex;align-items:flex-end;gap:8px;padding-top:var(--space-md)">
          ${weeklyData.map(w => {
            const maxVal = Math.max(...weeklyData.map(x => x.count), 1);
            const height = Math.max(8, (w.count / maxVal) * 160);
            return `
              <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
                <span style="font-size:11px;font-weight:600;color:var(--accent-soft)">${w.count}</span>
                <div style="width:100%;height:${height}px;background:linear-gradient(180deg,var(--accent),var(--accent-vibrant));border-radius:var(--radius-sm) var(--radius-sm) 0 0;min-height:4px;transition:height 0.5s ease"></div>
                <span style="font-size:10px;color:var(--text-muted)">${w.label}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Direction Distribution -->
      <div class="analytics-card">
        <div class="widget-title"><span class="widget-icon">🎯</span> По направлениям</div>
        <div style="display:flex;flex-direction:column;gap:var(--space-sm);margin-top:var(--space-md)">
          ${directionData.map(d => {
            const maxCount = Math.max(...directionData.map(x => x.count), 1);
            const pct = Math.round((d.count / this.tasks.length) * 100);
            return `
              <div>
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                  <span style="font-size:13px;font-weight:500">${d.direction}</span>
                  <span style="font-size:12px;color:var(--text-muted)">${d.count} (${pct}%)</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-bar-fill" style="width:${(d.count / maxCount) * 100}%;background:${d.color}"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Habits Heatmap -->
      <div class="analytics-card" style="grid-column:1/-1">
        <div class="widget-title"><span class="widget-icon">⭐</span> Привычки — тепловая карта (90 дней)</div>
        <div style="display:flex;flex-wrap:wrap;gap:var(--space-lg);margin-top:var(--space-md)">
          ${this.habits.map(habit => {
            const logs = this.habitLogs.filter(l => l.habit_id === habit.id && l.status === 'done');
            return `
              <div>
                <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:var(--space-sm)">${this.esc(habit.name)}</div>
                <div class="heatmap-grid">
                  ${heatmapData.dates.map(date => {
                    const dateStr = date.toISOString().split('T')[0];
                    const done = logs.some(l => l.date === dateStr);
                    return `<div class="heatmap-cell ${done ? 'level-3' : ''}" title="${dateStr}${done ? ' ✓' : ''}"></div>`;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
          ${this.habits.length === 0 ? '<div style="color:var(--text-muted);font-size:13px">Добавь привычки для отслеживания</div>' : ''}
        </div>
      </div>

      <!-- Goals Timeline -->
      <div class="analytics-card">
        <div class="widget-title"><span class="widget-icon">🏆</span> Прогресс целей</div>
        ${this.goals.length === 0 ? '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:var(--space-lg)">Нет целей</div>' : ''}
        <div style="display:flex;flex-direction:column;gap:var(--space-md)">
          ${this.goals.map(g => `
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <span style="font-size:13px;font-weight:500">${this.esc(g.title)}</span>
                <span class="status-badge ${g.status === 'Достигнута' ? 'status-done' : g.status === 'Отменена' ? 'status-cancelled' : 'status-working'}">${g.status}</span>
              </div>
              <div class="progress-bar" style="height:8px">
                <div class="progress-bar-fill" style="width:${g.progress || 0}%;${g.status === 'Достигнута' ? 'background:linear-gradient(90deg,var(--success),#34d399)' : ''}"></div>
              </div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${g.progress || 0}%${g.target_date ? ' · до ' + new Date(g.target_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : ''}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Best Streaks -->
      <div class="analytics-card">
        <div class="widget-title"><span class="widget-icon">🔥</span> Лучшие серии</div>
        ${bestStreak.length === 0 ? '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:var(--space-lg)">Нет данных</div>' : ''}
        <div style="display:flex;flex-direction:column;gap:var(--space-sm)">
          ${bestStreak.map(s => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-sm);background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-md)">
              <span style="font-size:13px;font-weight:500">${this.esc(s.name)}</span>
              <span style="font-size:14px;font-weight:700;color:var(--warning)">🔥 ${s.streak} дн.</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
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
    const colors = ['linear-gradient(90deg,var(--accent),var(--accent-vibrant))', 'linear-gradient(90deg,var(--success),#34d399)', 'linear-gradient(90deg,var(--warning),#fbbf24)', 'linear-gradient(90deg,var(--info),#60a5fa)', 'linear-gradient(90deg,var(--danger),#f87171)', 'linear-gradient(90deg,#a855f7,#c084fc)'];
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
    for (let i = 89; i >= 0; i--) {
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
    }).filter(s => s.streak > 0).sort((a, b) => b.streak - a.streak);
  },

  esc(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
