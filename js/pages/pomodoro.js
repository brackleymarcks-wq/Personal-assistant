// ============================================
// POMODORO TIMER PAGE
// ============================================

const PomodoroPage = {
  state: 'idle', // idle, working, break, longbreak
  timeLeft: 25 * 60,
  totalTime: 25 * 60,
  interval: null,
  sessionsCompleted: 0,
  currentTaskId: null,
  tasks: [],

  DURATIONS: { working: 25 * 60, break: 5 * 60, longbreak: 15 * 60 },
  LABELS: { idle: 'Готов к работе', working: 'Фокус', break: 'Короткий перерыв', longbreak: 'Длинный перерыв' },
  ICONS: { idle: '🍅', working: '🧠', break: '☕', longbreak: '🌿' },

  render() {
    return `
      <div class="pomodoro-page">
        <div style="text-align:center;margin-bottom:var(--space-md)">
          <div style="font-size:14px;color:var(--text-secondary);font-weight:500" id="pomo-state-label">Готов к работе</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px" id="pomo-session-count">Сессия 0 из 4</div>
        </div>

        <div class="pomodoro-timer" id="pomo-timer-ring">
          <div class="pomodoro-time" id="pomo-time">25:00</div>
          <div class="pomodoro-label" id="pomo-label">🍅 Помодоро</div>
        </div>

        <div class="pomodoro-controls">
          <button class="btn btn-secondary btn-icon" id="pomo-reset-btn" title="Сбросить">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
          <button class="btn btn-primary" id="pomo-start-btn" style="padding:12px 32px;font-size:15px;border-radius:var(--radius-full)">
            ▶ Старт
          </button>
          <button class="btn btn-secondary btn-icon" id="pomo-skip-btn" title="Пропустить">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
          </button>
        </div>

        <!-- Task selector -->
        <div style="margin-top:var(--space-xl);width:100%;max-width:400px">
          <div style="background:var(--glass-bg);backdrop-filter:blur(20px);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:var(--space-md)">
            <div style="font-size:12.5px;font-weight:600;color:var(--text-secondary);margin-bottom:var(--space-sm)">Привязать к задаче</div>
            <select id="pomo-task-select" class="form-input" style="font-size:13px">
              <option value="">— Без задачи —</option>
            </select>
          </div>
        </div>

        <!-- Today's stats -->
        <div style="margin-top:var(--space-lg);display:flex;gap:var(--space-xl)">
          <div class="dashboard-stat">
            <div class="stat-value" id="pomo-today-count">0</div>
            <div class="stat-label">Помодоро сегодня</div>
          </div>
          <div class="dashboard-stat">
            <div class="stat-value" id="pomo-today-minutes">0</div>
            <div class="stat-label">Минут фокуса</div>
          </div>
        </div>
      </div>
    `;
  },

  async init() {
    this.bindEvents();
    await this.loadTasks();
    this.updateDisplay();
  },

  bindEvents() {
    document.getElementById('pomo-start-btn').addEventListener('click', () => this.toggleTimer());
    document.getElementById('pomo-reset-btn').addEventListener('click', () => this.reset());
    document.getElementById('pomo-skip-btn').addEventListener('click', () => this.skip());
    document.getElementById('pomo-task-select').addEventListener('change', (e) => {
      this.currentTaskId = e.target.value || null;
    });
  },

  async loadTasks() {
    try {
      this.tasks = await DB.getTasks();
      const select = document.getElementById('pomo-task-select');
      const active = this.tasks.filter(t => !['Готово', 'Отменена'].includes(t.status));
      active.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.title.substring(0, 60);
        select.appendChild(opt);
      });
    } catch (e) { console.error(e); }
  },

  toggleTimer() {
    if (this.state === 'idle') {
      this.startWork();
    } else if (this.interval) {
      this.pause();
    } else {
      this.resume();
    }
  },

  startWork() {
    this.state = 'working';
    this.timeLeft = this.DURATIONS.working;
    this.totalTime = this.DURATIONS.working;
    this.startCountdown();
  },

  startBreak() {
    const isLong = this.sessionsCompleted % 4 === 0 && this.sessionsCompleted > 0;
    this.state = isLong ? 'longbreak' : 'break';
    this.timeLeft = this.DURATIONS[this.state];
    this.totalTime = this.DURATIONS[this.state];
    this.startCountdown();
  },

  startCountdown() {
    this.updateDisplay();
    const btn = document.getElementById('pomo-start-btn');
    btn.innerHTML = '⏸ Пауза';

    this.interval = setInterval(() => {
      this.timeLeft--;
      this.updateDisplay();

      if (this.timeLeft <= 0) {
        clearInterval(this.interval);
        this.interval = null;
        this.onComplete();
      }
    }, 1000);
  },

  pause() {
    clearInterval(this.interval);
    this.interval = null;
    document.getElementById('pomo-start-btn').innerHTML = '▶ Продолжить';
  },

  resume() {
    this.startCountdown();
  },

  reset() {
    clearInterval(this.interval);
    this.interval = null;
    this.state = 'idle';
    this.timeLeft = this.DURATIONS.working;
    this.totalTime = this.DURATIONS.working;
    this.updateDisplay();
    document.getElementById('pomo-start-btn').innerHTML = '▶ Старт';
  },

  skip() {
    clearInterval(this.interval);
    this.interval = null;
    if (this.state === 'working') {
      this.sessionsCompleted++;
      this.startBreak();
    } else {
      this.state = 'idle';
      this.timeLeft = this.DURATIONS.working;
      this.totalTime = this.DURATIONS.working;
      this.updateDisplay();
      document.getElementById('pomo-start-btn').innerHTML = '▶ Старт';
    }
  },

  async onComplete() {
    // Play sound
    this.playSound();

    if (this.state === 'working') {
      this.sessionsCompleted++;
      UI.toast(`🍅 Помодоро #${this.sessionsCompleted} завершён!`, 'success');

      // Save session to DB
      try {
        await DB.savePomodoroSession({
          task_id: this.currentTaskId,
          duration: this.DURATIONS.working,
          completed: true
        });
      } catch (e) { console.error(e); }

      this.updateTodayStats();
      this.startBreak();
    } else {
      UI.toast('☕ Перерыв окончен! Время работать.', 'info');
      this.state = 'idle';
      this.timeLeft = this.DURATIONS.working;
      this.totalTime = this.DURATIONS.working;
      this.updateDisplay();
      document.getElementById('pomo-start-btn').innerHTML = '▶ Старт';
    }
  },

  updateDisplay() {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const timeEl = document.getElementById('pomo-time');
    const labelEl = document.getElementById('pomo-label');
    const stateEl = document.getElementById('pomo-state-label');
    const sessionEl = document.getElementById('pomo-session-count');
    const ring = document.getElementById('pomo-timer-ring');

    if (timeEl) timeEl.textContent = timeStr;
    if (labelEl) labelEl.textContent = `${this.ICONS[this.state]} ${this.LABELS[this.state]}`;
    if (stateEl) stateEl.textContent = this.LABELS[this.state];
    if (sessionEl) sessionEl.textContent = `Сессия ${this.sessionsCompleted} из 4`;

    // Update progress ring
    const progress = this.totalTime > 0 ? ((this.totalTime - this.timeLeft) / this.totalTime) * 100 : 0;
    if (ring) ring.style.setProperty('--progress', progress + '%');
  },

  async updateTodayStats() {
    const countEl = document.getElementById('pomo-today-count');
    const minEl = document.getElementById('pomo-today-minutes');
    if (countEl) countEl.textContent = this.sessionsCompleted;
    if (minEl) minEl.textContent = this.sessionsCompleted * 25;
  },

  playSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.stop(ctx.currentTime + 0.8);

      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1000;
        gain2.gain.value = 0.3;
        osc2.start();
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc2.stop(ctx.currentTime + 0.8);
      }, 300);
    } catch (e) { /* Audio not supported */ }
  }
};
