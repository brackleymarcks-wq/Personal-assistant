// ============================================
// HEALTH PAGE — Fitness & Sleep Tracker
// ============================================

const HealthPage = {
  habits: [],
  logs: [],
  healthKeywords: ['сон', 'спать', 'бег', 'пробежк', 'спорт', 'тренир', 'пресс', 'зарядк', 'вод', 'health', 'отжиман'],
  chartInstance: null,

  render() {
    return `
      <div class="health-page" style="display:flex;flex-direction:column;height:100%;overflow-y:auto;">
        <div class="page-header">
          <div>
            <div class="page-title" style="display:flex;align-items:center;gap:8px;">
              <i data-lucide="heart-pulse" style="color:var(--danger)"></i> Здоровье и Форма
            </div>
            <div class="page-subtitle">Твой Индекс Формы и активность</div>
          </div>
        </div>

        <div style="padding:var(--space-xl);display:grid;grid-template-columns:1fr 350px;gap:var(--space-xl);max-width:1200px;margin:0 auto;width:100%;">
          
          <!-- Левая колонка: График -->
          <div style="display:flex;flex-direction:column;gap:var(--space-xl);">
            
            <div class="card" style="background:var(--bg-surface);padding:var(--space-xl);border-radius:var(--radius-lg);border:1px solid var(--border);box-shadow:var(--shadow-sm);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-lg);">
                <div style="font-weight:600;font-size:16px;">Индекс Формы (30 дней)</div>
                <div id="health-current-index" style="font-size:24px;font-weight:700;color:var(--accent);">--%</div>
              </div>
              <div style="position:relative;height:300px;width:100%;">
                <canvas id="health-chart"></canvas>
              </div>
            </div>

          </div>

          <!-- Правая колонка: Быстрые действия -->
          <div style="display:flex;flex-direction:column;gap:var(--space-xl);">
            
            <div class="card" style="background:var(--bg-surface);padding:var(--space-xl);border-radius:var(--radius-lg);border:1px solid var(--border);box-shadow:var(--shadow-sm);">
              <div style="font-weight:600;font-size:16px;margin-bottom:var(--space-md);">Быстрый логгер (Сегодня)</div>
              <div id="health-quick-log" style="display:flex;flex-direction:column;gap:var(--space-sm);">
                <!-- Инжектится JS -->
                <div style="text-align:center;color:var(--text-muted);font-size:13px;padding:var(--space-md);">Загрузка...</div>
              </div>
            </div>

            <div class="card" style="background:var(--bg-surface);padding:var(--space-lg);border-radius:var(--radius-lg);border:1px dashed var(--border-light);text-align:center;">
               <i data-lucide="info" style="width:24px;height:24px;color:var(--text-muted);margin-bottom:8px;"></i>
               <div style="font-size:13px;color:var(--text-secondary);">
                 Трекер автоматически считает здоровье по привычкам, содержащим слова: сон, бег, спорт, пресс, зарядка, вода.
               </div>
            </div>

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
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);
      
      const startIso = thirtyDaysAgo.toISOString().split('T')[0];
      const endIso = today.toISOString().split('T')[0];
      
      [this.habits, this.logs] = await Promise.all([
        DB.getHabits(),
        DB.getHabitLogs(startIso, endIso)
      ]);

      this.renderData();
    } catch (e) {
      console.error(e);
      UI.toast('Ошибка загрузки данных здоровья', 'error');
    }
  },

  getHealthHabits() {
    return this.habits.filter(h => {
      const name = h.name.toLowerCase();
      return this.healthKeywords.some(kw => name.includes(kw));
    });
  },

  renderData() {
    const healthHabits = this.getHealthHabits();
    
    // Quick log
    const quickLogContainer = document.getElementById('health-quick-log');
    if (healthHabits.length === 0) {
      quickLogContainer.innerHTML = `
        <div style="font-size:13px;color:var(--text-muted);text-align:center;margin-bottom:12px;">У тебя пока нет здоровых привычек.</div>
        <button class="btn btn-primary" onclick="HealthPage.createBaseHabits()" style="width:100%;">Создать базовые (Сон, Зарядка)</button>
      `;
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      quickLogContainer.innerHTML = healthHabits.map(h => {
        const isDone = this.logs.some(l => l.habit_id === h.id && l.date === todayStr && l.status === 'done');
        return `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg-primary);border-radius:var(--radius-md);border:1px solid var(--border-light);">
            <div style="font-size:14px;font-weight:500;">${this.escapeHtml(h.name)}</div>
            <button class="btn btn-sm ${isDone ? 'btn-success' : 'btn-ghost'}" onclick="HealthPage.toggleHabit('${h.id}', ${!isDone})">
              <i data-lucide="${isDone ? 'check' : 'circle'}"></i> ${isDone ? 'Сделано' : 'Отметить'}
            </button>
          </div>
        `;
      }).join('');
    }

    if (window.lucide) window.lucide.createIcons();

    // Chart Data
    const labels = [];
    const data = [];
    let latestScore = 0;

    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      labels.push(d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }));

      if (healthHabits.length === 0) {
        data.push(0);
      } else {
        let doneCount = 0;
        healthHabits.forEach(h => {
          if (this.logs.some(l => l.habit_id === h.id && l.date === dateStr && l.status === 'done')) {
            doneCount++;
          }
        });
        const score = Math.round((doneCount / healthHabits.length) * 100);
        data.push(score);
        if (i === 0) latestScore = score;
      }
    }

    const currentIndexEl = document.getElementById('health-current-index');
    if (currentIndexEl) {
      currentIndexEl.textContent = `${latestScore}%`;
      currentIndexEl.style.color = latestScore >= 80 ? 'var(--success)' : (latestScore >= 50 ? 'var(--warning)' : 'var(--danger)');
    }

    this.renderChart(labels, data);
  },

  async toggleHabit(habitId, toCheck) {
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      if (toCheck) await DB.logHabit(habitId, todayStr, 'done');
      else await DB.deleteHabitLog(habitId, todayStr);
      await this.load();
    } catch(e) {
      UI.toast('Ошибка: ' + e.message, 'error');
    }
  },

  async createBaseHabits() {
    try {
      await DB.createHabit('Здоровый сон (8 часов)', 'daily');
      await DB.createHabit('Утренняя зарядка', 'daily');
      await DB.createHabit('Вода (2 литра)', 'daily');
      UI.toast('Базовые привычки созданы!', 'success');
      await this.load();
    } catch(e) {
      UI.toast('Ошибка: ' + e.message, 'error');
    }
  },

  renderChart(labels, data) {
    const ctx = document.getElementById('health-chart');
    if (!ctx) return;

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Индекс Формы (%)',
          data: data,
          borderColor: '#10b981', // emerald
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 3,
          pointBackgroundColor: '#10b981',
          pointBorderWidth: 0,
          pointRadius: 3,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            titleColor: isDark ? '#f3f4f6' : '#111827',
            bodyColor: isDark ? '#d1d5db' : '#4b5563',
            borderColor: isDark ? '#374151' : '#e5e7eb',
            borderWidth: 1,
            padding: 12,
            boxPadding: 4,
            callbacks: {
              label: (ctx) => `${ctx.raw}%`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: gridColor, drawBorder: false },
            ticks: { color: textColor, stepSize: 25 }
          },
          x: {
            grid: { display: false },
            ticks: { color: textColor, maxTicksLimit: 10 }
          }
        }
      }
    });
  },

  escapeHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
