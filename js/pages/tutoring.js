// ============================================
// TUTORING PAGE — English lessons management
// ============================================

const TutoringPage = {
  students: [],
  lessons: [],

  render() {
    return `
      <div class="tutoring-page" style="display:flex;flex-direction:column;height:100%;">
        <div class="page-header">
          <div>
            <div class="page-title" style="font-size:24px;font-weight:800;background:linear-gradient(90deg, var(--accent), var(--accent-vibrant));-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Репетиторство 🇬🇧</div>
            <div class="page-subtitle" id="tutoring-subtitle" style="font-size:13px;color:var(--text-secondary);margin-top:4px;">Управление учениками и финансами</div>
          </div>
          <div class="page-actions" style="display:flex;gap:12px;"><button class="btn btn-secondary" id="auto-schedule-btn" style="display:flex;align-items:center;gap:6px;border-radius:12px;color:var(--accent);border-color:var(--accent-alpha);" title="Создать запланированные уроки на 7 дней вперед по расписанию учеников"><i data-lucide="calendar-plus" style="width:16px;height:16px;"></i> Авто-расписание на неделю</button>
            <button class="btn btn-secondary" id="add-student-btn" style="display:flex;align-items:center;gap:6px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
              <i data-lucide="user-plus" style="width:16px;height:16px;"></i>
              Добавить ученика
            </button>
            <button class="btn btn-primary" id="add-lesson-btn" style="display:flex;align-items:center;gap:6px;border-radius:12px;box-shadow:0 4px 12px var(--accent-alpha);">
              <i data-lucide="plus" style="width:16px;height:16px;"></i>
              Новый урок
            </button>
          </div>
        </div>

        <div style="padding:var(--space-xl);display:flex;flex-direction:column;gap:var(--space-xl);flex:1;overflow-y:auto;">
          
          <!-- Metrics Dashboard -->
          <div id="tutoring-metrics-container" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:var(--space-lg);">
            <!-- Metrics will be injected here -->
          </div>
          
          <!-- 2 Column Layout -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-xl);align-items:start;">
            
            <!-- Left Column: Students -->
            <div style="display:flex;flex-direction:column;gap:var(--space-md);">
              <h3 style="font-size:16px;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
                <i data-lucide="users" style="color:var(--accent);width:18px;height:18px;"></i> Мои ученики
              </h3>
              <div id="students-list-container" style="display:flex;flex-direction:column;gap:var(--space-md);"></div>
            </div>

            <!-- Right Column: Lessons -->
            <div style="display:flex;flex-direction:column;gap:var(--space-xl);">
              
              <div style="display:flex;flex-direction:column;gap:var(--space-md);">
                <h3 style="font-size:16px;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
                  <i data-lucide="calendar-clock" style="color:var(--warning);width:18px;height:18px;"></i> Ближайшие уроки
                </h3>
                <div id="upcoming-lessons-container" style="display:flex;flex-direction:column;gap:12px;"></div>
              </div>

              <div style="display:flex;flex-direction:column;gap:var(--space-md);">
                <h3 style="font-size:16px;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
                  <i data-lucide="history" style="color:var(--text-secondary);width:18px;height:18px;"></i> История уроков
                </h3>
                <div id="lessons-list-container" style="display:flex;flex-direction:column;gap:12px;"></div>
              </div>

            </div>
          </div>

        </div>

        <!-- Student Modal -->
        <div id="student-modal" class="modal-overlay hidden">
          <div class="modal">
            <div class="modal-header">
              <h2 class="modal-title" id="student-modal-title"><i data-lucide="user"></i> Карточка ученика</h2>
              <button class="modal-close" id="student-modal-close"><i data-lucide="x"></i></button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Имя ученика *</label>
                <input id="st-name" type="text" class="form-input" placeholder="Например: Соня Коршук" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Класс / Уровень</label>
                  <input id="st-grade" type="text" class="form-input" placeholder="Например: 5 класс" />
                </div>
                <div class="form-group">
                  <label class="form-label">Стоимость урока (BYN)</label>
                  <input id="st-price" type="number" step="0.1" class="form-input" value="0" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Расписание</label>
                <input id="st-schedule" type="text" class="form-input" placeholder="Например: Пн 18:00, Вс утро" />
              </div>
              <div class="form-group">
                <label class="form-label">🔮 Ссылка на Perplexity Space ученика</label>
                <input id="st-perplexity" type="url" class="form-input" placeholder="https://www.perplexity.ai/collections/..." style="margin-bottom:10px;" />
                <label class="form-label">📖 Учебник / Текущий Unit (программа РБ)</label>
                <input id="st-unit" type="text" class="form-input" placeholder="Например: Юхнель 6 класс, Unit 5 (Health) / Повышенный уровень" style="margin-bottom:10px;" />
                <label class="form-label">🎯 Интересы и хобби ученика (для генерации примеров Twee)</label>
                <input id="st-interests" type="text" class="form-input" placeholder="Например: Minecraft, сериалы Netflix, футбол, путешествия" style="margin-bottom:10px;" />
                <label class="form-label">⚠️ Типичные ошибки / Слабые места (Error Log)</label>
                <input id="st-errors" type="text" class="form-input" placeholder="Например: путает was/were, забывает -s в Present Simple" style="margin-bottom:10px;" />
                <label class="form-label">📚 Активный словарь (Vocabulary Bank)</label>
                <input id="st-vocab" type="text" class="form-input" placeholder="Слова и фразы на отработку" style="margin-bottom:10px;" />
                <label class="form-label">📝 Общие заметки и цели обучения</label>
                <textarea id="st-notes" class="form-input" rows="2" placeholder="Например: Путает much и many, любит обсуждать игры"></textarea>
              </div>
              <div class="form-group" style="display:flex;align-items:center;gap:8px;margin-top:8px;">
                <input id="st-active" type="checkbox" checked />
                <label for="st-active" style="font-size:13px;color:var(--text-primary);">Активный ученик</label>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-ghost danger" id="student-modal-delete" style="display:none;">Удалить</button>
              <div style="flex:1"></div>
              <button class="btn btn-secondary" id="student-modal-cancel">Отмена</button>
              <button class="btn btn-primary" id="student-modal-save">Сохранить</button>
            </div>
          </div>
        </div>

        <!-- Lesson Modal -->
        <div id="lesson-modal" class="modal-overlay hidden">
          <div class="modal">
            <div class="modal-header">
              <h2 class="modal-title" id="lesson-modal-title"><i data-lucide="book-open"></i> Запись об уроке</h2>
              <button class="modal-close" id="lesson-modal-close"><i data-lucide="x"></i></button>
            </div>
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Ученик *</label>
                  <select id="ls-student" class="form-input"></select>
                </div>
                <div class="form-group">
                  <label class="form-label">Дата и время *</label>
                  <input id="ls-date" type="datetime-local" class="form-input" />
                </div>
              </div>
              <div class="form-group">
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
                  <button type="button" id="ls-btn-perplexity" class="btn btn-primary btn-xs" style="font-size:11px;padding:6px 10px;background:linear-gradient(135deg,#0d9488,#0284c7);border:none;color:#fff;display:flex;align-items:center;gap:5px;" title="Скопировать умный промпт со всей памятью об ученике и открыть его Perplexity Space">🔮 В Perplexity Space (копировать промпт)</button>
                  <button type="button" id="ls-btn-import-perplexity" class="btn btn-secondary btn-xs" style="font-size:11px;padding:6px 10px;border-color:rgba(13,148,136,0.4);color:#0d9488;" title="Вставить готовый конспект из Perplexity — ИИ сам заполнит тему, чистое ДЗ без ключей и пополнит словарь">📥 Из Perplexity</button>
                  <button type="button" id="ls-btn-zen-board" class="btn btn-secondary btn-xs" style="font-size:11px;padding:6px 10px;" title="Открыть чистый экран для демонстрации ученику в Zoom/Telegram (без цен и заметок)">🖥 Экран ученика</button>
                </div>
                <div id="ls-memory-banner" style="margin-bottom:12px;"></div>
                <label class="form-label">Тема урока</label>
                <input id="ls-topic" type="text" class="form-input" placeholder="Например: Past Simple" />
              </div>
              <div class="form-group">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                  <label class="form-label" style="margin-bottom:0;">Домашнее задание</label>
                  <button id="ls-generate-ai" class="btn btn-ghost" style="font-size:12px;color:var(--accent);display:flex;align-items:center;gap:4px;padding:2px 8px;min-height:auto;"><i data-lucide="sparkles" style="width:12px;height:12px;"></i> Сгенерировать ИИ</button>
                </div>
                <textarea id="ls-homework" class="form-input" rows="3" placeholder="Что задано на следующий раз?"></textarea>
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">
                  <button type="button" id="ls-ai-warmup" class="btn btn-secondary btn-xs" style="font-size:11px;padding:4px 8px;">🎲 Разминка (Warm-up 5м)</button>
                  <button type="button" id="ls-ai-blitz" class="btn btn-secondary btn-xs" style="font-size:11px;padding:4px 8px;">🔍 Блиц-проверка прошлого ДЗ</button>
                  <button type="button" id="ls-ai-parent" class="btn btn-secondary btn-xs" style="font-size:11px;padding:4px 8px;">📲 Текст ученику/родителям</button>
                  <button type="button" id="ls-ai-game" class="btn btn-secondary btn-xs" style="font-size:11px;padding:4px 8px;color:var(--accent);border-color:var(--accent-alpha);">🎮 Игра на 5 минут</button>
                </div>
                <div id="ls-ai-output-box" class="hidden" style="margin-top:8px;padding:10px 12px;background:var(--bg-primary);border:1px solid var(--accent-alpha);border-radius:10px;font-size:12px;white-space:pre-wrap;max-height:200px;overflow-y:auto;"></div>
              </div>
              <div class="form-group">
                <label class="form-label">Материалы урока (Ссылки, PDF)</label>
                <input id="ls-materials" type="text" class="form-input" placeholder="Например: https://youtube.com/..." />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Статус урока</label>
                  <select id="ls-status" class="form-input">
                    <option value="Запланирован">Запланирован</option>
                    <option value="Проведен">Проведен</option>
                    <option value="Отменен">Отменен</option>
                  </select>
                </div>
                <div class="form-group" style="display:flex;align-items:center;padding-top:28px;">
                  <input id="ls-paid" type="checkbox" />
                  <label for="ls-paid" style="font-size:13px;color:var(--text-primary);margin-left:8px;">Урок оплачен</label>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-ghost danger" id="lesson-modal-delete" style="display:none;">Удалить</button>
              <div style="flex:1"></div>
              <button class="btn btn-secondary" id="lesson-modal-cancel">Отмена</button>
              <button class="btn btn-primary" id="lesson-modal-save">Сохранить</button>
            </div>
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
    document.getElementById('add-student-btn').addEventListener('click', () => this.openStudentModal());
    document.getElementById('add-lesson-btn').addEventListener('click', () => this.openLessonModal());
    document.getElementById('auto-schedule-btn')?.addEventListener('click', () => this.autoScheduleWeek());
  },

  async load() {
    try {
      [this.students, this.lessons] = await Promise.all([
        DB.getStudents(),
        DB.getLessons()
      ]);
      this.renderContent();
    } catch (e) {
      console.error(e);
    }
  },

  renderContent() {
    const sContainer = document.getElementById('students-list-container');
    const uContainer = document.getElementById('upcoming-lessons-container');
    const lContainer = document.getElementById('lessons-list-container');
    const metricsContainer = document.getElementById('tutoring-metrics-container');

    const activeSt = this.students.filter(s => s.active).length;
    
    // Calculate Monthly Income & Stats
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let monthlyIncome = 0;
    let lessonsThisMonth = 0;
    let unpaidLessonsAmount = 0;

    this.lessons.forEach(ls => {
      const d = new Date(ls.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        lessonsThisMonth++;
        if (ls.status === 'Проведен') {
          // Find student price
          const st = this.students.find(s => s.id === ls.student_id);
          const price = st ? (st.price || 0) : 0;
          if (ls.paid) { monthlyIncome += price; } else if (false) { monthlyIncome += price; }
          if (!ls.paid) {
            unpaidLessonsAmount += price;
          }
        }
      }
    });

    // Render Metrics
    metricsContainer.innerHTML = `
      <div class="glass-panel" style="padding:20px;border-radius:16px;display:flex;align-items:center;gap:16px;background:linear-gradient(145deg, var(--bg-surface), var(--bg-primary));border:1px solid var(--border-light);">
        <div style="width:48px;height:48px;border-radius:12px;background:var(--accent-alpha);color:var(--accent);display:flex;align-items:center;justify-content:center;">
          <i data-lucide="users" style="width:24px;height:24px;"></i>
        </div>
        <div>
          <div style="font-size:13px;color:var(--text-secondary);font-weight:500;">Активных учеников</div>
          <div style="font-size:24px;font-weight:800;color:var(--text-primary);">${activeSt}</div>
        </div>
      </div>
      <div class="glass-panel" style="padding:20px;border-radius:16px;display:flex;align-items:center;gap:16px;background:linear-gradient(145deg, var(--bg-surface), var(--bg-primary));border:1px solid var(--border-light);">
        <div style="width:48px;height:48px;border-radius:12px;background:rgba(16, 185, 129, 0.1);color:var(--success);display:flex;align-items:center;justify-content:center;">
          <i data-lucide="wallet" style="width:24px;height:24px;"></i>
        </div>
        <div>
          <div style="font-size:13px;color:var(--text-secondary);font-weight:500;">Оплачено в ${now.toLocaleString('ru', {month:'long'})}</div>
          <div style="font-size:24px;font-weight:800;color:var(--text-primary);">${monthlyIncome} <span style="font-size:14px;color:var(--text-muted);font-weight:600;">BYN</span></div>
          ${unpaidLessonsAmount > 0 ? `<div style="font-size:11px;color:var(--danger);font-weight:600;margin-top:2px;">⏳ Ждёт оплаты: ${unpaidLessonsAmount} BYN</div>` : `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Все проведённые оплачены</div>`}
        </div>
      </div>
      <div class="glass-panel" style="padding:20px;border-radius:16px;display:flex;align-items:center;gap:16px;background:linear-gradient(145deg, var(--bg-surface), var(--bg-primary));border:1px solid var(--border-light);">
        <div style="width:48px;height:48px;border-radius:12px;background:rgba(245, 158, 11, 0.1);color:var(--warning);display:flex;align-items:center;justify-content:center;">
          <i data-lucide="book-open-check" style="width:24px;height:24px;"></i>
        </div>
        <div>
          <div style="font-size:13px;color:var(--text-secondary);font-weight:500;">Уроков за месяц</div>
          <div style="font-size:24px;font-weight:800;color:var(--text-primary);">${lessonsThisMonth}</div>
        </div>
      </div>
    `;

    // Render Students
    if (this.students.length === 0) {
      sContainer.innerHTML = `<div class="empty-state" style="padding:32px;background:var(--bg-surface);border-radius:16px;text-align:center;"><i data-lucide="user-plus" style="width:32px;height:32px;opacity:0.3;margin-bottom:12px;"></i><br><span style="color:var(--text-secondary);font-size:14px;">Нет добавленных учеников</span></div>`;
    } else {
      sContainer.innerHTML = this.students.map(st => {
        const opacity = st.active ? '1' : '0.5';
        
        // Find unpaid lessons for this student
        const unpaidCount = this.lessons.filter(l => l.student_id === st.id && l.status === 'Проведен' && !l.paid).length;
        const debtBadge = unpaidCount > 0 ? `<div style="background:rgba(239, 68, 68, 0.1);color:var(--danger);font-size:11px;font-weight:700;padding:2px 8px;border-radius:12px;border:1px solid rgba(239,68,68,0.2);">Не оплачено: ${unpaidCount}</div>` : '';

        // Extract notes from schedule
        const dossier = this.parseStudentDossier(st);
        const displaySchedule = dossier.schedule || 'Нет расписания';
        if (displaySchedule.includes('\\n[ЗАМЕТКИ]:')) {
          displaySchedule = displaySchedule.split('\\n[ЗАМЕТКИ]:')[0];
        }

        const borderColor = unpaidCount > 0 ? 'rgba(239, 68, 68, 0.35)' : 'var(--border-light)';
        const glowEffect = unpaidCount > 0 ? 'box-shadow: 0 0 12px rgba(239, 68, 68, 0.05);' : '';
        const onMouseOver = unpaidCount > 0 
          ? "this.style.transform='translateY(-2px)';this.style.borderColor='var(--danger)';this.style.boxShadow='0 4px 16px rgba(239,68,68,0.15)';" 
          : "this.style.transform='translateY(-2px)';this.style.borderColor='var(--accent)';this.style.boxShadow='0 4px 12px var(--accent-alpha)';";
        const onMouseOut = unpaidCount > 0
          ? `this.style.transform='none';this.style.borderColor='rgba(239, 68, 68, 0.35)';this.style.boxShadow='0 0 12px rgba(239, 68, 68, 0.05)';`
          : "this.style.transform='none';this.style.borderColor='var(--border-light)';this.style.boxShadow='none';";

        return `
          <div class="glass-panel" data-id="${st.id}" style="padding:20px;border-radius:16px;cursor:pointer;opacity:${opacity};transition:all 0.2s;background:var(--bg-surface);border:1px solid ${borderColor};${glowEffect}position:relative;overflow:hidden;" onmouseover="${onMouseOver}" onmouseout="${onMouseOut}">
            ${!st.active ? '<div style="position:absolute;top:12px;right:12px;font-size:10px;background:var(--bg-secondary);padding:2px 8px;border-radius:12px;font-weight:600;">АРХИВ</div>' : ''}
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:16px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg, var(--accent), var(--accent-vibrant));color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;box-shadow:0 2px 8px var(--accent-alpha);">
                  ${st.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style="font-weight:700;font-size:16px;color:var(--text-primary);">${this.escapeHtml(st.name)}</div>
                  <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${this.escapeHtml(st.grade || 'Уровень не указан')}</div>
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-weight:800;color:var(--accent);font-size:16px;">${st.price} <span style="font-size:12px;">BYN</span></div>
              </div>
            </div>
            
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary);background:var(--bg-primary);padding:4px 8px;border-radius:8px;">
                <i data-lucide="clock" style="width:14px;height:14px;color:var(--accent);"></i>
                ${this.escapeHtml(displaySchedule)}
              </div>
              ${debtBadge}
            </div>
            ${(dossier.unit || dossier.interests || dossier.errors) ? `<div style="margin-top:8px;font-size:11px;color:var(--text-secondary);display:flex;flex-direction:column;gap:2px;">${dossier.unit ? `<div style="color:var(--accent);">📖 <b>Программа:</b> ${this.escapeHtml(dossier.unit)}</div>` : ''}${dossier.interests ? `<div>🎯 <b>Интересы:</b> ${this.escapeHtml(dossier.interests)}</div>` : ''}${dossier.errors ? `<div style="color:var(--warning);">⚠️ <b>Ошибки:</b> ${this.escapeHtml(dossier.errors)}</div>` : ''}</div>` : ''}
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:14px; padding-top:12px; border-top:1px dashed var(--border-light); width: 100%;">
              ${unpaidCount > 0 ? `
                <button class="btn btn-secondary btn-xs" onclick="event.stopPropagation(); TutoringPage.payAllDebts('${st.id}', ${unpaidCount}, ${st.price}, '${this.escapeHtml(st.name)}')" style="color:var(--danger); border-color:rgba(239,68,68,0.2); background:rgba(239,68,68,0.05); display:flex; align-items:center; gap:4px; padding: 4px 8px; font-size:11px;">
                  <i data-lucide="coins" style="width:12px;height:12px;"></i> Оплатить долг
                </button>
              ` : ''}
              <button class="btn btn-secondary btn-xs" onclick="event.stopPropagation(); TutoringPage.launchPerplexity('${st.id}')" style="display:flex; align-items:center; gap:4px; padding: 4px 8px; font-size:11px; color:#0d9488; border-color:rgba(13,148,136,0.35); background:rgba(13,148,136,0.06);" title="Скопировать промпт с памятью об ученике и открыть его Perplexity Space">
                🔮 Perplexity
              </button>
              <button class="btn btn-secondary btn-xs" onclick="event.stopPropagation(); TutoringPage.generateMonthlyReport('${st.id}')" style="display:flex; align-items:center; gap:4px; padding: 4px 8px; font-size:11px;" title="Сгенерировать ИИ-отчёт о прогрессе за месяц">
                <i data-lucide="bar-chart-2" style="width:12px;height:12px;"></i> Отчёт
              </button>
              <button class="btn btn-secondary btn-xs" onclick="event.stopPropagation(); TutoringPage.openLessonModal(null, '${st.id}')" style="display:flex; align-items:center; gap:4px; padding: 4px 8px; font-size:11px;">
                <i data-lucide="plus" style="width:12px;height:12px;"></i> Урок
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    // Split Lessons into Upcoming and History
    const upcoming = [];
    const history = [];
    this.lessons.forEach(ls => {
      if (ls.status === 'Запланирован') upcoming.push(ls);
      else history.push(ls);
    });

    const renderLessonList = (list, containerId, emptyText) => {
      const container = document.getElementById(containerId);
      if (list.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:16px;background:var(--bg-surface);border-radius:12px;text-align:center;border:1px dashed var(--border-light);">${emptyText}</div>`;
      } else {
        container.innerHTML = list.map(ls => {
          const d = new Date(ls.date);
          const isToday = d.toDateString() === now.toDateString();
          const dateStr = d.toLocaleDateString('ru-RU', { day:'numeric', month:'short' });
          const timeStr = d.toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' });
          
          let statusColor = 'var(--accent)';
          let statusIcon = 'calendar';
          if (ls.status === 'Проведен') { statusColor = 'var(--success)'; statusIcon = 'check-circle'; }
          if (ls.status === 'Отменен') { statusColor = 'var(--text-muted)'; statusIcon = 'x-circle'; }
          
          const studentName = ls.students?.name || 'Ученик';

          // Extract materials from homework
          let displayHomework = ls.homework || '';
          let displayMaterials = '';
          if (displayHomework.includes('\\n[МАТЕРИАЛЫ]:')) {
            const parts = displayHomework.split('\\n[МАТЕРИАЛЫ]:');
            displayHomework = parts[0];
            displayMaterials = parts[1].trim();
          }

          const prevDoneLesson = ls.status === 'Запланирован' ? this.getPrevConductedLesson(ls.student_id, ls.date) : null;
          const prevHwRaw = prevDoneLesson ? ((prevDoneLesson.homework || '').split('\\n[МАТЕРИАЛЫ]:')[0].trim()) : '';
          const prevHwChecked = prevHwRaw.includes('[ДЗ_ПРОВЕРЕНО]');
          const prevHwClean = prevHwRaw.replace('[ДЗ_ПРОВЕРЕНО]', '').trim();
          const hasLinks = displayMaterials.includes('http');

          return `
            <div class="glass-panel lesson-card" data-id="${ls.id}" style="padding:14px;border-radius:12px;display:flex;align-items:center;gap:16px;cursor:pointer;border-left:4px solid ${statusColor};background:var(--bg-surface);transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
              <div style="flex-shrink:0;width:56px;text-align:center;">
                <div style="font-size:12px;color:${isToday ? 'var(--accent)' : 'var(--text-secondary)'};font-weight:700;text-transform:uppercase;">${isToday ? 'СЕГОДНЯ' : dateStr}</div>
                <div style="font-size:16px;font-weight:800;color:var(--text-primary);">${timeStr}</div>
              </div>
              <div style="flex:1;border-left:1px solid var(--border-light);padding-left:16px;overflow:hidden;">
                <div style="font-weight:700;font-size:15px;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
                  ${this.escapeHtml(studentName)}
                  ${ls.status === 'Проведен' ? (ls.paid ? '<span style="font-size:10px;background:rgba(16,185,129,0.1);color:var(--success);padding:2px 6px;border-radius:8px;font-weight:700;">ОПЛАЧЕНО</span>' : `<span style="font-size:10px;background:rgba(239,68,68,0.1);color:var(--danger);padding:2px 6px;border-radius:8px;font-weight:700;">НЕ ОПЛАЧЕНО</span><button class="btn btn-secondary btn-xs" style="font-size:10px;padding:2px 6px;color:var(--success);border-color:rgba(16,185,129,0.3);" onclick="event.stopPropagation(); TutoringPage.paySingleLesson('${ls.id}')">💰 Отметить оплату</button>`) : ''}
                </div>
                <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;display:flex;flex-direction:column;gap:4px;">
                  ${ls.topic ? `<div style="display:flex;align-items:center;gap:6px;"><i data-lucide="book" style="width:12px;height:12px;"></i> <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.escapeHtml(ls.topic)}</span></div>` : ''} 
                  ${displayHomework ? `<div style="display:flex;align-items:center;gap:6px;"><i data-lucide="edit-3" style="width:12px;height:12px;"></i> <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.escapeHtml(displayHomework.replace('[ДЗ_ПРОВЕРЕНО]', '✅ '))}</span></div>` : ''}
                  ${(ls.status === 'Запланирован' && prevDoneLesson && prevHwClean) ? `<div style="margin-top:4px;padding:6px 8px;border-radius:8px;background:${prevHwChecked ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.12)'};border:1px solid ${prevHwChecked ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.3)'};font-size:11px;display:flex;justify-content:space-between;align-items:center;gap:8px;"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${prevHwChecked ? '✅ ДЗ проверено:' : '📌 <b>Проверить ДЗ:</b>'} ${this.escapeHtml(prevHwClean)}</span>${!prevHwChecked ? `<button class="btn btn-secondary btn-xs" style="font-size:10px;padding:2px 6px;flex-shrink:0;" onclick="event.stopPropagation(); TutoringPage.markPrevHwChecked('${prevDoneLesson.id}')">✅ Проверено</button>` : ''}</div>` : ''}
                  ${ls.status === 'Запланирован' ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;"><button class="btn btn-secondary btn-xs" style="font-size:10px;padding:3px 8px;color:#0d9488;border-color:rgba(13,148,136,0.35);background:rgba(13,148,136,0.06);" onclick="event.stopPropagation(); TutoringPage.launchPerplexity('${ls.student_id}', '${ls.id}')">🔮 В Perplexity</button><button class="btn btn-secondary btn-xs" style="font-size:10px;padding:3px 8px;" onclick="event.stopPropagation(); TutoringPage.openZenBoard('${ls.id}')">🖥 Экран ученика</button></div>` : ''}
                  ${displayMaterials ? `<div style="display:flex;align-items:center;gap:6px;color:var(--accent);"><i data-lucide="paperclip" style="width:12px;height:12px;"></i> <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${hasLinks ? `<a href="${displayMaterials}" target="_blank" onclick="event.stopPropagation()" style="color:var(--accent);text-decoration:underline;">Материалы прикреплены</a>` : this.escapeHtml(displayMaterials)}</span></div>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    };

    // Sort upcoming ascending (nearest first), history descending (newest first)
    upcoming.sort((a,b) => new Date(a.date) - new Date(b.date));
    history.sort((a,b) => new Date(b.date) - new Date(a.date));

    renderLessonList(upcoming, 'upcoming-lessons-container', 'Нет запланированных уроков');
    renderLessonList(history, 'lessons-list-container', 'История пуста');

    if (window.lucide) window.lucide.createIcons();

    // Bind card clicks
    sContainer.querySelectorAll('.glass-panel').forEach(card => {
      card.addEventListener('click', () => this.openStudentModal(card.dataset.id));
    });
    uContainer.querySelectorAll('.lesson-card').forEach(card => {
      card.addEventListener('click', () => this.openLessonModal(card.dataset.id));
    });
    lContainer.querySelectorAll('.lesson-card').forEach(card => {
      card.addEventListener('click', () => this.openLessonModal(card.dataset.id));
    });
  },

  // ---- STUDENT MODAL ----
  openStudentModal(id = null) {
    const st = id ? this.students.find(s => s.id === id) : null;
    const modal = document.getElementById('student-modal');
    
    document.getElementById('st-name').value = st ? st.name : '';
    document.getElementById('st-grade').value = st ? (st.grade || '') : '';
    document.getElementById('st-price').value = st ? st.price : 0;
    
    const dossier = st ? this.parseStudentDossier(st) : { schedule: '', perplexity: '', unit: '', interests: '', errors: '', vocab: '', notes: '' };
    document.getElementById('st-perplexity').value = dossier.perplexity || '';
    document.getElementById('st-unit').value = dossier.unit || '';
    document.getElementById('st-schedule').value = dossier.schedule;
    document.getElementById('st-interests').value = dossier.interests;
    document.getElementById('st-errors').value = dossier.errors;
    document.getElementById('st-vocab').value = dossier.vocab;
    document.getElementById('st-notes').value = dossier.notes;
    if (false) {
    let displaySchedule = st ? (st.schedule || '') : '';
    let notes = '';
    if (displaySchedule.includes('\\n[ЗАМЕТКИ]:')) {
      const parts = displaySchedule.split('\\n[ЗАМЕТКИ]:');
      displaySchedule = parts[0];
      notes = parts[1].trim();
    }
    document.getElementById('st-schedule').value = displaySchedule;
    document.getElementById('st-notes').value = notes;
    }
    document.getElementById('st-active').checked = st ? st.active : true;

    const delBtn = document.getElementById('student-modal-delete');
    delBtn.style.display = st ? '' : 'none';

    document.getElementById('student-modal-save').onclick = () => this.saveStudent(st?.id);
    document.getElementById('student-modal-cancel').onclick = () => modal.classList.add('hidden');
    document.getElementById('student-modal-close').onclick = () => modal.classList.add('hidden');
    delBtn.onclick = () => { modal.classList.add('hidden'); this.deleteStudent(st?.id); };

    modal.classList.remove('hidden');
  },

  async saveStudent(id = null) {
    const name = document.getElementById('st-name').value;
    if (!name) return UI.toast('Введите имя', 'warning');

    let schedule = this.serializeStudentDossier(
      document.getElementById('st-schedule').value.trim(),
      document.getElementById('st-interests').value.trim(),
      document.getElementById('st-errors').value.trim(),
      document.getElementById('st-vocab').value.trim(),
      document.getElementById('st-notes').value.trim(),
      document.getElementById('st-perplexity').value.trim(),
      document.getElementById('st-unit').value.trim()
    );
    if (false) {
    const notes = document.getElementById('st-notes').value.trim();
    if (notes) {
      schedule += '\\n[ЗАМЕТКИ]:\\n' + notes;
    }

    }
    const data = {
      name,
      grade: document.getElementById('st-grade').value,
      price: parseFloat(document.getElementById('st-price').value) || 0,
      schedule: schedule,
      active: document.getElementById('st-active').checked
    };

    try {
      if (id) await DB.updateStudent(id, data);
      else await DB.createStudent(data);
      document.getElementById('student-modal').classList.add('hidden');
      UI.toast('Ученик сохранен', 'success');
      await this.load();
    } catch(e) { UI.toast('Ошибка: ' + e.message, 'error'); }
  },

  async deleteStudent(id) {
    if (!confirm('Удалить ученика и все его уроки?')) return;
    try {
      await DB.deleteStudent(id);
      UI.toast('Ученик удален', 'info');
      await this.load();
    } catch(e) { UI.toast('Ошибка: ' + e.message, 'error'); }
  },

  // ---- LESSON MODAL ----
  openLessonModal(id = null, studentId = null) {
    if (this.students.length === 0) return UI.toast('Сначала добавьте ученика', 'warning');
    
    const ls = id ? this.lessons.find(l => l.id === id) : null;
    const modal = document.getElementById('lesson-modal');
    
    const sSelect = document.getElementById('ls-student');
    sSelect.innerHTML = this.students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    if (ls) sSelect.value = ls.student_id;
    else if (studentId) sSelect.value = studentId;

    // Set date to now if new
    const dStr = ls ? new Date(ls.date).toISOString().slice(0,16) : new Date().toLocaleString('sv-SE', {timeZone: 'Europe/Minsk'}).replace(' ', 'T').slice(0,16);
    document.getElementById('ls-date').value = dStr;
    
    document.getElementById('ls-topic').value = ls ? (ls.topic || '') : '';
    
    let displayHomework = ls ? (ls.homework || '') : '';
    let materials = '';
    if (displayHomework.includes('\\n[МАТЕРИАЛЫ]:')) {
      const parts = displayHomework.split('\\n[МАТЕРИАЛЫ]:');
      displayHomework = parts[0];
      materials = parts[1].trim();
    }
    
    document.getElementById('ls-homework').value = displayHomework;
    document.getElementById('ls-materials').value = materials;
    document.getElementById('ls-status').value = ls ? ls.status : 'Запланирован';
    document.getElementById('ls-paid').checked = ls ? ls.paid : false;

    const delBtn = document.getElementById('lesson-modal-delete');
    delBtn.style.display = ls ? '' : 'none';

    // AI Generation click
    this.renderLessonMemoryBanner(sSelect.value, ls?.date);
    sSelect.onchange = () => this.renderLessonMemoryBanner(sSelect.value, ls?.date);
    const outBox = document.getElementById('ls-ai-output-box');
    if (outBox) { outBox.classList.add('hidden'); outBox.innerHTML = ''; }
    const runTweeMode = async (mode, btnEl, label) => {
      const student_id = document.getElementById('ls-student').value;
      const st = this.students.find(s => s.id === student_id);
      if (!st) return UI.toast('Выберите ученика', 'warning');
      const topic = document.getElementById('ls-topic').value.trim();
      const hw = document.getElementById('ls-homework').value.trim();
      const dossier = this.parseStudentDossier(st);
      const prevLs = this.getPrevConductedLesson(st.id, ls?.date);
      btnEl.disabled = true;
      btnEl.textContent = '⏳ Генерирую...';
      try {
        const res = await Gemini.generateTutoringAI(mode, { name: st.name, grade: st.grade, ...dossier }, { topic, homework: hw }, prevLs);
        if (mode === 'homework') {
          document.getElementById('ls-homework').value = res;
          UI.toast('Персональное ДЗ сгенерировано!', 'success');
        } else if (outBox) {
          outBox.classList.remove('hidden');
          outBox.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><b>${label}</b><button type="button" class="btn btn-secondary btn-xs" style="font-size:10px;padding:2px 6px;" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText);UI.toast('Скопировано в буфер!','success')">📋 Скопировать</button></div><div>${this.escapeHtml(res)}</div>`;
        }
      } catch (e) {
        UI.toast('Ошибка ИИ: ' + e.message, 'error');
      } finally {
        btnEl.disabled = false;
        btnEl.textContent = label;
      }
    };
    const warmupBtn = document.getElementById('ls-ai-warmup');
    if (warmupBtn) warmupBtn.onclick = () => runTweeMode('warmup', warmupBtn, '🎲 Разминка (Warm-up 5м)');
    const blitzBtn = document.getElementById('ls-ai-blitz');
    if (blitzBtn) blitzBtn.onclick = () => runTweeMode('blitz_check', blitzBtn, '🔍 Блиц-проверка прошлого ДЗ');
    const parentBtn = document.getElementById('ls-ai-parent');
    if (parentBtn) parentBtn.onclick = () => runTweeMode('parent_msg', parentBtn, '📲 Текст ученику/родителям');
    const gameBtn = document.getElementById('ls-ai-game');
    if (gameBtn) gameBtn.onclick = () => runTweeMode('game_5min', gameBtn, '🎮 Игра на 5 минут');
    const pplxBtn = document.getElementById('ls-btn-perplexity');
    if (pplxBtn) pplxBtn.onclick = () => this.launchPerplexity(document.getElementById('ls-student').value, ls?.id);
    const impBtn = document.getElementById('ls-btn-import-perplexity');
    if (impBtn) impBtn.onclick = () => this.importFromPerplexity(document.getElementById('ls-student').value, ls?.id);
    const zenBtn = document.getElementById('ls-btn-zen-board');
    if (zenBtn) zenBtn.onclick = () => this.openZenBoard(ls?.id, document.getElementById('ls-student').value);
    const aiBtn = document.getElementById('ls-generate-ai');
    aiBtn.onclick = async () => {
      const student_id = document.getElementById('ls-student').value;
      const st = this.students.find(s => s.id === student_id);
      const topic = document.getElementById('ls-topic').value.trim();
      
      if (!st) return UI.toast('Выберите ученика', 'warning');
      if (!topic) return UI.toast('Укажите тему урока для генерации (например, Past Simple)', 'warning');
      
      aiBtn.innerHTML = '<i class="lucide-loader" style="width:12px;height:12px;animation:spin 1s linear infinite;"></i> Генерируем...';
      aiBtn.disabled = true;
      
      try {
        const homework = await Gemini.generateTutoringAI('homework', { name: st.name, grade: st.grade, ...this.parseStudentDossier(st) }, { topic }, this.getPrevConductedLesson(st.id, ls?.date));
        document.getElementById('ls-homework').value = homework;
        UI.toast('Домашка сгенерирована!', 'success');
      } catch (e) {
        UI.toast('Ошибка ИИ: ' + e.message, 'error');
      } finally {
        aiBtn.innerHTML = '<i data-lucide="sparkles" style="width:12px;height:12px;"></i> Сгенерировать ИИ';
        aiBtn.disabled = false;
        if (window.lucide) window.lucide.createIcons();
      }
    };

    document.getElementById('lesson-modal-save').onclick = () => this.saveLesson(ls?.id);
    document.getElementById('lesson-modal-cancel').onclick = () => modal.classList.add('hidden');
    document.getElementById('lesson-modal-close').onclick = () => modal.classList.add('hidden');
    delBtn.onclick = () => { modal.classList.add('hidden'); this.deleteLesson(ls?.id); };

    modal.classList.remove('hidden');
  },

  async saveLesson(id = null) {
    const student_id = document.getElementById('ls-student').value;
    const dStr = document.getElementById('ls-date').value;
    if (!student_id || !dStr) return UI.toast('Заполните обязательные поля', 'warning');

    let homework = document.getElementById('ls-homework').value;
    const materials = document.getElementById('ls-materials').value.trim();
    { if (materials) {
      homework += '\\n[МАТЕРИАЛЫ]:\\n' + materials;
    }

    }
    const data = {
      student_id,
      date: new Date(dStr).toISOString(),
      topic: document.getElementById('ls-topic').value,
      homework: homework,
      status: document.getElementById('ls-status').value,
      paid: document.getElementById('ls-paid').checked
    };

    // Finance integration
    const ls = id ? this.lessons.find(l => l.id === id) : null;
    const wasPaid = ls ? ls.paid : false;
    const isPaidNow = data.paid;
    const isConductedNow = data.status === 'Проведен';
    
    let createTx = false;
    if (!wasPaid && isPaidNow && isConductedNow) {
      const st = this.students.find(s => s.id === student_id);
      const price = st ? (st.price || 0) : 0;
      if (price > 0) {
        if (confirm(`Зачислить оплату за урок (${price} BYN) в Финансы (Доходы)?`)) {
          createTx = { amount: price, name: st.name };
        }
      }
    }

    try {
      if (id) await DB.updateLesson(id, data);
      else await DB.createLesson(data);
      
      // Execute Finance Transaction if confirmed
      if (createTx) {
        await DB.createTransaction({
          type: 'income',
          amount: createTx.amount,
          category: 'Репетиторство',
          description: JSON.stringify({ text: `Оплата за урок: ${createTx.name} (${data.topic || 'Без темы'})` })
        });
        UI.toast('Оплата добавлена в Финансы!', 'success');
      }

      // Auto-complete related tasks
      if (isConductedNow) {
        try {
          const st = this.students.find(s => s.id === student_id);
          if (st) {
            const firstName = st.name.split(' ')[0].toLowerCase();
            const allTasks = await DB.getTasks(); 
            const relatedTasks = allTasks.filter(t => 
              (t.area === 'Репетиторство' || t.area === 'Все') && 
              !['Готово', 'Отменена'].includes(t.status) &&
              t.title.toLowerCase().includes(firstName) &&
              t.title.toLowerCase().includes('урок')
            );
            
            for (const t of relatedTasks) {
              await DB.updateTask(t.id, { status: 'Готово' });
              UI.toast(`Связанная задача "${t.title}" выполнена!`, 'info');
            }
          }
        } catch (e) {
          console.error('Failed to auto-complete related tasks:', e);
        }
      }

      document.getElementById('lesson-modal').classList.add('hidden');
      if (!createTx) UI.toast('Урок сохранен', 'success');
      await this.load();
    } catch(e) { UI.toast('Ошибка: ' + e.message, 'error'); }
  },

  async deleteLesson(id) {
    if (!confirm('Удалить урок?')) return;
    try {
      await DB.deleteLesson(id);
      UI.toast('Урок удален', 'info');
      await this.load();
    } catch(e) { UI.toast('Ошибка: ' + e.message, 'error'); }
  },

  async payAllDebts(studentId, unpaidCount, pricePerLesson, studentName) {
    const total = unpaidCount * pricePerLesson;
    if (!confirm(`Отметить все неоплаченные проведенные уроки (${unpaidCount} шт.) для ${studentName} как оплаченные?\nОбщая сумма: ${total} BYN`)) {
      return;
    }

    const unpaidConductedLessons = this.lessons.filter(l => l.student_id === studentId && l.status === 'Проведен' && !l.paid);
    if (unpaidConductedLessons.length === 0) return;

    try {
      // Update each lesson to paid = true
      await Promise.all(unpaidConductedLessons.map(l => DB.updateLesson(l.id, { paid: true })));

      // Ask user if they want to log this into Finances
      if (confirm(`Зачислить общую сумму оплаты (${total} BYN) в Финансы (Доходы)?`)) {
        await DB.createTransaction({
          type: 'income',
          amount: total,
          category: 'Репетиторство',
          description: JSON.stringify({ text: `Оплата долга за ${unpaidCount} уроков: ${studentName}` })
        });
        UI.toast('Оплата занесена в Финансы!', 'success');
      }

      UI.toast('Все уроки отмечены как оплаченные!', 'success');
      await this.load(); // Reload and redraw content
    } catch (e) {
      console.error(e);
      UI.toast('Ошибка при оплате: ' + e.message, 'error');
    }
  },

  async autoScheduleWeek() {
    const activeStudents = this.students.filter(s => s.active && s.schedule);
    if (activeStudents.length === 0) return UI.toast('Нет активных учеников с заполненным расписанием', 'warning');
    const dayMap = { 'вс': 0, 'воскр': 0, 'пн': 1, 'пон': 1, 'вт': 2, 'втор': 2, 'ср': 3, 'сред': 3, 'чт': 4, 'четв': 4, 'пт': 5, 'пятн': 5, 'сб': 6, 'суб': 6 };
    let createdCount = 0;
    const now = new Date();
    for (const st of activeStudents) {
      const schedRaw = (st.schedule || '').split('\\n[ЗАМЕТКИ]:')[0].toLowerCase();
      const parts = schedRaw.split(/[,;]+/);
      for (const part of parts) {
        let targetDow = null;
        for (const [k, dow] of Object.entries(dayMap)) {
          if (new RegExp(`(^|[^а-яё])${k}`, 'i').test(part)) { targetDow = dow; break; }
        }
        if (targetDow === null) continue;
        let hour = 18, min = 0;
        const timeMatch = part.match(/(\d{1,2})[:.](\d{2})/);
        if (timeMatch) { hour = parseInt(timeMatch[1], 10); min = parseInt(timeMatch[2], 10); }
        else if (part.includes('утр')) { hour = 10; min = 0; }
        else if (part.includes('дн') || part.includes('обед')) { hour = 14; min = 0; }
        for (let offset = 0; offset < 7; offset++) {
          const d = new Date(now);
          d.setDate(now.getDate() + offset);
          if (d.getDay() === targetDow) {
            d.setHours(hour, min, 0, 0);
            if (d < now) continue;
            const dateDayStr = d.toISOString().split('T')[0];
            const exists = this.lessons.some(l => l.student_id === st.id && l.date.startsWith(dateDayStr));
            if (!exists) {
              await DB.createLesson({ student_id: st.id, date: d.toISOString(), topic: '', homework: '', status: 'Запланирован', paid: false });
              createdCount++;
            }
          }
        }
      }
    }
    if (createdCount > 0) {
      UI.toast(`Сгенерировано уроков на неделю: ${createdCount}`, 'success');
      await this.load();
    } else {
      UI.toast('Все уроки по расписанию на эту неделю уже созданы!', 'info');
    }
  },
  parseStudentDossier(st) {
    const raw = st?.schedule || '';
    const getSec = (tag) => {
      const idx = raw.indexOf(tag);
      if (idx === -1) return '';
      const rest = raw.slice(idx + tag.length);
      const nextIdx = rest.search(/\\n\[(ЗАМЕТКИ|ИНТЕРЕСЫ|ОШИБКИ|СЛОВАРЬ|PERPLEXITY|УЧЕБНИК)\]:|\n\[(ЗАМЕТКИ|ИНТЕРЕСЫ|ОШИБКИ|СЛОВАРЬ|PERPLEXITY|УЧЕБНИК)\]:/);
      return (nextIdx === -1 ? rest : rest.slice(0, nextIdx)).replace(/^\\n|^\n/, '').trim();
    };
    const firstTagIdx = raw.search(/\\n\[(ЗАМЕТКИ|ИНТЕРЕСЫ|ОШИБКИ|СЛОВАРЬ|PERPLEXITY|УЧЕБНИК)\]:|\n\[(ЗАМЕТКИ|ИНТЕРЕСЫ|ОШИБКИ|СЛОВАРЬ|PERPLEXITY|УЧЕБНИК)\]:/);
    const schedule = (firstTagIdx === -1 ? raw : raw.slice(0, firstTagIdx)).trim();
    return {
      schedule,
      perplexity: getSec('[PERPLEXITY]:'),
      unit: getSec('[УЧЕБНИК]:'),
      interests: getSec('[ИНТЕРЕСЫ]:'),
      errors: getSec('[ОШИБКИ]:'),
      vocab: getSec('[СЛОВАРЬ]:'),
      notes: getSec('[ЗАМЕТКИ]:')
    };
  },

  serializeStudentDossier(schedule, interests, errors, vocab, notes, perplexity = '', unit = '') {
    let out = schedule || '';
    if (perplexity) out += `\\n[PERPLEXITY]:\\n${perplexity}`;
    if (unit) out += `\\n[УЧЕБНИК]:\\n${unit}`;
    if (interests) out += `\\n[ИНТЕРЕСЫ]:\\n${interests}`;
    if (errors) out += `\\n[ОШИБКИ]:\\n${errors}`;
    if (vocab) out += `\\n[СЛОВАРЬ]:\\n${vocab}`;
    if (notes) out += `\\n[ЗАМЕТКИ]:\\n${notes}`;
    return out;
  },

  getPrevConductedLesson(studentId, beforeDate = null) {
    const cutoff = beforeDate ? new Date(beforeDate).getTime() : Infinity;
    const conducted = this.lessons
      .filter(l => l.student_id === studentId && l.status === 'Проведен' && new Date(l.date).getTime() <= cutoff)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return conducted[0] || null;
  },

  async markPrevHwChecked(lessonId) {
    const ls = this.lessons.find(l => l.id === lessonId);
    if (!ls) return;
    if ((ls.homework || '').includes('[ДЗ_ПРОВЕРЕНО]')) return;
    const updatedHw = `[ДЗ_ПРОВЕРЕНО] ${ls.homework || ''}`.trim();
    await DB.updateLesson(lessonId, { homework: updatedHw });
    UI.toast('Домашнее задание отмечено как проверенное! ✅', 'success');
    await this.load();
  },

  renderLessonMemoryBanner(studentId, lessonDate = null) {
    const banner = document.getElementById('ls-memory-banner');
    if (!banner) return;
    const st = this.students.find(s => s.id === studentId);
    if (!st) { banner.innerHTML = ''; return; }
    const dossier = this.parseStudentDossier(st);
    const prev = this.getPrevConductedLesson(studentId, lessonDate);
    const ebb = this.getEbbinghausLesson(studentId, lessonDate);
    const prevHwRaw = prev ? ((prev.homework || '').split('\\n[МАТЕРИАЛЫ]:')[0].trim()) : '';
    const isChecked = prevHwRaw.includes('[ДЗ_ПРОВЕРЕНО]');
    const cleanHw = prevHwRaw.replace('[ДЗ_ПРОВЕРЕНО]', '').trim();

    banner.innerHTML = `
      <div style="padding:10px 12px;border-radius:10px;background:var(--bg-primary);border:1px solid var(--border-light);font-size:12px;display:flex;flex-direction:column;gap:4px;">
        <div style="font-weight:700;color:var(--accent);display:flex;justify-content:space-between;align-items:center;">
          <span>🧠 Память по ученику: ${this.escapeHtml(st.name)}</span>
          ${prev ? `<span style="font-size:11px;color:var(--text-muted);">Прошлый урок: ${new Date(prev.date).toLocaleDateString('ru-RU')}</span>` : ''}
        </div>
        ${prev ? `<div>⏪ <b>Прошлая тема:</b> ${this.escapeHtml(prev.topic || 'Не указана')}</div>` : '<div style="color:var(--text-muted);">Проведённых уроков пока нет</div>'}
        ${cleanHw ? `<div style="color:${isChecked ? 'var(--success)' : 'var(--warning)'};">📌 <b>Заданное ДЗ:</b> ${this.escapeHtml(cleanHw)} ${isChecked ? '✅ (Проверено)' : `<button type="button" class="btn btn-secondary btn-xs" style="font-size:10px;padding:1px 6px;margin-left:6px;" onclick="TutoringPage.markPrevHwChecked('${prev.id}').then(()=>TutoringPage.renderLessonMemoryBanner('${studentId}'))">✅ Отметить проверенным</button>`}</div>` : ''}
        ${ebb ? `<div style="color:#0d9488;font-weight:600;">🔄 <b>Кривая Эббингауза (повторить тему ~2 нед. назад, ${new Date(ebb.date).toLocaleDateString('ru-RU')}):</b> ${this.escapeHtml(ebb.topic)}</div>` : ''}
        ${dossier.unit ? `<div>📖 <b>Учебник / Unit:</b> ${this.escapeHtml(dossier.unit)}</div>` : ''}
        ${dossier.errors ? `<div>⚠️ <b>Слабые места:</b> ${this.escapeHtml(dossier.errors)}</div>` : ''}
        ${dossier.interests ? `<div>🎯 <b>Интересы:</b> ${this.escapeHtml(dossier.interests)}</div>` : ''}
      </div>
    `;
  },

  async generateMonthlyReport(studentId) {
    const st = this.students.find(s => s.id === studentId);
    if (!st) return;
    const dossier = this.parseStudentDossier(st);
    const stLessons = this.lessons.filter(l => l.student_id === studentId && l.status === 'Проведен');
    UI.toast('Генерирую ИИ-отчёт о прогрессе...', 'info');
    try {
      const report = await Gemini.generateTutoringAI('monthly_report', { name: st.name, grade: st.grade, ...dossier }, {}, stLessons[0], stLessons);
      try { await navigator.clipboard.writeText(report); } catch (e) {}
      alert(`📊 ОТЧЁТ О ПРОГРЕССЕ (${st.name}) — скопирован в буфер обмена!\n\n${report}`);
    } catch (e) {
      UI.toast('Ошибка генерации отчёта: ' + e.message, 'error');
    }
  },

  async paySingleLesson(lessonId) {
    const ls = this.lessons.find(l => l.id === lessonId);
    if (!ls) return;
    const st = this.students.find(s => s.id === ls.student_id);
    const price = st ? (Number(st.price) || 0) : 0;
    const stName = st ? st.name : 'Ученик';
    try {
      await DB.updateLesson(lessonId, { paid: true });
      if (price > 0) {
        await DB.createTransaction({
          type: 'income',
          amount: price,
          category: 'Репетиторство',
          description: JSON.stringify({ text: `Оплата за урок: ${stName} (${ls.topic || 'Без темы'})` })
        });
      }
      UI.toast(`Оплата ${price} BYN зачислена в Доходы! 💰`, 'success');
      await this.load();
    } catch (e) {
      UI.toast('Ошибка: ' + e.message, 'error');
    }
  },

  getEbbinghausLesson(studentId, refDate = null) {
    const baseMs = refDate ? new Date(refDate).getTime() : Date.now();
    const minMs = baseMs - 25 * 24 * 3600 * 1000;
    const maxMs = baseMs - 10 * 24 * 3600 * 1000;
    const candidates = this.lessons
      .filter(l => l.student_id === studentId && l.status === 'Проведен' && l.topic && new Date(l.date).getTime() >= minMs && new Date(l.date).getTime() <= maxMs)
      .sort((a, b) => Math.abs((baseMs - 14 * 86400000) - new Date(a.date).getTime()) - Math.abs((baseMs - 14 * 86400000) - new Date(b.date).getTime()));
    return candidates[0] || null;
  },

  buildPerplexityPrompt(studentId, lessonId = null, customTopic = '') {
    const st = this.students.find(s => s.id === studentId);
    if (!st) return '';
    const ls = lessonId ? this.lessons.find(l => l.id === lessonId) : null;
    const dossier = this.parseStudentDossier(st);
    const prev = this.getPrevConductedLesson(studentId, ls?.date);
    const ebb = this.getEbbinghausLesson(studentId, ls?.date);
    const prevHwClean = prev ? ((prev.homework || '').split('\\n[МАТЕРИАЛЫ]:')[0].replace('[ДЗ_ПРОВЕРЕНО]', '').trim()) : '';
    const modalTopic = (!document.getElementById('lesson-modal')?.classList.contains('hidden')) ? (document.getElementById('ls-topic')?.value?.trim() || '') : '';
    const todayTopic = customTopic || modalTopic || ls?.topic || 'Продолжение по программе + отработка лексики и говорения';

    return [
      `Привет! Готовим и проводим интерактивный урок английского языка.`,
      `👤 Ученик: ${st.name} (${st.grade || 'уровень не указан'})`,
      dossier.unit ? `📖 Учебник / Программа: ${dossier.unit}` : '',
      dossier.interests ? `🎯 Интересы и хобби ученика (используй их во всех примерах и текстах!): ${dossier.interests}` : '',
      dossier.errors ? `⚠️ Типичные ошибки ученика (включи ловушки на эти правила!): ${dossier.errors}` : '',
      dossier.vocab ? `📚 Активный словарь на отработку: ${dossier.vocab}` : '',
      prev ? `⏪ Прошлый урок (${new Date(prev.date).toLocaleDateString('ru-RU')}): Тема "${prev.topic || 'Практика'}"${prevHwClean ? `, Заданное ДЗ: "${prevHwClean}"` : ''}` : '',
      ebb ? `🔄 Интервальное повторение по Эббингаузу (проходили ~2 недели назад, ${new Date(ebb.date).toLocaleDateString('ru-RU')}): "${ebb.topic}" — обязательно вплети 2 вопроса на повторение этой темы!` : '',
      `\n🎯 ТЕМА СЕГОДНЯШНЕГО УРОКА: ${todayTopic}`,
      `\nПожалуйста, сгенерируй структурированный материал для урока:`,
      `1. 🔥 Warm-up (5 мин): 3 живых вопроса для разминки (Speaking) на основе интересов ученика + быстрая проверка прошлого ДЗ и 2 вопроса по теме 2-недельной давности.`,
      `2. 💡 Основной блок: наглядное объяснение / интерактивное задание и 5-6 практических предложений/ситуаций в контексте интересов ученика (с ловушками на его типичные ошибки).`,
      `3. 🗣 Speaking / Roleplay: короткая игровая ситуация или мини-дебаты для вывода темы в речь.`,
      `4. 🏠 Домашнее задание на 10-15 минут (отдельным блоком в конце без ответов, а ключи для преподавателя вынеси в самый низ).`
    ].filter(Boolean).join('\n');
  },

  async launchPerplexity(studentId, lessonId = null) {
    const st = this.students.find(s => s.id === studentId);
    if (!st) return UI.toast('Выберите ученика', 'warning');
    const dossier = this.parseStudentDossier(st);
    const prompt = this.buildPerplexityPrompt(studentId, lessonId);
    try {
      await navigator.clipboard.writeText(prompt);
      UI.toast(`🔮 Мастер-промпт для ${st.name} скопирован в буфер! Нажми Ctrl+V в Perplexity`, 'success');
    } catch (e) {
      prompt('Скопируйте промпт для Perplexity:', prompt);
    }
    const targetUrl = (dossier.perplexity && dossier.perplexity.startsWith('http')) ? dossier.perplexity : 'https://www.perplexity.ai/';
    window.open(targetUrl, '_blank');
  },

  async importFromPerplexity(studentId, lessonId = null) {
    const st = this.students.find(s => s.id === studentId);
    if (!st) return UI.toast('Сначала выберите ученика', 'warning');
    const rawText = prompt(`📥 Вставьте скопированный ответ/конспект урока из Perplexity для ученика ${st.name}.\n\nИИ автоматически:\n1) Выделит тему урока\n2) Очистит домашнее задание от учительских ключей\n3) Добавит новые слова в словарь ученика\n4) Напишет сообщение для родителей/ученика:`);
    if (!rawText || !rawText.trim()) return;
    const impBtn = document.getElementById('ls-btn-import-perplexity');
    if (impBtn) { impBtn.disabled = true; impBtn.textContent = '⏳ Разбираю конспект...'; }
    try {
      const parsed = await Gemini.parsePerplexityLesson(rawText, st.name);
      if (parsed.topic) document.getElementById('ls-topic').value = parsed.topic;
      if (parsed.homework) document.getElementById('ls-homework').value = parsed.homework;
      if (parsed.new_vocab) {
        const dossier = this.parseStudentDossier(st);
        const existingVocab = dossier.vocab ? `${dossier.vocab}, ${parsed.new_vocab}` : parsed.new_vocab;
        const newSchedule = this.serializeStudentDossier(dossier.schedule, dossier.interests, dossier.errors, existingVocab, dossier.notes, dossier.perplexity, dossier.unit);
        await DB.updateStudent(st.id, { schedule: newSchedule });
        st.schedule = newSchedule;
      }
      const outBox = document.getElementById('ls-ai-output-box');
      if (outBox && parsed.parent_msg) {
        outBox.classList.remove('hidden');
        outBox.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><b>📲 Готовое сообщение ученику/родителям + словарь обновлён (${this.escapeHtml(parsed.new_vocab || 'без новых слов')})</b><button type="button" class="btn btn-secondary btn-xs" style="font-size:10px;padding:2px 6px;" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText);UI.toast('Скопировано!','success')">📋 Скопировать</button></div><div>${this.escapeHtml(parsed.parent_msg)}</div>`;
      }
      UI.toast('✨ Конспект из Perplexity разобран! Тема, ДЗ и словарь обновлены.', 'success');
    } catch (e) {
      UI.toast('Ошибка разбора Perplexity: ' + e.message, 'error');
    } finally {
      if (impBtn) { impBtn.disabled = false; impBtn.textContent = '📥 Из Perplexity'; }
    }
  },

  openZenBoard(lessonId = null, fallbackStudentId = null) {
    const ls = lessonId ? this.lessons.find(l => l.id === lessonId) : null;
    const stId = ls?.student_id || fallbackStudentId || document.getElementById('ls-student')?.value;
    const st = this.students.find(s => s.id === stId) || { name: 'Ученик', grade: '' };
    const dossier = this.parseStudentDossier(st);
    const topicVal = (!document.getElementById('lesson-modal')?.classList.contains('hidden') && document.getElementById('ls-topic')?.value)
      ? document.getElementById('ls-topic').value
      : (ls?.topic || 'English Practice Session');
    const hwVal = (!document.getElementById('lesson-modal')?.classList.contains('hidden') && document.getElementById('ls-homework')?.value)
      ? document.getElementById('ls-homework').value
      : ((ls?.homework || '').split('\\n[МАТЕРИАЛЫ]:')[0].replace('[ДЗ_ПРОВЕРЕНО]', '').trim());

    let overlay = document.getElementById('student-zen-board-overlay');
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = 'student-zen-board-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:var(--bg-primary);color:var(--text-primary);display:flex;flex-direction:column;padding:28px 40px;overflow-y:auto;';
    overlay.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-light);padding-bottom:16px;margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,var(--accent),#0d9488);color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;">🇬🇧</div>
          <div>
            <div style="font-size:13px;color:var(--text-secondary);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Student Live Board • ${this.escapeHtml(st.name)} ${st.grade ? `(${this.escapeHtml(st.grade)})` : ''}</div>
            <div style="font-size:24px;font-weight:800;color:var(--text-primary);">${this.escapeHtml(topicVal)}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div id="zen-timer-display" style="font-family:monospace;font-size:20px;font-weight:800;padding:6px 14px;border-radius:12px;background:var(--bg-surface);border:1px solid var(--border-light);color:var(--accent);">00:00</div>
          <button type="button" class="btn btn-secondary" id="zen-btn-game" style="border-radius:12px;">🎮 5-Min Game</button>
          <button type="button" class="btn btn-secondary" onclick="TutoringPage.launchPerplexity('${st.id}', '${ls?.id || ''}')" style="border-radius:12px;color:#0d9488;">🔮 Perplexity</button>
          <button type="button" class="btn btn-primary" id="zen-btn-close" style="border-radius:12px;">✕ Закрыть экран</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:24px;flex:1;min-height:0;">
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div style="font-size:14px;font-weight:700;color:var(--text-secondary);display:flex;justify-content:space-between;align-items:center;">
            <span>✍️ Interactive Whiteboard (Доска урока — можно печатать вместе)</span>
            <button type="button" class="btn btn-secondary btn-xs" onclick="navigator.clipboard.writeText(document.getElementById('zen-whiteboard-area').value);UI.toast('Записи с доски скопированы!','success')">📋 Скопировать доску</button>
          </div>
          <textarea id="zen-whiteboard-area" class="form-input" style="flex:1;min-height:380px;font-size:18px;line-height:1.6;padding:20px;border-radius:16px;background:var(--bg-surface);border:1px solid var(--border-light);resize:none;" placeholder="Type examples, new words, sentences, and exercises here during screen sharing..."></textarea>
        </div>
        <div style="display:flex;flex-direction:column;gap:18px;">
          <div class="glass-panel" style="padding:18px;border-radius:16px;background:var(--bg-surface);border:1px solid var(--border-light);">
            <div style="font-size:13px;font-weight:700;color:var(--accent);text-transform:uppercase;margin-bottom:8px;">📚 Active Vocabulary Bank</div>
            <div style="font-size:15px;line-height:1.6;color:var(--text-primary);white-space:pre-wrap;">${this.escapeHtml(dossier.vocab || 'No active vocabulary saved yet.')}</div>
          </div>
          <div class="glass-panel" style="padding:18px;border-radius:16px;background:var(--bg-surface);border:1px solid var(--border-light);flex:1;">
            <div style="font-size:13px;font-weight:700;color:var(--success);text-transform:uppercase;margin-bottom:8px;">🏠 Homework / Next Steps</div>
            <div id="zen-hw-box" style="font-size:14px;line-height:1.6;color:var(--text-primary);white-space:pre-wrap;">${this.escapeHtml(hwVal || 'Homework will appear here at the end of the lesson.')}</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    let sec = 0;
    const timerInt = setInterval(() => {
      sec++;
      const m = String(Math.floor(sec / 60)).padStart(2, '0');
      const s = String(sec % 60).padStart(2, '0');
      const el = document.getElementById('zen-timer-display');
      if (el) el.textContent = `${m}:${s}`;
    }, 1000);
    document.getElementById('zen-btn-close').onclick = () => {
      clearInterval(timerInt);
      overlay.remove();
    };
    document.getElementById('zen-btn-game').onclick = async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = '⏳ Generating...';
      try {
        const gameText = await Gemini.generateTutoringAI('game_5min', { name: st.name, grade: st.grade, ...dossier }, { topic: topicVal });
        const wb = document.getElementById('zen-whiteboard-area');
        if (wb) wb.value = (wb.value ? wb.value + '\n\n' : '') + '🎮 5-MINUTE GAME:\n' + gameText;
      } catch (err) {
        UI.toast('Ошибка ИИ: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '🎮 5-Min Game';
      }
    };
  },

  escapeHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
