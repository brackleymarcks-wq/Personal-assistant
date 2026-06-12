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
          <div style="text-align:center;padding:var(--space-2xl);color:var(--text-muted)">Загрузка…</div>
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
        <div class="empty-state">
          <div class="empty-icon">📈</div>
          <div class="empty-text">Нет задач с дедлайнами</div>
          <div class="empty-subtext">Добавь дедлайны к задачам, чтобы увидеть таймлайн</div>
        </div>
      `;
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
    this.startDate.setDate(this.startDate.getDate() - 3);
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
    const labelWidth = 220;
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
    let html = `<div style="min-width:${totalWidth}px">`;

    // Header row
    html += `<div class="gantt-header" style="padding-left:${labelWidth}px">`;
    dates.forEach(date => {
      const isToday = date.toDateString() === today.toDateString();
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const dayNum = date.getDate();
      const showMonth = dayNum === 1 || date.getTime() === dates[0].getTime();
      const monthName = showMonth ? date.toLocaleDateString('ru-RU', { month: 'short' }) : '';

      html += `
        <div class="gantt-header-cell ${isToday ? 'today' : ''}" style="min-width:${cellWidth}px;width:${cellWidth}px;${isWeekend ? 'opacity:0.5' : ''}">
          ${monthName ? `<div style="font-size:9px;color:var(--accent-soft)">${monthName}</div>` : ''}
          <div>${dayNum}</div>
        </div>
      `;
    });
    html += `</div>`;

    // Task rows grouped by project
    groups.forEach((group, key) => {
      if (group.tasks.length === 0) return;

      // Project header
      html += `
        <div style="padding:var(--space-sm) var(--space-md);font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-top:var(--space-sm)">
          ${this.esc(group.name)} (${group.tasks.length})
        </div>
      `;

      group.tasks.forEach(task => {
        const deadline = new Date(task.deadline + 'T00:00:00');
        const created = new Date(task.created_at);
        const taskStart = created > this.startDate ? created : this.startDate;

        const startOffset = Math.max(0, Math.floor((taskStart - this.startDate) / 86400000));
        const endOffset = Math.floor((deadline - this.startDate) / 86400000);
        const barStart = labelWidth + startOffset * cellWidth;
        const barWidth = Math.max(cellWidth, (endOffset - startOffset + 1) * cellWidth);

        const isPastDeadline = deadline < today;
        const priorityColor = task.priority === 'Высокий' ? 'var(--danger)' :
                             task.priority === 'Средний' ? 'var(--warning)' : 'var(--success)';

        const barColor = isPastDeadline
          ? 'linear-gradient(135deg, var(--danger), #f87171)'
          : `linear-gradient(135deg, var(--accent), var(--accent-vibrant))`;

        html += `
          <div class="gantt-row" style="min-height:38px;border-bottom:1px solid var(--glass-border)">
            <div class="gantt-row-label" style="width:${labelWidth}px;min-width:${labelWidth}px">
              <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${priorityColor};margin-right:6px"></span>
              ${this.esc(task.title)}
            </div>
            <div style="position:relative;flex:1;height:100%">
              <div class="gantt-bar" style="left:${barStart - labelWidth}px;width:${barWidth}px;top:7px;background:${barColor};${isPastDeadline ? 'opacity:0.8' : ''}" title="${this.esc(task.title)} — до ${task.deadline}">
                ${barWidth > 80 ? this.esc(task.title).substring(0, 20) : ''}
              </div>
            </div>
          </div>
        `;
      });
    });

    // Today line
    const todayOffset = Math.floor((today - this.startDate) / 86400000);
    if (todayOffset >= 0 && todayOffset <= dates.length) {
      html += `<div class="gantt-today-line" style="left:${labelWidth + todayOffset * cellWidth + cellWidth / 2}px;top:0;height:100%;position:absolute"></div>`;
    }

    html += `</div>`;
    container.innerHTML = `<div style="position:relative">${html}</div>`;

    document.getElementById('gantt-subtitle').textContent =
      `${activeTasks.length} задач · ${this.startDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} — ${this.endDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;
  },

  esc(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
