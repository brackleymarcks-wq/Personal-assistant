// ============================================
// SETTINGS MODULE
// ============================================

const SettingsModule = {
  currentTab: 'system',
  settings: null,

  async open() {
    this.settings = await DB.getSettings() || {};
    this.renderModal();
    document.getElementById('settings-modal').classList.remove('hidden');
  },

  renderModal() {
    this.renderTabContent();

    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTab = tab.dataset.tab;
        this.renderTabContent();
      });
    });

    document.getElementById('settings-save').onclick = () => this.save();
    document.getElementById('settings-cancel').onclick = () => this.close();
    document.getElementById('settings-close').onclick = () => this.close();
    document.getElementById('settings-modal').onclick = (e) => {
      if (e.target.id === 'settings-modal') this.close();
    };
  },

  renderTabContent() {
    const container = document.getElementById('settings-content');
    const s = this.settings;
    const rhythm = s.rhythm || DEFAULT_SETTINGS.rhythm;
    const context = s.context || DEFAULT_SETTINGS.context;
    const cfg = Config.get();

    switch (this.currentTab) {
      case 'system':
        container.innerHTML = `
          <div class="form-group">
            <label class="form-label">Тема оформления</label>
            <select id="set-theme" class="form-input">
              <option value="auto" ${cfg.theme === 'auto' || !cfg.theme ? 'selected' : ''}>Автоматически (из системы)</option>
              <option value="dark" ${cfg.theme === 'dark' ? 'selected' : ''}>Тёмная тема</option>
              <option value="light" ${cfg.theme === 'light' ? 'selected' : ''}>Светлая тема</option>
              <option value="comfort" ${cfg.theme === 'comfort' ? 'selected' : ''}>Комфорт для зрения (теплые тона)</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:var(--space-md)">
            <label class="form-label">Эффект стекла (Glassmorphism)</label>
            <select id="set-glass" class="form-input">
              <option value="true" ${cfg.glassEnabled !== false ? 'selected' : ''}>Включен</option>
              <option value="false" ${cfg.glassEnabled === false ? 'selected' : ''}>Выключен</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Системный промт ассистента</label>
            <textarea id="set-system-prompt" class="form-input" style="min-height:180px;font-size:13px;line-height:1.6">${this.esc(s.system_prompt || DEFAULT_SETTINGS.system_prompt)}</textarea>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
              Это мастер-инструкция ассистента. Определяет его личность, правила и знания о тебе.
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Твоё имя</label>
            <input id="set-name" type="text" class="form-input" value="${this.esc(cfg.userName || '')}" placeholder="Как тебя называть" />
          </div>
        `;
        break;

      case 'rhythm':
        container.innerHTML = `
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:var(--space-md)">
            Ассистент будет защищать эти временные блоки при планировании.
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">🌅 Подъём</label>
              <input id="rhy-wake" type="time" class="form-input" value="${rhythm.wake || '07:00'}" />
            </div>
            <div class="form-group">
              <label class="form-label">😴 Сон</label>
              <input id="rhy-sleep" type="time" class="form-input" value="${rhythm.sleep || '23:30'}" />
            </div>
          </div>
          <div style="background:var(--accent-dim);border:1px solid var(--border-accent);border-radius:var(--radius-md);padding:var(--space-md);margin:var(--space-sm) 0">
            <div style="font-size:12px;font-weight:600;color:var(--accent-soft);margin-bottom:var(--space-sm)">🧠 Deep Work — НЕПРИКОСНОВЕНЕН</div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Начало</label>
                <input id="rhy-dw-start" type="time" class="form-input" value="${rhythm.deep_work_start || '10:00'}" />
              </div>
              <div class="form-group">
                <label class="form-label">Конец</label>
                <input id="rhy-dw-end" type="time" class="form-input" value="${rhythm.deep_work_end || '13:00'}" />
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">🍽 Обед (начало)</label>
              <input id="rhy-lunch-start" type="time" class="form-input" value="${rhythm.lunch_start || '13:00'}" />
            </div>
            <div class="form-group">
              <label class="form-label">🍽 Обед (конец)</label>
              <input id="rhy-lunch-end" type="time" class="form-input" value="${rhythm.lunch_end || '14:00'}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">🛑 Стоп работы</label>
            <input id="rhy-work-stop" type="time" class="form-input" value="${rhythm.work_stop || '20:00'}" />
          </div>
        `;
        break;

      case 'context':
        container.innerHTML = `
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:var(--space-md)">
            Контекст автоматически включается в системный промт ассистента.
          </div>
          <div class="form-group">
            <label class="form-label">💼 Работа / Роль</label>
            <input id="ctx-work" type="text" class="form-input" value="${this.esc(context.work || '')}" placeholder="Бизнес-аналитик в HR-сфере" />
          </div>
          <div class="form-group">
            <label class="form-label">🗂 Активные проекты</label>
            <input id="ctx-projects" type="text" class="form-input" value="${this.esc(context.projects || '')}" placeholder="Митап AI-Connect, ТГ AI-Connect, Учись и применяй, ИИ Дайджест" />
          </div>
          <div class="form-group">
            <label class="form-label">🎓 Ученики / Студенты</label>
            <input id="ctx-students" type="text" class="form-input" value="${this.esc(context.students || '')}" placeholder="Ученики по английскому" />
          </div>
          <div class="form-group">
            <label class="form-label">🤝 Ключевые контакты / Клиенты</label>
            <input id="ctx-clients" type="text" class="form-input" value="${this.esc(context.clients || '')}" placeholder="Горшков" />
          </div>
          <div class="form-group">
            <label class="form-label">👨‍👩‍👧 Семья / Личное</label>
            <input id="ctx-family" type="text" class="form-input" value="${this.esc(context.family || '')}" placeholder="Дополнительный контекст" />
          </div>
        `;
        break;

      case 'keys':
        container.innerHTML = `
          <div style="background:var(--warning-dim);border:1px solid rgba(245,158,11,0.3);border-radius:var(--radius-md);padding:var(--space-md);margin-bottom:var(--space-md);font-size:13px;color:var(--warning)">
            ⚠️ Ключи хранятся в localStorage браузера. Не используй на общем компьютере.
          </div>
          <div class="form-group">
            <label class="form-label">Supabase URL</label>
            <input id="key-supabase-url" type="text" class="form-input" value="${this.esc(cfg.supabaseUrl || '')}" placeholder="https://xxxx.supabase.co" />
          </div>
          <div class="form-group">
            <label class="form-label">Supabase Anon Key</label>
            <input id="key-supabase-key" type="password" class="form-input" value="${this.esc(cfg.supabaseKey || '')}" placeholder="eyJhbGci…" />
          </div>
          <div class="form-group">
            <label class="form-label">Gemini API Key</label>
            <input id="key-gemini" type="password" class="form-input" value="${this.esc(cfg.geminiKey || '')}" placeholder="AIza…" />
          </div>
          <div style="margin-top:var(--space-md)">
            <a href="https://aistudio.google.com/app/apikey" target="_blank" class="btn btn-secondary btn-sm">
              🔑 Получить Gemini API Key
            </a>
          </div>
        `;
        break;
    }
  },

  async save() {
    const cfg = Config.get();
    const updates = {};

    // Collect from current tab
    if (this.currentTab === 'system') {
      const name = document.getElementById('set-name')?.value.trim();
      const prompt = document.getElementById('set-system-prompt')?.value;
      const theme = document.getElementById('set-theme')?.value;
      const glass = document.getElementById('set-glass')?.value === 'true';
      if (name) Config.save({ userName: name });
      if (prompt !== undefined) updates.system_prompt = prompt;
      Config.save({ theme, glassEnabled: glass });

      if (window.App && App.applyTheme) App.applyTheme();

      // Update avatar & name display
      document.getElementById('user-name-display').textContent = name || cfg.userName;
      document.getElementById('user-avatar').textContent = (name || cfg.userName).charAt(0).toUpperCase();
    }

    if (this.currentTab === 'rhythm') {
      updates.rhythm = {
        wake: document.getElementById('rhy-wake')?.value,
        deep_work_start: document.getElementById('rhy-dw-start')?.value,
        deep_work_end: document.getElementById('rhy-dw-end')?.value,
        lunch_start: document.getElementById('rhy-lunch-start')?.value,
        lunch_end: document.getElementById('rhy-lunch-end')?.value,
        work_stop: document.getElementById('rhy-work-stop')?.value,
        sleep: document.getElementById('rhy-sleep')?.value
      };
    }

    if (this.currentTab === 'context') {
      updates.context = {
        work: document.getElementById('ctx-work')?.value,
        projects: document.getElementById('ctx-projects')?.value,
        students: document.getElementById('ctx-students')?.value,
        clients: document.getElementById('ctx-clients')?.value,
        family: document.getElementById('ctx-family')?.value
      };
    }

    if (this.currentTab === 'keys') {
      Config.save({
        supabaseUrl: document.getElementById('key-supabase-url')?.value.trim(),
        supabaseKey: document.getElementById('key-supabase-key')?.value.trim(),
        geminiKey: document.getElementById('key-gemini')?.value.trim()
      });
      UI.toast('API ключи сохранены. Перезагрузи страницу.', 'success');
      this.close();
      return;
    }

    try {
      if (Object.keys(updates).length > 0) {
        this.settings = { ...this.settings, ...updates };
        await DB.saveSettings(updates);
      }
      UI.toast('Настройки сохранены', 'success');
      this.close();
    } catch (e) {
      UI.toast('Ошибка сохранения: ' + e.message, 'error');
    }
  },

  close() {
    document.getElementById('settings-modal').classList.add('hidden');
  },

  esc(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
