// ============================================
// GANTT CHART PAGE
// ============================================

const GanttPage = {
  tasks: [],
  projects: [],
  zoom: 'month', // week, month, quarter
  startDate: null,
  endDate: null,

  render() {
    return `
      <div class="gantt-page">
        <div class="page-header">
          <div>
            <div class="page-title">Диаграмма Ганта</div>
            <div class="page-subtitle" id="gantt-subtitle">Таймлайн задач по проектам</div>
          </div>
          <div class="page-actions">
            <div class="view-toggle">
              <button class="view-toggle-btn ${this.zoom === 'week' ? 'active' : ''}" data-zoom="week">Неделя</button>
              <button class="view-toggle-btn ${this.zoom === 'month' ? 'active' : ''}" data-zoom="month">Месяц</button>
              <button class="view-toggle-btn ${this.zoom === 'quarter' ? 'active' : ''}" data-zoom="quarter">Квартал</button>
            </div>
          </div>
        </div>
        <div class="gantt-container" id="gantt-container">
          <div style="text-align:center;padding:var(--space-2xl);color:var(--text-muted);display:flex;flex-direction:column;align-items:center;gap:var(--space-md);">
            <i data-lucide="loader-2" class="spin" style="width:32px;height:32px;"></i>
            Загрузка…
          </div>
        </div>
      </div>
    `;
  },

  async init() {
    this.bindEvents();
    await this.load();
  },

  bindEvents() {
    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.zoom = btn.dataset.zoom;
        this.renderChart();
      });
    });
  },

  async load() {
    try {
      [this.tasks, this.projects] = await Promise.all([
        DB.getTasks(),
        DB.getProjects()
      ]);
      this.renderChart();
    } catch (e) {
      console.error('Gantt load error:', e);
    }
  },

  renderChart() {
    const container = document.getElementById('gantt-container');
    const activeTasks = this.tasks.filter(t =>
      !['Готово', 'Отменена'].includes(t.status) && t.deadline
    );

    if (activeTasks.length === 0) {
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-muted);gap:var(--space-md);">
          <i data-lucide="gantt-chart" style="width:48px;height:48px;color:var(--border-light);"></i>
          <div style="font-size:16px;font-weight:600;color:var(--text-primary)">Нет задач с дедлайнами</div>
          <div style="font-size:13px;color:var(--text-secondary);">Добавьте дедлайны к задачам, чтобы увидеть их на таймлайне</div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      document.getElementById('gantt-subtitle').textContent = 'Таймлайн пуст';
      return;
    }

    // Calculate date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let daysToShow;
    switch (this.zoom) {
      case 'week': daysToShow = 14; break;
      case 'quarter': daysToShow = 90; break;
      default: daysToShow = 35;
    }

    this.startDate = new Date(today);
    this.startDate.setDate(this.startDate.getDate() - 3); // Padding before today
    this.endDate = new Date(this.startDate);
    this.endDate.setDate(this.endDate.getDate() + daysToShow);

    // Generate date columns
    const dates = [];
    const d = new Date(this.startDate);
    while (d <= this.endDate) {
      dates.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }

    const cellWidth = this.zoom === 'week' ? 60 : this.zoom === 'quarter' ? 20 : 36;
    const labelWidth = 260; // Slightly wider for task labels
    const totalWidth = labelWidth + dates.length * cellWidth;

    // Group tasks by project
    const groups = new Map();
    groups.set('none', { name: 'Без проекта', tasks: [] });
    this.projects.forEach(p => groups.set(p.id, { name: p.name, tasks: [] }));

    activeTasks.forEach(t => {
      const key = t.project_id || 'none';
      if (!groups.has(key)) groups.set(key, { name: 'Другое', tasks: [] });
      groups.get(key).tasks.push(t);
    });

    // Build HTML
    let html = `<div style="min-width:${totalWidth}px;position:relative;">`;

    // Header row
    html += `<div class="gantt-header" style="padding-left:${labelWidth}px">`;
    dates.forEach(date => {
      const isToday = date.toDateString() === today.toDateString();
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const dayNum = date.getDate();
      const showMonth = dayNum === 1 || date.getTime() === dates[0].getTime();
      const monthName = showMonth ? date.toLocaleDateString('ru-RU', { month: 'short' }) : '';

      html += `
        <div class="gantt-header-cell ${isToday ? 'today' : ''}" style="min-width:${cellWidth}px;width:${cellWidth}px;${isWeekend ? 'opacity:0.6' : ''}">
          ${monthName ? `<div style="font-size:9px;color:var(--accent);text-transform:uppercase;letter-spacing:0.5px;">${monthName}</div>` : ''}
          <div style="${isToday ? 'width:20px;height:20px;background:var(--accent);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-top:2px;' : ''}">${dayNum}</div>
        </div>
      `;
    });
    html += `</div>`;

    // Task rows grouped by project
    groups.forEach((group, key) => {
      if (group.tasks.length === 0) return;

      // Project header row
      html += `
        <div style="display:flex;align-items:center;gap:8px;padding:var(--space-md);background:var(--bg-elevated);border-bottom:1px solid var(--glass-border);position:sticky;left:0;z-index:6;">
          <i data-lucide="folder" style="width:16px;height:16px;color:var(--accent-soft);"></i>
          <span style="font-size:12px;font-weight:700;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.5px;">${this.esc(group.name)}</span>
          <span style="font-size:11px;color:var(--text-muted);background:var(--bg-surface);padding:2px 8px;border-radius:var(--radius-full);">${group.tasks.length}</span>
        </div>
      `;

      group.tasks.forEach(task => {
        const deadline = new Date(task.deadline + 'T00:00:00');
        const created = new Date(task.created_at);
        const taskStart = created > this.startDate ? created : this.startDate;

        const startOffset = Math.max(0, Math.floor((taskStart - this.startDate) / 86400000));
        const endOffset = Math.floor((deadline - this.startDate) / 86400000);
        const barStart = labelWidth + startOffset * cellWidth;
        const barWidth = Math.max(cellWidth, (endOffset - startOffset + 1) * cellWidth); // At least 1 cell wide

        const isPastDeadline = deadline < today;
        
        // Priority indicator dot
        let priorityColor = 'var(--success)';
        if (task.priority === 'Высокий') priorityColor = 'var(--danger)';
        if (task.priority === 'Средний') priorityColor = 'var(--warning)';

        // Bar gradient
        const barGrad = isPastDeadline
          ? 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)' // Red gradient for past deadline
          : 'linear-gradient(90deg, var(--accent) 0%, var(--accent-soft) 100%)'; // Unified firm accent

        html += `
          <div class="gantt-row" style="min-height:44px;border-bottom:1px solid var(--glass-border);">
            <div class="gantt-row-label" style="width:${labelWidth}px;min-width:${labelWidth}px" title="${this.esc(task.title)}">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${priorityColor};margin-right:8px;flex-shrink:0;box-shadow:0 0 6px ${priorityColor}60;"></span>
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${this.esc(task.title)}</span>
            </div>
            <div style="position:relative;flex:1;height:100%">
              <div class="gantt-bar" style="left:${barStart - labelWidth}px;width:${barWidth}px;top:10px;background:${barGrad};" title="Дедлайн: ${new Date(task.deadline).toLocaleDateString('ru-RU')}">
                ${barWidth > 60 ? this.esc(task.title).substring(0, Math.floor(barWidth / 8)) : ''}
              </div>
            </div>
          </div>
        `;
      });
    });

    // Today line spanning full height
    const todayOffset = Math.floor((today - this.startDate) / 86400000);
    if (todayOffset >= 0 && todayOffset <= dates.length) {
      html += `<div class="gantt-today-line" style="left:${labelWidth + todayOffset * cellWidth + cellWidth / 2}px;top:0;height:100%;position:absolute"></div>`;
    }

    html += `</div>`;
    container.innerHTML = html;

    if (window.lucide) window.lucide.createIcons();

    document.getElementById('gantt-subtitle').textContent =
      `${activeTasks.length} задач · с ${this.startDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} по ${this.endDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;
  },

  esc(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
