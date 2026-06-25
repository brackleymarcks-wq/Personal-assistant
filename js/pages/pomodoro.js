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
  ambientAudio: null,
  ambientType: null,
  ambientVolume: 0.5,

  DURATIONS: { working: 25 * 60, break: 5 * 60, longbreak: 15 * 60 },
  LABELS: { idle: 'Готов к работе', working: 'Фокус', break: 'Короткий перерыв', longbreak: 'Длинный перерыв' },
  ICONS: { idle: '🍅', working: '🧠', break: '☕', longbreak: '🌿' },

  render() {
    // 283 is approx 2 * pi * 45 for stroke-dasharray
    return `
      <div class="pomodoro-page" style="overflow-y:auto; max-height:100%; width:100%; display:flex; flex-direction:column; align-items:center; padding:var(--space-xl); justify-content:flex-start; gap:8px;">
        <div style="text-align:center;margin-bottom:var(--space-md)">
          <div style="font-size:16px;color:var(--text-secondary);font-weight:600" id="pomo-state-label">Готов к работе</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:4px" id="pomo-session-count">Сессия 0 из 4</div>
        </div>

        <div class="pomodoro-timer-container" id="pomo-timer-container" style="margin: 12px 0;">
          <svg class="pomodoro-svg" viewBox="0 0 100 100">
            <circle class="pomodoro-circle-bg" cx="50" cy="50" r="45"></circle>
            <circle class="pomodoro-circle-progress" id="pomo-progress-ring" cx="50" cy="50" r="45" stroke-dasharray="283" stroke-dashoffset="0"></circle>
          </svg>
          <div class="pomodoro-content">
            <div class="pomodoro-time" id="pomo-time">25:00</div>
            <div class="pomodoro-label" id="pomo-label"><i data-lucide="check-circle" style="width:16px;height:16px;"></i> Помодоро</div>
          </div>
        </div>

        <div class="pomodoro-controls" style="margin-top: 12px;">
          <button class="btn btn-secondary btn-icon" id="pomo-reset-btn" title="Сбросить">
            <i data-lucide="rotate-ccw" style="width:20px;height:20px;"></i>
          </button>
          <button class="btn btn-primary" id="pomo-start-btn" style="padding:14px 40px;font-size:16px;border-radius:var(--radius-full);box-shadow:0 4px 16px var(--accent-glow);">
            <i data-lucide="play" style="width:20px;height:20px;margin-right:8px;vertical-align:middle;"></i> <span id="pomo-start-text">Старт</span>
          </button>
          <button class="btn btn-secondary btn-icon" id="pomo-skip-btn" title="Пропустить">
            <i data-lucide="skip-forward" style="width:20px;height:20px;"></i>
          </button>
        </div>

        <!-- Task selector -->
        <div class="pomodoro-task-wrapper" style="margin-top: 20px; width: 100%; max-width: 480px;">
          <div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:var(--space-sm);display:flex;align-items:center;gap:6px;">
            <i data-lucide="target" style="width:14px;height:14px;"></i> Привязать к задаче
          </div>
          <select id="pomo-task-select" class="form-input" style="font-size:14px;padding:10px 14px;">
            <option value="">— Без задачи —</option>
          </select>
        </div>

        <!-- Today's stats -->
        <div class="pomodoro-stats" style="width: 100%; max-width: 480px; margin-top: var(--space-md);">
          <div class="dashboard-stat" style="flex:1;">
            <div class="stat-value" id="pomo-today-count" style="display:flex;align-items:center;gap:8px;">
              <i data-lucide="check-square" style="color:var(--success);"></i> 0
            </div>
            <div class="stat-label">Помодоро сегодня</div>
          </div>
          <div class="dashboard-stat" style="flex:1;">
            <div class="stat-value" id="pomo-today-minutes" style="display:flex;align-items:center;gap:8px;">
              <i data-lucide="flame" style="color:var(--danger);"></i> 0
            </div>
            <div class="stat-label">Минут фокуса</div>
          </div>
        </div>

        <!-- Background Sounds -->
        <div class="glass-panel" style="width: 100%; max-width: 480px; padding: var(--space-lg); border-radius: var(--radius-xl); margin-top: var(--space-md); box-shadow: var(--shadow-sm); display: flex; flex-direction: column;">
          <div style="font-size: 13.5px; font-weight: 600; color: var(--text-secondary); margin-bottom: var(--space-md); display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i data-lucide="headphones" style="width: 16px; height: 16px; color: var(--accent);"></i>
              Фоновые звуки
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <i data-lucide="volume-2" style="width: 14px; height: 14px; color: var(--text-muted);"></i>
              <input type="range" id="pomo-ambient-volume" min="0" max="1" step="0.05" value="0.5" style="width: 70px; height: 4px; accent-color: var(--accent); cursor: pointer;" oninput="PomodoroPage.setAmbientVolume(this.value)">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;" id="pomo-ambient-grid">
            <button class="btn btn-secondary" onclick="PomodoroPage.toggleAmbient('rain', 'https://raw.githubusercontent.com/karthiknvd/noctune/master/public/sounds/rain.mp3')" style="display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; padding: 10px 12px; border-radius: 12px; transition: all 0.2s;" id="pomo-ambient-rain">
              🌧 Шум дождя
            </button>
            <button class="btn btn-secondary" onclick="PomodoroPage.toggleAmbient('campfire', 'https://raw.githubusercontent.com/karthiknvd/noctune/master/public/sounds/campfire.mp3')" style="display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; padding: 10px 12px; border-radius: 12px; transition: all 0.2s;" id="pomo-ambient-campfire">
              🔥 Костер
            </button>
            <button class="btn btn-secondary" onclick="PomodoroPage.toggleAmbient('wind', 'https://raw.githubusercontent.com/karthiknvd/noctune/master/public/sounds/wind.mp3')" style="display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; padding: 10px 12px; border-radius: 12px; transition: all 0.2s;" id="pomo-ambient-wind">
              💨 Ветер
            </button>
            <button class="btn btn-secondary" onclick="PomodoroPage.toggleAmbient('lofi', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3')" style="display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; padding: 10px 12px; border-radius: 12px; transition: all 0.2s;" id="pomo-ambient-lofi">
              🎵 Лоу-фай
            </button>
          </div>
        </div>
      </div>
    `;
  },

  async init() {
    this.bindEvents();
    await this.loadTasks();
    this.updateDisplay();
    this.updateAmbientUI();
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
        if (this.selectedTaskId && this.selectedTaskId === t.id) {
          opt.selected = true;
          this.currentTaskId = t.id;
        }
        select.appendChild(opt);
      });
      // Clear auto-select memory
      this.selectedTaskId = null;
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
    document.getElementById('pomo-start-btn').innerHTML = '<i data-lucide="play" style="width:20px;height:20px;margin-right:8px;vertical-align:middle;"></i> <span id="pomo-start-text">Продолжить</span>';
    if(window.lucide) window.lucide.createIcons();
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
    document.getElementById('pomo-start-btn').innerHTML = '<i data-lucide="play" style="width:20px;height:20px;margin-right:8px;vertical-align:middle;"></i> <span id="pomo-start-text">Старт</span>';
    if(window.lucide) window.lucide.createIcons();
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
      document.getElementById('pomo-start-btn').innerHTML = '<i data-lucide="play" style="width:20px;height:20px;margin-right:8px;vertical-align:middle;"></i> <span id="pomo-start-text">Старт</span>';
      if(window.lucide) window.lucide.createIcons();
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

      // Ask about task completion if a task was linked
      if (this.currentTaskId) {
        if (confirm("Вы завершили привязанную задачу? Нажмите ОК, чтобы отметить её выполненной.")) {
          try {
            await DB.updateTask(this.currentTaskId, { status: 'Готово' });
            UI.toast('Задача отмечена как Готово!', 'success');
            // Remove from dropdown
            const select = document.getElementById('pomo-task-select');
            for(let i=0; i<select.options.length; i++) {
              if (select.options[i].value === this.currentTaskId) {
                select.remove(i);
                break;
              }
            }
            this.currentTaskId = null;
            select.value = "";
          } catch(e) { console.error(e); }
        }
      }

      this.startBreak();
    } else {
      UI.toast('☕ Перерыв окончен! Время работать.', 'info');
      this.state = 'idle';
      this.timeLeft = this.DURATIONS.working;
      this.totalTime = this.DURATIONS.working;
      this.updateDisplay();
      document.getElementById('pomo-start-btn').innerHTML = '<i data-lucide="play" style="width:20px;height:20px;margin-right:8px;vertical-align:middle;"></i> <span id="pomo-start-text">Старт</span>';
      if(window.lucide) window.lucide.createIcons();
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
    const ring = document.getElementById('pomo-progress-ring');
    const container = document.getElementById('pomo-timer-container');

    if (timeEl) timeEl.textContent = timeStr;
    if (stateEl) stateEl.textContent = this.LABELS[this.state];
    if (sessionEl) sessionEl.textContent = `Сессия ${this.sessionsCompleted} из 4`;

    // Update SVG progress ring (circumference is 283)
    const progress = this.totalTime > 0 ? (this.timeLeft / this.totalTime) : 1;
    const offset = 283 - (progress * 283);
    if (ring) {
      ring.style.strokeDashoffset = offset;
    }

    // Update container classes for glowing colors
    if (container) {
      container.className = 'pomodoro-timer-container ' + this.state;
    }

    if (window.lucide) window.lucide.createIcons();
    
    // Also update start button text based on interval running
    const btn = document.getElementById('pomo-start-btn');
    if (btn) {
      if (this.interval) {
        btn.innerHTML = '<i data-lucide="pause" style="width:20px;height:20px;margin-right:8px;vertical-align:middle;"></i> Пауза';
      } else if (this.state === 'idle') {
        btn.innerHTML = '<i data-lucide="play" style="width:20px;height:20px;margin-right:8px;vertical-align:middle;"></i> Старт';
      }
      if(window.lucide) window.lucide.createIcons();
    }
  },

  async updateTodayStats() {
    const countEl = document.getElementById('pomo-today-count');
    const minEl = document.getElementById('pomo-today-minutes');
    if (countEl) countEl.innerHTML = `<i data-lucide="check-square" style="color:var(--success);"></i> ${this.sessionsCompleted}`;
    if (minEl) minEl.innerHTML = `<i data-lucide="flame" style="color:var(--danger);"></i> ${this.sessionsCompleted * 25}`;
    if(window.lucide) window.lucide.createIcons();
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
  },

  setAmbientVolume(val) {
    this.ambientVolume = Number(val);
    if (this.ambientAudio) {
      this.ambientAudio.volume = this.ambientVolume;
    }
  },

  toggleAmbient(type, url) {
    if (this.ambientAudio && this.ambientType === type) {
      this.ambientAudio.pause();
      this.ambientAudio = null;
      this.ambientType = null;
      this.updateAmbientUI();
    } else {
      if (this.ambientAudio) {
        this.ambientAudio.pause();
      }
      this.ambientAudio = new Audio(url);
      this.ambientAudio.loop = true;
      this.ambientAudio.volume = this.ambientVolume;
      this.ambientAudio.play().catch(err => console.error("Audio play failed:", err));
      this.ambientType = type;
      this.updateAmbientUI();
    }
  },

  updateAmbientUI() {
    const volumeInput = document.getElementById('pomo-ambient-volume');
    if (volumeInput) volumeInput.value = this.ambientVolume;

    const types = ['rain', 'campfire', 'wind', 'lofi'];
    types.forEach(t => {
      const btn = document.getElementById(`pomo-ambient-${t}`);
      if (btn) {
        if (this.ambientType === t && this.ambientAudio && !this.ambientAudio.paused) {
          btn.style.background = 'var(--accent-dim)';
          btn.style.borderColor = 'var(--accent)';
          btn.style.color = 'var(--text-accent)';
          btn.style.boxShadow = '0 0 10px var(--accent-glow)';
        } else {
          btn.removeAttribute('style');
        }
      }
    });
  }
};
