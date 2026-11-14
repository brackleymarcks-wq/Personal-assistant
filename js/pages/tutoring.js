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
          <div class="page-actions" style="display:flex;gap:12px;align-items:center;">
            <button class="btn btn-secondary" id="payment-history-btn" onclick="TutoringPage.openPaymentHistoryModal()" style="display:flex;align-items:center;gap:6px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.05);color:var(--success);border-color:rgba(16,185,129,0.3);background:rgba(16,185,129,0.06);font-weight:600;" title="Посмотреть полную историю оплат по всем ученикам и урокам">
              <i data-lucide="receipt" style="width:16px;height:16px;"></i>
              История оплат
            </button>
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
          <div style="display:grid;grid-template-columns:minmax(0, 1fr) minmax(0, 1fr);gap:var(--space-xl);align-items:start;min-width:0;">
            
            <!-- Left Column: Students -->
            <div style="display:flex;flex-direction:column;gap:var(--space-md);min-width:0;overflow:hidden;">
              <h3 style="font-size:16px;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
                <i data-lucide="users" style="color:var(--accent);width:18px;height:18px;"></i> Мои ученики
              </h3>
              <div id="students-list-container" style="display:flex;flex-direction:column;gap:var(--space-md);"></div>
            </div>

            <!-- Right Column: Lessons -->
            <div style="display:flex;flex-direction:column;gap:var(--space-xl);min-width:0;overflow:hidden;">
              
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
                <label class="form-label">📱 Telegram ученика (@username или привязка к ТГ-боту для авто-напоминаний ДЗ)</label>
                <div style="display:flex;gap:8px;margin-bottom:10px;align-items:center;">
                  <input id="st-tg-user" type="text" class="form-input" placeholder="Например: @sonya_eng" style="flex:1;" />
                  <input id="st-tg-id" type="hidden" />
                  <button type="button" id="st-btn-copy-tg-link" class="btn btn-secondary btn-xs" style="padding:8px 10px;white-space:nowrap;" title="Скопировать персональную ссылку, чтобы ученик нажал Start в боте и получал авто-напоминания о ДЗ">🔗 Ссылка для бота</button>
                </div>
                <label class="form-label">👨‍👩‍👧 Telegram родителя (@username или привязка к ТГ-боту для авто-отчётов по урокам)</label>
                <div style="display:flex;gap:8px;margin-bottom:10px;align-items:center;">
                  <input id="st-parent-tg-user" type="text" class="form-input" placeholder="Например: @mama_soni" style="flex:1;" />
                  <input id="st-parent-tg-id" type="hidden" />
                  <button type="button" id="st-btn-copy-parent-link" class="btn btn-secondary btn-xs" style="padding:8px 10px;white-space:nowrap;color:#8b5cf6;border-color:rgba(139,92,246,0.35);" title="Скопировать персональную ссылку для родителя, чтобы ему приходили отчёты после уроков">👨‍👩‍👧 Ссылка родителю</button>
                </div>
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
            <div class="modal-body" style="padding-top:10px;">
              <!-- Sticky Header: Student, Date, Topic -->
              <div class="form-row" style="margin-bottom:8px;">
                <div class="form-group" style="margin-bottom:8px;">
                  <label class="form-label" style="margin-bottom:2px;">Ученик *</label>
                  <select id="ls-student" class="form-input"></select>
                </div>
                <div class="form-group" style="margin-bottom:8px;">
                  <label class="form-label" style="margin-bottom:2px;">Дата и время *</label>
                  <input id="ls-date" type="datetime-local" class="form-input" />
                </div>
              </div>

              <div class="form-group" style="margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
                  <label class="form-label" style="margin-bottom:0;">Тема урока *</label>
                  <button type="button" id="ls-btn-detect-topic" class="btn btn-secondary btn-xs" style="display:none;font-size:11px;padding:2px 8px;gap:4px;color:var(--accent);" title="Определить тему автоматически по прикреплённой презентации">
                    🪄 Тема из презентации
                  </button>
                </div>
                <input id="ls-topic" type="text" class="form-input" placeholder="Например: Unit 3 Shopping или Detective Owner: Possessive 's" />
              </div>

              <!-- Two-tab clean navigation -->
              <div style="display:flex;border-bottom:1px solid var(--border-light);margin-bottom:14px;background:var(--bg-primary);border-radius:8px;padding:3px;">
                <button type="button" id="tab-btn-prep" onclick="TutoringPage.switchLessonTab('prep')" style="flex:1;padding:8px 12px;border:none;background:transparent;border-radius:6px;font-weight:600;font-size:12px;cursor:pointer;color:var(--accent);border-bottom:2px solid var(--accent);display:flex;align-items:center;justify-content:center;gap:6px;">
                  <span>📚 1. Подготовка к уроку</span>
                </button>
                <button type="button" id="tab-btn-post" onclick="TutoringPage.switchLessonTab('post')" style="flex:1;padding:8px 12px;border:none;background:transparent;border-radius:6px;font-weight:600;font-size:12px;cursor:pointer;color:var(--text-muted);border-bottom:none;display:flex;align-items:center;justify-content:center;gap:6px;">
                  <span>🎙️ 2. Итоги урока, ДЗ и Отправка</span>
                </button>
              </div>

              <!-- TAB 1: PREPARATION BEFORE LESSON (Perplexity Scenario & Presentation) -->
              <div id="lesson-sec-prep">
                <div id="ls-memory-banner" style="margin-bottom:12px;"></div>

                <!-- 1. Perplexity Scenario & Lesson Plan -->
                <div style="margin-bottom:12px;padding:12px;border-radius:10px;background:var(--bg-primary);border:1px solid var(--border-light);">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <label class="form-label" style="margin-bottom:0;font-weight:700;display:flex;align-items:center;gap:6px;font-size:13px;">
                      <i data-lucide="sparkles" style="width:15px;height:15px;color:#0d9488;"></i>
                      <span>Сценарий и план урока (из Perplexity)</span>
                    </label>
                    <div style="display:flex;gap:6px;">
                      <button type="button" id="ls-btn-perplexity" class="btn btn-primary btn-xs" style="font-size:11px;background:linear-gradient(135deg,#0d9488,#0284c7);border:none;color:#fff;" title="Открыть Perplexity Space с промптом по ученику">🔮 В Perplexity Space</button>
                      <button type="button" id="ls-btn-pplx-fill" class="btn btn-secondary btn-xs" style="font-size:11px;color:#0d9488;" title="Вставить текст конспекта">📥 Вставить конспект</button>
                    </div>
                  </div>
                  <textarea id="ls-scenario" class="form-input" rows="5" style="font-size:12px;font-family:inherit;line-height:1.5;" placeholder="Вставьте сюда сценарий / конспект урока из Perplexity (Warm-up, план объяснения, упражнения, правила, примеры)..."></textarea>
                </div>

                <!-- 2. Lesson Presentation (Google Slides / Gamma / PPTX / PDF) -->
                <div style="margin-bottom:12px;padding:12px;border-radius:10px;background:var(--bg-primary);border:1px solid var(--border-light);">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <label class="form-label" style="margin-bottom:0;font-weight:700;display:flex;align-items:center;gap:6px;font-size:13px;">
                      <i data-lucide="presentation" style="width:15px;height:15px;color:#0284c7;"></i>
                      <span>Презентация к уроку (Google Презентации / Gamma / PPTX)</span>
                    </label>
                    <button type="button" id="ls-btn-open-presentation-link" class="btn btn-secondary btn-xs" style="font-size:11px;color:#0284c7;border-color:rgba(2,132,199,0.35);display:flex;align-items:center;gap:4px;" title="Открыть презентацию в новой вкладке">
                      ▶️ Открыть ссылку
                    </button>
                  </div>
                  <input id="ls-materials" type="text" class="form-input" placeholder="Ссылка на презентацию в Gamma / Google Презентациях / Canva / YouTube (https://...)" />
                  <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:8px;">
                    <input type="file" id="ls-presentation-file" accept=".pdf,.pptx,.ppt,image/*" style="display:none;" />
                    <button type="button" id="ls-btn-upload-pres" class="btn btn-secondary btn-xs" style="font-size:11px;display:inline-flex;align-items:center;gap:4px;">
                      <i data-lucide="file" style="width:12px;height:12px;"></i> 📎 Прикрепить файл презентации (.pptx / .pdf)
                    </button>
                    <div id="ls-pres-badge" style="display:none;align-items:center;flex-wrap:wrap;gap:6px;padding:3px 10px;background:rgba(13,148,136,0.12);border:1px solid rgba(13,148,136,0.3);border-radius:6px;font-size:11px;color:#0d9488;">
                      <span id="ls-pres-name" style="font-weight:600;">Презентация.pdf</span>
                      <span id="ls-pres-status" style="display:inline-flex;align-items:center;padding:1px 6px;border-radius:4px;background:rgba(16,185,129,0.15);color:#059669;font-weight:600;font-size:10px;">✅ Прочитано</span>
                      <button type="button" id="ls-pres-preview-btn" style="border:none;background:rgba(2,132,199,0.12);color:#0284c7;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:10px;font-weight:600;">👁️ Что прочитано</button>
                      <a id="ls-pres-link" href="#" target="_blank" style="color:var(--accent);text-decoration:underline;">Скачать</a>
                      <button type="button" id="ls-pres-remove" title="Удалить привязку" style="border:none;background:none;color:var(--danger);cursor:pointer;font-weight:700;margin-left:4px;">✕</button>
                    </div>
                  </div>
                </div>

                <!-- Lesson Launch Actions -->
                <div style="display:flex;gap:8px;margin-top:10px;">
                  <button type="button" id="ls-btn-announce-tg" class="btn btn-secondary btn-sm" style="flex:1;font-size:12px;color:#f59e0b;border-color:rgba(245,158,11,0.4);background:rgba(245,158,11,0.06);display:flex;align-items:center;justify-content:center;gap:6px;">
                    📢 Анонс урока в ТГ (ученику и маме)
                  </button>
                  <button type="button" id="ls-btn-zen-board" class="btn btn-secondary btn-sm" style="font-size:12px;display:flex;align-items:center;gap:4px;" title="Экран для Zoom">
                    🖥 Экран ученика
                  </button>
                </div>
              </div>

              <!-- TAB 2: POST-LESSON (Debrief, Homework Cards, HW Text & Telegram) -->
              <div id="lesson-sec-post" style="display:none;">
                <!-- 1. Debrief section -->
                <div style="margin-bottom:12px;padding:12px;border-radius:10px;background:linear-gradient(145deg, rgba(13,148,136,0.08), rgba(99,102,241,0.08));border:1px solid rgba(13,148,136,0.3);">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <label class="form-label" style="margin-bottom:0;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:6px;">
                      <i data-lucide="mic" style="width:14px;height:14px;color:#0d9488;"></i>
                      <span>Итоги урока (Дебрифинг преподавателя)</span>
                    </label>
                    <div style="display:flex;gap:6px;">
                      <button type="button" id="ls-btn-voice-rec" class="btn btn-secondary btn-xs" style="font-size:11px;display:flex;align-items:center;gap:4px;" title="Надиктовать голосом итоги урока">
                        <i data-lucide="mic" style="width:12px;height:12px;"></i> <span id="ls-voice-rec-text">Надиктовать</span>
                      </button>
                      <button type="button" id="ls-btn-process-debrief" class="btn btn-primary btn-xs" style="font-size:11px;background:#0d9488;border-color:#0d9488;color:#fff;" title="Разобрать ИИ: обновить ошибки, словарь и отчёт">
                        ✨ Разобрать в отчёт и ошибки
                      </button>
                    </div>
                  </div>
                  <textarea id="ls-debrief-notes" class="form-input" rows="2" style="font-size:12px;" placeholder="Надиктуйте или запишите своими словами: что прошли, что получилось, где ошибся (например: путал was/were, забывал -s), какие новые слова взяли..."></textarea>
                </div>

                <!-- 2. Homework Cards & Materials (PNG / PDF) -->
                <div style="margin-bottom:12px;padding:12px;border-radius:10px;background:var(--bg-primary);border:1px solid var(--border-light);">
                  <div style="margin-bottom:8px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                      <label class="form-label" style="margin-bottom:0;display:flex;align-items:center;gap:6px;font-weight:700;font-size:13px;">
                        <i data-lucide="image" style="width:15px;height:15px;color:var(--accent);"></i>
                        <span>Карточки к домашнему заданию (PNG / PDF)</span>
                      </label>
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;">
                      <button type="button" id="ls-btn-add-card-file" class="btn btn-primary btn-xs" style="background:#0284c7;border-color:#0284c7;color:#fff;font-size:11px;padding:6px 10px;font-weight:600;display:flex;align-items:center;gap:5px;" title="Выбрать файл с диска (PNG, JPG, PDF)">
                        📁 Выбрать файл с диска
                      </button>
                      <button type="button" id="ls-btn-gen-cards" class="btn btn-secondary btn-xs" style="font-size:11px;padding:6px 10px;color:#0d9488;border-color:rgba(13,148,136,0.35);display:flex;align-items:center;gap:4px;" title="Сгенерировать PNG-карточки слов">
                        🎨 Создать карточки
                      </button>
                    </div>
                  </div>
                  <input type="file" id="ls-card-file-input" accept="image/*,.pdf" multiple style="display:none;" />
                  <input type="file" id="ls-vision-file-input" accept="image/*,.pdf" style="display:none;" />
                  <div id="ls-cards-dropzone" style="border:2px dashed var(--border-light);border-radius:8px;padding:12px;text-align:center;cursor:pointer;background:var(--bg-secondary);transition:border-color 0.2s;" title="Перетащите сюда PNG карточек ДЗ или нажмите Ctrl+V для вставки из буфера">
                    <div style="font-size:12px;color:var(--text-secondary);display:flex;align-items:center;justify-content:center;gap:6px;">
                      <i data-lucide="upload-cloud" style="width:16px;height:16px;color:var(--accent);"></i>
                      <span>Перетащите карточки ДЗ сюда, выберите файл или вставьте из буфера (<b>Ctrl+V</b>)</span>
                    </div>
                    <div id="ls-cards-preview" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;"></div>
                  </div>
                </div>

                <!-- 2.5. Live Telegram HW Completion & Photo Feedback Banner -->
                <div id="ls-bot-hw-telemetry-box" class="hidden" style="margin-bottom:12px;padding:10px 12px;border-radius:10px;background:rgba(59,130,246,0.07);border:1px solid rgba(59,130,246,0.25);font-size:12px;line-height:1.45;"></div>

                <!-- 3. Homework Text section -->
                <div style="margin-bottom:12px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <label class="form-label" style="margin-bottom:0;font-weight:700;">Домашнее задание (10–15 минут + 📸 фото тетради)</label>
                    <button id="ls-generate-ai" class="btn btn-ghost" style="font-size:12px;color:var(--accent);display:flex;align-items:center;gap:4px;padding:2px 8px;min-height:auto;">
                      <i data-lucide="sparkles" style="width:12px;height:12px;"></i> Сгенерировать ИИ
                    </button>
                  </div>
                  <textarea id="ls-homework" class="form-input" rows="4" style="font-size:12px;" placeholder="Текст домашнего задания для ученика..."></textarea>
                  
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                    <button type="button" id="ls-btn-preview-tg" class="btn btn-secondary btn-xs" style="font-size:11px;display:flex;align-items:center;gap:4px;">
                      <i data-lucide="smartphone" style="width:12px;height:12px;color:#3b82f6;"></i>
                      <span id="ls-preview-toggle-text">📱 Предпросмотр в Telegram</span>
                    </button>
                    <span style="font-size:11px;color:var(--text-muted);">👀 Копия ДЗ придёт вам в личку @theverysamesunday</span>
                  </div>
                  <div id="ls-tg-preview-box" class="hidden" style="margin-top:8px;"></div>
                </div>

                <!-- Actions: Send HW & Send Parent Report -->
                <div style="display:flex;gap:8px;margin-bottom:12px;">
                  <button type="button" id="ls-btn-send-tg" class="btn btn-primary btn-sm" style="flex:1;background:#2563eb;border-color:#2563eb;color:#fff;font-size:12px;display:flex;align-items:center;justify-content:center;gap:6px;">
                    📨 Отправить ДЗ ученику в ТГ
                  </button>
                  <button type="button" id="ls-btn-send-parent-tg" class="btn btn-secondary btn-sm" style="flex:1;color:#8b5cf6;border-color:rgba(139,92,246,0.35);font-size:12px;display:flex;align-items:center;justify-content:center;gap:6px;">
                    👨‍👩‍👧 Отчёт родителю в ТГ
                  </button>
                </div>

                <!-- Fast lesson tools -->
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
                  <button type="button" id="ls-ai-warmup" class="btn btn-secondary btn-xs" style="font-size:11px;padding:4px 8px;">🎲 Разминка (5м)</button>
                  <button type="button" id="ls-ai-blitz" class="btn btn-secondary btn-xs" style="font-size:11px;padding:4px 8px;">🔍 Блиц-проверка ДЗ</button>
                  <button type="button" id="ls-ai-parent" class="btn btn-secondary btn-xs" style="font-size:11px;padding:4px 8px;">📲 Текст родителям</button>
                  <button type="button" id="ls-ai-game" class="btn btn-secondary btn-xs" style="font-size:11px;padding:4px 8px;color:var(--accent);">🎮 Игра на 5 минут</button>
                </div>
                <div id="ls-ai-output-box" class="hidden" style="margin-top:8px;padding:10px 12px;background:var(--bg-primary);border:1px solid var(--accent-alpha);border-radius:10px;font-size:12px;white-space:pre-wrap;max-height:200px;overflow-y:auto;"></div>
              </div>

              <!-- Lesson Status & Payment -->
              <div class="form-row" style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border-light);">
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="margin-bottom:2px;">Статус урока</label>
                  <select id="ls-status" class="form-input">
                    <option value="Запланирован">Запланирован</option>
                    <option value="Проведен">Проведен</option>
                    <option value="Отменен">Отменен</option>
                  </select>
                </div>
                <div class="form-group" style="display:flex;align-items:center;padding-top:20px;margin-bottom:0;">
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


        <!-- Homework & Materials Dispatcher Modal -->
        <div id="hw-dispatcher-modal" class="modal-overlay hidden">
          <div class="modal" style="max-width: 740px; width: 95%; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
              <h2 class="modal-title" id="hw-disp-title"><i data-lucide="send"></i> Отправка ДЗ и материалов в Telegram</h2>
              <button class="modal-close" id="hw-disp-close"><i data-lucide="x"></i></button>
            </div>
            <div class="modal-body">
              <div id="hw-disp-status" style="margin-bottom:12px; font-size:12px; padding:8px 12px; border-radius:8px;"></div>
              
              <div class="form-group">
                <label class="form-label">Тема урока</label>
                <input id="hw-disp-topic" type="text" class="form-input" placeholder="Например: Past Simple" />
              </div>

              <div class="form-group">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                  <label class="form-label" style="margin-bottom:0;">📌 Домашнее задание для ученика (текст)</label>
                  <button type="button" id="hw-disp-btn-ai-hw" class="btn btn-ghost" style="font-size:11px;color:var(--accent);display:flex;align-items:center;gap:4px;padding:2px 6px;"><i data-lucide="sparkles" style="width:12px;height:12px;"></i> Сгенерировать ИИ</button>
                </div>
                <textarea id="hw-disp-text" class="form-input" rows="3" placeholder="Что задано ученику? (Например: выучить слова из карточек, сделать упр. 3 на стр. 14)"></textarea>
              </div>

              <div class="form-group">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                  <label class="form-label" style="margin-bottom:0;display:flex;align-items:center;gap:6px;">
                    <i data-lucide="image" style="width:14px;height:14px;color:var(--accent);"></i>
                    <span>Прикрепленные карточки / картинки ДЗ (PNG / JPG)</span>
                  </label>
                  <div style="display:flex;gap:6px;">
                    <button type="button" id="hw-disp-btn-gen-cards" class="btn btn-secondary btn-xs" style="font-size:11px;color:#0d9488;border-color:rgba(13,148,136,0.35);">🎨 Создать карточки (PNG)</button>
                    <button type="button" id="hw-disp-btn-add-file" class="btn btn-secondary btn-xs" style="font-size:11px;">📎 Загрузить PNG</button>
                  </div>
                </div>
                <input type="file" id="hw-disp-file-input" accept="image/*" multiple style="display:none;" />
                <div id="hw-disp-dropzone" style="border:2px dashed var(--border-light);border-radius:10px;padding:12px;text-align:center;cursor:pointer;background:var(--bg-primary);" title="Перетащите сюда PNG или нажмите Ctrl+V для вставки">
                  <div style="font-size:12px;color:var(--text-secondary);display:flex;align-items:center;justify-content:center;gap:6px;">
                    <i data-lucide="upload-cloud" style="width:16px;height:16px;color:var(--accent);"></i>
                    <span>Перетащите PNG сюда, нажмите для выбора или вставьте скриншот из буфера (<b>Ctrl+V</b>)</span>
                  </div>
                  <div id="hw-disp-cards-preview" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;"></div>
                </div>
              </div>

              <div class="form-group" style="margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                  <label class="form-label" style="margin-bottom:0;display:flex;align-items:center;gap:6px;">
                    <i data-lucide="file-text" style="width:14px;height:14px;color:#0d9488;"></i>
                    <span>Сценарий и материалы урока (Конспект / Vocabulary / Правила)</span>
                  </label>
                  <button type="button" id="hw-disp-btn-import-pplx" class="btn btn-secondary btn-xs" style="font-size:11px;color:#0d9488;border-color:rgba(13,148,136,0.35);">📥 Из Perplexity</button>
                </div>
                <textarea id="hw-disp-scenario" class="form-input" rows="3" style="font-size:12px;" placeholder="Вставьте сюда конспект или материалы урока из Perplexity (слова, правила, глаголы, примеры). Бот запомнит этот сценарий и по запросу ученика (кнопки «5 слов», «5 глаголов», «Тестик») будет подкидывать именно эти материалы!"></textarea>
              </div>

              <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--bg-primary);border-radius:10px;border:1px solid var(--border-light);margin-bottom:12px;">
                <input id="hw-disp-send-parent" type="checkbox" style="cursor:pointer;" />
                <label for="hw-disp-send-parent" style="font-size:12px;color:var(--text-primary);cursor:pointer;margin:0;">
                  👨‍👩‍👧 Также отправить это домашнее задание и карточки родителю в Telegram
                </label>
              </div>

              <!-- Live Telegram Message Preview for Student -->
              <div class="form-group" style="margin-top:14px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                  <label class="form-label" style="margin-bottom:0;display:flex;align-items:center;gap:6px;font-weight:700;color:var(--text-primary);">
                    <i data-lucide="smartphone" style="width:14px;height:14px;color:#3b82f6;"></i>
                    <span>📱 Предпросмотр сообщения ученику в Telegram (точно так это увидит ученик)</span>
                  </label>
                  <span style="font-size:11px;color:var(--text-muted);">Обновляется на лету</span>
                </div>
                <div id="hw-disp-live-preview"></div>
              </div>

              <!-- Live Telegram Report Preview for Parent (if checkbox checked) -->
              <div id="hw-disp-parent-preview-section" class="form-group hidden" style="margin-top:12px;">
                <label class="form-label" style="margin-bottom:6px;display:flex;align-items:center;gap:6px;font-weight:700;color:#8b5cf6;">
                  <i data-lucide="users" style="width:14px;height:14px;color:#8b5cf6;"></i>
                  <span>👨‍👩‍👧 Предпросмотр отчёта родителю в Telegram</span>
                </label>
                <div id="hw-disp-parent-live-preview"></div>
              </div>
            </div>
            <div class="modal-footer" style="display:flex; gap:8px; justify-content:flex-end;">
              <button type="button" class="btn btn-secondary" id="hw-disp-btn-cancel">Отмена</button>
              <button type="button" class="btn btn-primary" id="hw-disp-btn-send" style="background:#3b82f6; border-color:#3b82f6; display:flex; align-items:center; gap:6px;">
                <i data-lucide="send" style="width:14px;height:14px;"></i> Отправить ученику в Telegram
              </button>
            </div>
          </div>
        </div>

        <!-- Report Preview & Action Modal -->
        <div id="report-modal" class="modal-overlay hidden">
          <div class="modal" style="max-width: 740px; width: 95%; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
              <h2 class="modal-title" id="report-modal-title"><i data-lucide="bar-chart-2"></i> Отчёт для родителей</h2>
              <button class="modal-close" id="report-modal-close"><i data-lucide="x"></i></button>
            </div>
            <div class="modal-body">
              <div id="report-modal-status" style="margin-bottom:12px; font-size:13px; padding:10px 12px; border-radius:8px;"></div>
              
              <div class="form-group">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                  <label class="form-label" style="margin-bottom:0;">Текст отчёта (можно отредактировать перед отправкой):</label>
                  <button type="button" id="report-modal-btn-ai" class="btn btn-ghost" style="font-size:11px;color:var(--accent);display:flex;align-items:center;gap:4px;padding:2px 6px;">
                    <i data-lucide="sparkles" style="width:12px;height:12px;"></i> Сгенерировать ИИ
                  </button>
                </div>
                <textarea id="report-modal-text" class="form-input" style="height:140px; font-size:13px; line-height:1.5; font-family:inherit; resize:vertical;"></textarea>
              </div>

              <!-- Live Telegram Message Preview for Parent -->
              <div class="form-group" style="margin-top:14px;">
                <label class="form-label" style="margin-bottom:6px;display:flex;align-items:center;gap:6px;font-weight:700;color:#8b5cf6;">
                  <i data-lucide="smartphone" style="width:14px;height:14px;color:#8b5cf6;"></i>
                  <span>📱 Предпросмотр отчёта родителю в Telegram (точно так это увидит родитель)</span>
                </label>
                <div id="report-modal-live-preview"></div>
              </div>
            </div>
            <div class="modal-footer" style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
              <button type="button" class="btn btn-secondary btn-sm" id="report-modal-copy"><i data-lucide="copy" style="width:14px;height:14px;"></i> Скопировать</button>
              <button type="button" class="btn btn-secondary btn-sm" id="report-modal-send-me"><i data-lucide="send" style="width:14px;height:14px;"></i> Отправить мне в ТГ</button>
              <button type="button" class="btn btn-primary btn-sm" id="report-modal-send-parent" style="background:#8b5cf6; border-color:#8b5cf6;"><i data-lucide="send" style="width:14px;height:14px;"></i> Отправить родителю в ТГ</button>
            </div>
          </div>
        </div>

        <!-- Lesson Announcement Modal -->
        <div id="announcement-modal" class="modal-overlay hidden">
          <div class="modal" style="max-width: 740px; width: 95%; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
              <h2 class="modal-title" id="announcement-modal-title"><i data-lucide="megaphone" style="color:#f59e0b;"></i> 📢 Анонс урока в Telegram</h2>
              <button class="modal-close" id="announcement-modal-close"><i data-lucide="x"></i></button>
            </div>
            <div class="modal-body">
              <div id="announcement-modal-status" style="margin-bottom:12px; font-size:13px; padding:10px 12px; border-radius:8px; background:var(--bg-surface); border:1px solid var(--border-light);"></div>
              
              <div class="form-group">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                  <label class="form-label" style="margin-bottom:0;font-weight:700;color:#3b82f6;display:flex;align-items:center;gap:6px;">
                    <i data-lucide="user" style="width:14px;height:14px;"></i>
                    <span>Анонс для УЧЕНИКА (в Telegram):</span>
                  </label>
                  <label style="font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;">
                    <input type="checkbox" id="announcement-send-student-check" checked />
                    <span style="font-weight:600;">Отправить ученику</span>
                  </label>
                </div>
                <textarea id="announcement-student-text" class="form-input" style="height:115px; font-size:13px; line-height:1.5; font-family:inherit; resize:vertical;" placeholder="Текст анонса для ученика..."></textarea>
              </div>

              <div class="form-group" style="margin-top:14px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                  <label class="form-label" style="margin-bottom:0;font-weight:700;color:#8b5cf6;display:flex;align-items:center;gap:6px;">
                    <i data-lucide="users" style="width:14px;height:14px;"></i>
                    <span>Анонс для РОДИТЕЛЯ (в Telegram):</span>
                  </label>
                  <label style="font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;">
                    <input type="checkbox" id="announcement-send-parent-check" checked />
                    <span style="font-weight:600;">Отправить родителю</span>
                  </label>
                </div>
                <textarea id="announcement-parent-text" class="form-input" style="height:115px; font-size:13px; line-height:1.5; font-family:inherit; resize:vertical;" placeholder="Текст анонса для родителя..."></textarea>
              </div>
            </div>
            <div class="modal-footer" style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
              <button type="button" class="btn btn-secondary btn-sm" id="announcement-modal-cancel">Отмена</button>
              <button type="button" class="btn btn-primary btn-sm" id="announcement-modal-send" style="background:linear-gradient(135deg,#f59e0b,#d97706); border-color:#d97706; display:flex; align-items:center; gap:6px;">
                <i data-lucide="send" style="width:14px;height:14px;"></i> Отправить анонс в Telegram
              </button>
            </div>
          </div>
        </div>

        <!-- Payment History Modal -->
        <div id="payment-history-modal" class="modal-overlay hidden">
          <div class="modal" style="max-width:760px; max-height:88vh; display:flex; flex-direction:column; padding:0; border-radius:20px; overflow:hidden;">
            <div class="modal-header" style="padding:16px 20px; border-bottom:1px solid var(--border-light); display:flex; align-items:center; justify-content:space-between; background:var(--bg-surface);">
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:36px; height:36px; border-radius:10px; background:rgba(16,185,129,0.12); color:var(--success); display:flex; align-items:center; justify-content:center;">
                  <i data-lucide="receipt" style="width:20px; height:20px;"></i>
                </div>
                <div>
                  <h2 class="modal-title" id="payment-modal-title" style="margin:0; font-size:17px; font-weight:700;">История оплат репетиторства</h2>
                  <div id="payment-modal-subtitle" style="font-size:12px; color:var(--text-secondary); margin-top:1px;">Учёт оплат, проведённых уроков и долгов</div>
                </div>
              </div>
              <button class="modal-close" id="payment-modal-close" onclick="document.getElementById('payment-history-modal').classList.add('hidden')"><i data-lucide="x"></i></button>
            </div>

            <!-- Filters Bar -->
            <div style="padding:12px 20px; background:var(--bg-primary); border-bottom:1px solid var(--border-light); display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between;">
              <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <label style="font-size:12px; font-weight:600; color:var(--text-muted);">Ученик:</label>
                  <select id="pay-filter-student" class="form-input" style="padding:4px 8px; font-size:12px; height:32px; border-radius:8px;" onchange="TutoringPage.updatePaymentHistoryView()"></select>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <label style="font-size:12px; font-weight:600; color:var(--text-muted);">Статус:</label>
                  <select id="pay-filter-status" class="form-input" style="padding:4px 8px; font-size:12px; height:32px; border-radius:8px;" onchange="TutoringPage.updatePaymentHistoryView()">
                    <option value="all">Все статусы</option>
                    <option value="paid">🟢 Только оплаченные</option>
                    <option value="unpaid">🔴 Только неоплаченные (долги)</option>
                  </select>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <label style="font-size:12px; font-weight:600; color:var(--text-muted);">Месяц:</label>
                  <select id="pay-filter-month" class="form-input" style="padding:4px 8px; font-size:12px; height:32px; border-radius:8px;" onchange="TutoringPage.updatePaymentHistoryView()"></select>
                </div>
              </div>
              <div id="pay-bulk-actions"></div>
            </div>

            <!-- Summary KPI Badges -->
            <div id="pay-summary-kpis" style="padding:14px 20px; display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:10px; background:var(--bg-surface); border-bottom:1px solid var(--border-light);"></div>

            <!-- Lessons / Payments List -->
            <div id="pay-lessons-list" style="padding:16px 20px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:8px;"></div>
          </div>
        </div>

      </div>
    `;
  },


  getLessonPrice(ls, st = null) {
    const m = (ls?.homework || '').match(/\[ЦЕНА_УРОКА:(\d+(?:\.\d+)?)\]/);
    if (m) return Number(m[1]) || 0;
    const targetSt = st || this.students.find(s => s.id === ls?.student_id);
    return targetSt ? (Number(targetSt.price) || 0) : 0;
  },

  openPaymentHistoryModal(studentId = null, filterStatus = 'all', filterMonth = null) {
    const modal = document.getElementById('payment-history-modal');
    if (!modal) return;

    // Populate student filter dropdown
    const stSelect = document.getElementById('pay-filter-student');
    if (stSelect) {
      stSelect.innerHTML = '<option value="all">Все ученики</option>' + 
        this.students.map(s => `<option value="${s.id}">${this.escapeHtml(s.name)} (${s.price} BYN)</option>`).join('');
      if (studentId) stSelect.value = studentId;
      else stSelect.value = 'all';
    }

    // Status filter
    const statusSelect = document.getElementById('pay-filter-status');
    if (statusSelect) {
      statusSelect.value = filterStatus || 'all';
    }

    // Populate month filter dropdown based on actual conducted lessons
    const monthSelect = document.getElementById('pay-filter-month');
    if (monthSelect) {
      const monthsSet = new Set();
      this.lessons.forEach(l => {
        if (l.date && l.status === 'Проведен') {
          const d = new Date(l.date);
          const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
          monthsSet.add(key);
        }
      });
      const sortedMonths = Array.from(monthsSet).sort().reverse();
      monthSelect.innerHTML = '<option value="all">За всё время</option>' + sortedMonths.map(m => {
        const [y, mo] = m.split('-');
        const d = new Date(Number(y), Number(mo) - 1, 1);
        const label = d.toLocaleString('ru', { month: 'long', year: 'numeric' });
        return `<option value="${m}">${label.charAt(0).toUpperCase() + label.slice(1)}</option>`;
      }).join('');
      if (filterMonth && (filterMonth === 'all' || monthSelect.querySelector(`option[value="${filterMonth}"]`))) {
        monthSelect.value = filterMonth;
      } else {
        monthSelect.value = filterMonth || 'all';
      }
    }

    modal.classList.remove('hidden');
    this.updatePaymentHistoryView();
  },

  updatePaymentHistoryView() {
    const studentFilter = document.getElementById('pay-filter-student')?.value || 'all';
    const statusFilter = document.getElementById('pay-filter-status')?.value || 'all';
    const monthFilter = document.getElementById('pay-filter-month')?.value || 'all';

    const titleEl = document.getElementById('payment-modal-title');
    const subtitleEl = document.getElementById('payment-modal-subtitle');
    if (studentFilter !== 'all') {
      const st = this.students.find(s => s.id === studentFilter);
      if (titleEl && st) titleEl.textContent = `История оплат: ${st.name}`;
      if (subtitleEl && st) subtitleEl.textContent = `Ставка: ${st.price} BYN за урок • ${st.grade || 'ученик'}`;
    } else {
      if (titleEl) titleEl.textContent = 'История оплат репетиторства';
      if (subtitleEl) subtitleEl.textContent = 'Учёт оплат, проведённых уроков и задолженностей';
    }

    // Filter conducted lessons
    let filtered = this.lessons.filter(l => l.status === 'Проведен');
    if (studentFilter !== 'all') {
      filtered = filtered.filter(l => l.student_id === studentFilter);
    }
    if (statusFilter === 'paid') {
      filtered = filtered.filter(l => l.paid);
    } else if (statusFilter === 'unpaid') {
      filtered = filtered.filter(l => !l.paid);
    }
    if (monthFilter !== 'all') {
      filtered = filtered.filter(l => {
        const d = new Date(l.date);
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        return key === monthFilter;
      });
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate metrics for the selected filter
    let totalPaidAmount = 0;
    let totalPaidCount = 0;
    let totalUnpaidAmount = 0;
    let totalUnpaidCount = 0;

    filtered.forEach(l => {
      const st = this.students.find(s => s.id === l.student_id);
      const price = this.getLessonPrice(l, st);
      if (l.paid) {
        totalPaidAmount += price;
        totalPaidCount++;
      } else {
        totalUnpaidAmount += price;
        totalUnpaidCount++;
      }
    });

    // Calculate all-time unpaid debt for the selected student / all students
    let allTimeUnpaidAmount = 0;
    let allTimeUnpaidCount = 0;
    this.lessons.forEach(l => {
      if (l.status === 'Проведен' && !l.paid) {
        if (studentFilter === 'all' || l.student_id === studentFilter) {
          const st = this.students.find(s => s.id === l.student_id);
          allTimeUnpaidAmount += this.getLessonPrice(l, st);
          allTimeUnpaidCount++;
        }
      }
    });

    const isMonthFiltered = monthFilter !== 'all';
    const periodLabel = isMonthFiltered ? 'ЗА ПЕРИОД' : 'ЗА ВСЁ ВРЕМЯ';

    // Render KPIs
    const kpiContainer = document.getElementById('pay-summary-kpis');
    if (kpiContainer) {
      kpiContainer.innerHTML = `
        <div style="padding:10px 14px; border-radius:12px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2);">
          <div style="font-size:11px; color:var(--text-muted); font-weight:600;">🟢 ОПЛАЧЕНО ${periodLabel}</div>
          <div style="font-size:18px; font-weight:800; color:var(--success); margin-top:2px;">${totalPaidAmount} BYN <span style="font-size:11px; color:var(--text-muted); font-weight:500;">(${totalPaidCount} ур.)</span></div>
        </div>
        <div style="padding:10px 14px; border-radius:12px; background:${totalUnpaidCount > 0 ? 'rgba(239,68,68,0.08)' : 'var(--bg-primary)'}; border:1px solid ${totalUnpaidCount > 0 ? 'rgba(239,68,68,0.25)' : 'var(--border-light)'};">
          <div style="font-size:11px; color:${totalUnpaidCount > 0 ? 'var(--danger)' : 'var(--text-muted)'}; font-weight:600;">🔴 ЖДЁТ ОПЛАТЫ ${periodLabel}</div>
          <div style="font-size:18px; font-weight:800; color:${totalUnpaidCount > 0 ? 'var(--danger)' : 'var(--text-primary)'}; margin-top:2px;">${totalUnpaidAmount} BYN <span style="font-size:11px; color:var(--text-muted); font-weight:500;">(${totalUnpaidCount} ур.)</span></div>
        </div>
        <div style="padding:10px 14px; border-radius:12px; background:var(--bg-primary); border:1px solid var(--border-light);">
          <div style="font-size:11px; color:var(--text-muted); font-weight:600;">📚 ПРОВЕДЕНО ${periodLabel}</div>
          <div style="font-size:18px; font-weight:800; color:var(--text-primary); margin-top:2px;">${this.pluralizeLessons(filtered.length)}</div>
        </div>
        ${isMonthFiltered && allTimeUnpaidAmount > totalUnpaidAmount ? `
          <div style="grid-column:1 / -1; padding:8px 14px; border-radius:10px; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); font-size:12px; display:flex; align-items:center; justify-content:space-between; gap:8px;">
            <span style="color:var(--text-primary);">⚠️ <b>Накопленный долг за все месяцы:</b> <span style="color:var(--danger); font-weight:800;">${allTimeUnpaidAmount} BYN</span> (${allTimeUnpaidCount} ур. с учётом прошлых месяцев)</span>
            <button class="btn btn-secondary btn-xs" style="padding:3px 10px; font-size:11px; font-weight:600;" onclick="document.getElementById('pay-filter-month').value='all'; TutoringPage.updatePaymentHistoryView();">Показать за всё время →</button>
          </div>
        ` : ''}
      `;
    }

    // Bulk actions
    const bulkContainer = document.getElementById('pay-bulk-actions');
    if (bulkContainer) {
      if (totalUnpaidCount > 0 && studentFilter !== 'all') {
        const targetSt = this.students.find(s => s.id === studentFilter);
        bulkContainer.innerHTML = `
          <button class="btn btn-secondary btn-xs" style="color:var(--danger); border-color:rgba(239,68,68,0.3); background:rgba(239,68,68,0.06); font-weight:700; padding:6px 12px;" onclick="TutoringPage.payAllDebts('${studentFilter}', ${totalUnpaidCount}, ${targetSt?.price || 0}, '${this.escapeHtml(targetSt?.name || '')}')">
            ⚡ Оплатить весь долг (${totalUnpaidAmount} BYN)
          </button>
        `;
      } else {
        bulkContainer.innerHTML = '';
      }
    }

    // Render List
    const listContainer = document.getElementById('pay-lessons-list');
    if (!listContainer) return;

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align:center; padding:36px 16px; color:var(--text-muted); font-size:13px;">
          <i data-lucide="inbox" style="width:32px; height:32px; opacity:0.3; margin-bottom:8px;"></i>
          <div>Нет проведённых уроков с выбранными фильтрами</div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    listContainer.innerHTML = filtered.map(ls => {
      const st = this.students.find(s => s.id === ls.student_id);
      const price = this.getLessonPrice(ls, st);
      const stName = st ? st.name : 'Ученик';
      const lessonDate = new Date(ls.date);
      const dateFormatted = lessonDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) + 
        ' в ' + lessonDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

      return `
        <div style="padding:12px 14px; border-radius:12px; background:var(--bg-surface); border:1px solid ${ls.paid ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.25)'}; display:flex; align-items:center; justify-content:space-between; gap:12px; transition:all 0.15s;" onmouseover="this.style.background='var(--bg-primary)'" onmouseout="this.style.background='var(--bg-surface)'">
          <div style="display:flex; align-items:center; gap:12px; min-width:0; flex:1;">
            <div style="width:36px; height:36px; border-radius:50%; background:${ls.paid ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}; color:${ls.paid ? 'var(--success)' : 'var(--danger)'}; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">
              ${ls.paid ? '✓' : '!'}
            </div>
            <div style="min-width:0; flex:1;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-weight:700; font-size:14px; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${this.escapeHtml(stName)}</span>
                <span style="font-size:11px; color:var(--text-muted);">${dateFormatted}</span>
              </div>
              <div style="font-size:12px; color:var(--text-secondary); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                📚 ${this.escapeHtml(ls.topic || 'Без указанной темы')}
              </div>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:12px; flex-shrink:0;">
            <div style="text-align:right;">
              <div style="font-weight:800; font-size:15px; color:${ls.paid ? 'var(--success)' : 'var(--danger)'};">${price} BYN</div>
              <div style="font-size:10px; font-weight:700; color:${ls.paid ? 'var(--success)' : 'var(--danger)'};">${ls.paid ? 'ОПЛАЧЕНО' : 'НЕ ОПЛАЧЕНО'}</div>
            </div>
            <div>
              ${ls.paid 
                ? `<button class="btn btn-secondary btn-xs" style="font-size:11px; padding:4px 8px; color:var(--text-muted);" title="Отменить отметку об оплате урока" onclick="TutoringPage.toggleLessonPayment('${ls.id}', false)">↩️ Отменить</button>`
                : `<button class="btn btn-primary btn-xs" style="font-size:11px; padding:4px 10px; background:var(--success); border-color:var(--success); color:#fff; font-weight:600;" onclick="TutoringPage.toggleLessonPayment('${ls.id}', true)">💰 Оплатить</button>`
              }
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  },

  async toggleLessonPayment(lessonId, markAsPaid) {
    const ls = this.lessons.find(l => l.id === lessonId);
    if (!ls) return;
    const st = this.students.find(s => s.id === ls.student_id);
    const price = this.getLessonPrice(ls, st);
    const stName = st ? st.name : 'Ученик';

    if (!markAsPaid) {
      if (!confirm(`Отменить оплату (${price} BYN) за урок "${ls.topic || 'Английский'}" ученика ${stName}?`)) {
        return;
      }
    }

    try {
      await DB.updateLesson(lessonId, { paid: markAsPaid });
      if (markAsPaid && price > 0) {
        await DB.createTransaction({
          type: 'income',
          amount: price,
          category: 'Репетиторство',
          description: JSON.stringify({ text: `Оплата за урок: ${stName} (${ls.topic || 'Без темы'})` })
        });
        UI.toast(`Оплата ${price} BYN зачислена в Доходы! 💰`, 'success');
      } else if (!markAsPaid) {
        UI.toast('Оплата отменена (урок переведён в статус долга)', 'info');
      }
      await this.load();
      this.updatePaymentHistoryView();
    } catch (e) {
      UI.toast('Ошибка: ' + e.message, 'error');
    }
  },

  async init() {
    this.bindEvents();
    await this.load();
  },

  bindEvents() {
    document.getElementById('add-student-btn').addEventListener('click', () => this.openStudentModal());
    document.getElementById('add-lesson-btn').addEventListener('click', () => this.openLessonModal());
    document.getElementById('auto-schedule-btn')?.addEventListener('click', () => this.autoScheduleWeek());
    if (!this._focusBound) {
      this._focusBound = true;
      window.addEventListener('focus', () => {
        const page = document.getElementById('tutoring-page');
        if (page && !page.classList.contains('hidden')) {
          this.load();
        }
      });
    }
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
    const monthNamesPrep = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
    const monthNamesNom = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
    const currentMonthPrep = monthNamesPrep[currentMonth];
    const currentMonthNom = monthNamesNom[currentMonth];
    const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    
    let monthlyIncome = 0;
    let lessonsThisMonth = 0;
    let unpaidLessonsAmount = 0;
    let totalUnpaidAllTime = 0;

    this.lessons.forEach(ls => {
      const d = new Date(ls.date);
      const isConducted = ls.status === 'Проведен';
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        lessonsThisMonth++;
        if (isConducted) {
          const st = this.students.find(s => s.id === ls.student_id);
          const price = this.getLessonPrice(ls, st);
          if (ls.paid) { monthlyIncome += price; }
          else { unpaidLessonsAmount += price; }
        }
      }
      if (isConducted && !ls.paid) {
        const st = this.students.find(s => s.id === ls.student_id);
        totalUnpaidAllTime += this.getLessonPrice(ls, st);
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
      <div class="glass-panel" onclick="TutoringPage.openPaymentHistoryModal(null, 'all', '${currentMonthKey}')" title="Нажмите, чтобы открыть историю оплат за ${currentMonthNom} и долги" style="padding:20px;border-radius:16px;display:flex;align-items:center;gap:16px;background:linear-gradient(145deg, var(--bg-surface), var(--bg-primary));border:1px solid var(--border-light);cursor:pointer;transition:all 0.2s;" onmouseover="this.style.transform='translateY(-2px)';this.style.borderColor='var(--success)';this.style.boxShadow='0 4px 16px rgba(16,185,129,0.15)';" onmouseout="this.style.transform='none';this.style.borderColor='var(--border-light)';this.style.boxShadow='none';">
        <div style="width:48px;height:48px;border-radius:12px;background:rgba(16, 185, 129, 0.1);color:var(--success);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <i data-lucide="wallet" style="width:24px;height:24px;"></i>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
            <div style="font-size:13px;color:var(--text-secondary);font-weight:500;">Оплачено в ${currentMonthPrep}</div>
            <span style="font-size:10px;padding:2px 6px;border-radius:8px;background:rgba(16,185,129,0.12);color:var(--success);font-weight:700;">🧾 Детали →</span>
          </div>
          <div style="font-size:24px;font-weight:800;color:var(--text-primary);margin-top:2px;">${monthlyIncome} <span style="font-size:14px;color:var(--text-muted);font-weight:600;">BYN</span></div>
          ${unpaidLessonsAmount > 0 ? `
            <div style="font-size:11px;color:var(--danger);font-weight:600;margin-top:2px;display:flex;flex-direction:column;gap:1px;">
              <span>⏳ Ждёт оплаты: ${unpaidLessonsAmount} BYN (${currentMonthNom})</span>
              ${totalUnpaidAllTime > unpaidLessonsAmount ? `<span style="color:var(--text-muted);font-size:10px;font-weight:500;">⚠️ Общий долг: ${totalUnpaidAllTime} BYN (все месяцы)</span>` : ''}
            </div>
          ` : (totalUnpaidAllTime > 0 ? `
            <div style="font-size:11px;color:var(--danger);font-weight:600;margin-top:2px;">⚠️ За ${currentMonthNom} всё оплачено • Долг за прошлые месяцы: ${totalUnpaidAllTime} BYN</div>
          ` : `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Все проведённые уроки оплачены</div>`)}
        </div>
      </div>
      <div class="glass-panel" style="padding:20px;border-radius:16px;display:flex;align-items:center;gap:16px;background:linear-gradient(145deg, var(--bg-surface), var(--bg-primary));border:1px solid var(--border-light);">
        <div style="width:48px;height:48px;border-radius:12px;background:rgba(245, 158, 11, 0.1);color:var(--warning);display:flex;align-items:center;justify-content:center;">
          <i data-lucide="book-open-check" style="width:24px;height:24px;"></i>
        </div>
        <div>
          <div style="font-size:13px;color:var(--text-secondary);font-weight:500;">Уроков за ${currentMonthNom}</div>
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
        const debtBadge = unpaidCount > 0 ? `<div onclick="event.stopPropagation(); TutoringPage.openPaymentHistoryModal('${st.id}', 'unpaid')" title="Нажмите, чтобы посмотреть неоплаченные уроки ${this.escapeHtml(st.name)}" style="background:rgba(239, 68, 68, 0.1);color:var(--danger);font-size:11px;font-weight:700;padding:2px 8px;border-radius:12px;border:1px solid rgba(239,68,68,0.2);cursor:pointer;display:inline-flex;align-items:center;gap:4px;">⏳ Не оплачено: ${this.pluralizeLessons(unpaidCount)}</div>` : '';

        // Extract notes from schedule
        const dossier = this.parseStudentDossier(st);
        // Find latest homework lesson for this student
        const lastHwLesson = this.lessons
          .filter(l => l.student_id === st.id && l.homework && l.homework.trim())
          .sort((a,b) => new Date(b.date) - new Date(a.date))[0];
        let hwStatusBadge = '';
        if (lastHwLesson) {
          const rawHw = lastHwLesson.homework || '';
          const tel = this.parseHomeworkBotTelemetry(rawHw, st.name);
          const cleanHwText = this.cleanHomeworkText(rawHw);
          const groupChip = tel.isGroup
            ? `<div style="margin-top:4px;font-size:10px;color:var(--text-secondary);display:flex;gap:8px;flex-wrap:wrap;"><span>👧 Арина: <b>${tel.arinaDone ? '📸 сдано ✅' : `${tel.arinaPct}%`}</b></span><span>👦 Матвей: <b>${tel.matveyDone ? '📸 сдано ✅' : `${tel.matveyPct}%`}</b></span></div>`
            : '';
          if ((tel.isDone || tel.hasPhoto) && !tel.isChecked) {
            hwStatusBadge = `<div style="margin-top:8px;padding:6px 10px;border-radius:8px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.25);font-size:11px;min-width:0;overflow:hidden;"><div style="display:flex;justify-content:space-between;align-items:center;gap:6px;"><span style="color:#2563eb;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;">${tel.hasPhoto ? '📸 Фото тетрадки проверено' : '📬 Сдано в ТГ'} (${tel.pct}%): ${this.escapeHtml(cleanHwText || 'Домашка')}</span><button class="btn btn-secondary btn-xs" style="font-size:10px;padding:2px 6px;color:var(--success);border-color:rgba(16,185,129,0.3);flex-shrink:0;" onclick="event.stopPropagation(); TutoringPage.markPrevHwChecked('${lastHwLesson.id}')">✅ Проверено</button></div>${groupChip}</div>`;
          } else if (tel.isChecked) {
            hwStatusBadge = `<div style="margin-top:8px;padding:4px 8px;border-radius:8px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);font-size:11px;color:var(--success);min-width:0;overflow:hidden;"><div style="display:flex;align-items:center;gap:6px;"><i data-lucide="check-circle" style="width:12px;height:12px;flex-shrink:0;"></i> <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;">✅ ДЗ проверено${tel.hasPhoto ? ' (📸 с фото)' : ''}: ${this.escapeHtml(cleanHwText || 'Задание')}</span></div>${groupChip}</div>`;
          } else if (cleanHwText || tel.pct > 0) {
            const progChip = tel.pct > 0 ? `<span style="background:rgba(245,158,11,0.15);color:#d97706;font-weight:700;padding:1px 6px;border-radius:6px;font-size:10px;flex-shrink:0;">⏳ В ТГ: ${tel.pct}%</span>` : '';
            hwStatusBadge = `<div style="margin-top:8px;padding:4px 8px;border-radius:8px;background:var(--bg-primary);border:1px solid var(--border-light);font-size:11px;color:var(--text-secondary);min-width:0;overflow:hidden;"><div style="display:flex;align-items:center;gap:6px;"><i data-lucide="edit-3" style="width:12px;height:12px;color:var(--accent);flex-shrink:0;"></i> <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;">ДЗ: ${this.escapeHtml(cleanHwText || 'Письменное задание')}</span>${progChip}</div>${groupChip}</div>`;
          }
        }
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
          <div class="glass-panel" data-id="${st.id}" style="padding:20px;border-radius:16px;cursor:pointer;opacity:${opacity};transition:all 0.2s;background:var(--bg-surface);border:1px solid ${borderColor};${glowEffect}position:relative;overflow:hidden;min-width:0;max-width:100%;box-sizing:border-box;" onmouseover="${onMouseOver}" onmouseout="${onMouseOut}">
            ${!st.active ? '<div style="position:absolute;top:12px;right:12px;font-size:10px;background:var(--bg-secondary);padding:2px 8px;border-radius:12px;font-weight:600;">АРХИВ</div>' : ''}
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:16px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg, var(--accent), var(--accent-vibrant));color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;box-shadow:0 2px 8px var(--accent-alpha);">
                  ${st.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style="font-weight:700;font-size:16px;color:var(--text-primary);display:flex;align-items:center;gap:6px;flex-wrap:wrap;">${this.escapeHtml(st.name)}<span title="Ударный режим (выполненных ДЗ подряд без пропусков)" style="font-size:11px;padding:2px 8px;border-radius:10px;background:rgba(249,115,22,0.15);color:#f97316;font-weight:800;border:1px solid rgba(249,115,22,0.3);display:inline-flex;align-items:center;gap:3px;">🔥 ${dossier.streak || 0} ДЗ</span><span title="Щиты заморозки стрика (защищают серию при пропуске дня, макс. 3)" style="font-size:11px;padding:2px 7px;border-radius:10px;background:rgba(59,130,246,0.15);color:#3b82f6;font-weight:800;border:1px solid rgba(59,130,246,0.3);display:inline-flex;align-items:center;gap:3px;">🛡️ ${dossier.shields ?? 1}/3</span></div>
                  <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${this.escapeHtml(st.grade || 'Уровень не указан')}</div>
                </div>
              </div>
              <div style="text-align:right;">
                <div onclick="event.stopPropagation(); TutoringPage.openPaymentHistoryModal('${st.id}')" title="Нажмите, чтобы посмотреть историю оплат ученика ${this.escapeHtml(st.name)}" style="font-weight:800;color:var(--accent);font-size:16px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:8px;background:var(--bg-primary);border:1px solid var(--border-light);transition:all 0.15s;" onmouseover="this.style.borderColor='var(--accent)';" onmouseout="this.style.borderColor='var(--border-light)';">
                  <span>${st.price} <span style="font-size:12px;">BYN</span></span>
                  <i data-lucide="receipt" style="width:13px;height:13px;color:var(--text-muted);"></i>
                </div>
              </div>
            </div>
            
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary);background:var(--bg-primary);padding:4px 8px;border-radius:8px;">
                <i data-lucide="clock" style="width:14px;height:14px;color:var(--accent);"></i>
                ${this.escapeHtml(displaySchedule)}
              </div>
              ${debtBadge}
            </div>
            ${(dossier.unit || dossier.interests || dossier.errors) ? `
              <div style="margin-top:8px;font-size:11px;color:var(--text-secondary);display:flex;flex-direction:column;gap:3px;overflow:hidden;word-break:break-word;min-width:0;">
                ${dossier.unit ? `<div style="color:var(--accent);">📖 <b>Программа:</b> ${this.escapeHtml(dossier.unit)}</div>` : ''}
                ${dossier.interests ? `<div>🎯 <b>Интересы:</b> ${this.escapeHtml(dossier.interests)}</div>` : ''}
                ${dossier.errors ? `
                  <div style="color:var(--warning);line-height:1.35;">
                    ⚠️ <b>Ошибки:</b>
                    <span id="st-err-${st.id}" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${this.escapeHtml(dossier.errors)}</span>
                    ${dossier.errors.length > 80 ? `<span onclick="event.stopPropagation(); const el = document.getElementById('st-err-${st.id}'); const isClamped = el.style.webkitLineClamp !== 'unset'; el.style.webkitLineClamp = isClamped ? 'unset' : '2'; this.textContent = isClamped ? '▲ Свернуть' : '▼ Развернуть подробнее'; this.style.color = isClamped ? 'var(--accent)' : 'var(--text-muted)';" style="font-size:10px;text-decoration:underline;cursor:pointer;color:var(--text-muted);margin-top:2px;display:inline-block;">▼ Развернуть подробнее</span>` : ''}
                  </div>` : ''}
              </div>` : ''}
            ${hwStatusBadge}

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:14px; padding-top:12px; border-top:1px dashed var(--border-light); width: 100%; flex-wrap:wrap; min-width:0;">
              <button class="btn btn-secondary btn-xs" onclick="event.stopPropagation(); TutoringPage.openPaymentHistoryModal('${st.id}')" style="display:flex; align-items:center; gap:4px; padding: 4px 8px; font-size:11px; color:var(--success); border-color:rgba(16,185,129,0.3); background:rgba(16,185,129,0.04);" title="История оплат и проведённых уроков ${this.escapeHtml(st.name)}">
                <i data-lucide="receipt" style="width:12px;height:12px;"></i> Оплаты
              </button>
              ${unpaidCount > 0 ? `
                <button class="btn btn-secondary btn-xs" onclick="event.stopPropagation(); TutoringPage.payAllDebts('${st.id}', ${unpaidCount}, ${st.price}, '${this.escapeHtml(st.name)}')" style="color:var(--danger); border-color:rgba(239,68,68,0.2); background:rgba(239,68,68,0.05); display:flex; align-items:center; gap:4px; padding: 4px 8px; font-size:11px;">
                  <i data-lucide="coins" style="width:12px;height:12px;"></i> Оплатить долг
                </button>
              ` : ''}
              <button class="btn btn-secondary btn-xs" onclick="event.stopPropagation(); TutoringPage.copyStudentBotInvite('${st.id}')" style="display:flex; align-items:center; gap:4px; padding: 4px 8px; font-size:11px; color:${dossier.tgId ? 'var(--success)' : '#3b82f6'};" title="${dossier.tgId ? 'Ученик подключён к ТГ-боту (нажми, чтобы скопировать ссылку снова)' : 'Скопировать ссылку-приглашение в ТГ-бота для авто-напоминаний ДЗ'}">
                ${dossier.tgId ? '🟢 ТГ-бот' : '🔗 В ТГ-бот'}
              </button>
              <button class="btn btn-secondary btn-xs" onclick="event.stopPropagation(); TutoringPage.copyParentBotInvite('${st.id}')" style="display:flex; align-items:center; gap:4px; padding: 4px 8px; font-size:11px; color:${dossier.parentTgId ? 'var(--success)' : '#8b5cf6'};" title="${dossier.parentTgId ? 'Родитель подключён к ТГ-боту (нажми, чтобы скопировать ссылку снова)' : 'Скопировать ссылку-приглашение в ТГ-бота для родителя (авто-отчёты по урокам)'}">
                ${dossier.parentTgId ? '🟢 Родитель' : '👨‍👩‍👧 Родителю'}
              </button>
              <button class="btn btn-secondary btn-xs" onclick="event.stopPropagation(); TutoringPage.sendHwToStudentTelegram('${st.id}')" style="display:flex; align-items:center; gap:4px; padding: 4px 8px; font-size:11px;" title="Отправить / напомнить последнее домашнее задание ученику в Telegram">
                📨 ДЗ в ТГ
              </button>
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
          const nowMinskDay = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Minsk' });
          const lsMinskDay = d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Minsk' });
          const isToday = lsMinskDay === nowMinskDay;
          const dateStr = d.toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk', day:'numeric', month:'short' });
          const timeStr = d.toLocaleTimeString('ru-RU', { timeZone: 'Europe/Minsk', hour:'2-digit', minute:'2-digit' });
          
          let statusColor = 'var(--accent)';
          let statusIcon = 'calendar';
          if (ls.status === 'Проведен') { statusColor = 'var(--success)'; statusIcon = 'check-circle'; }
          if (ls.status === 'Отменен') { statusColor = 'var(--text-muted)'; statusIcon = 'x-circle'; }
          
          const studentName = ls.students?.name || 'Ученик';

          // Extract materials from homework
          let rawHomework = ls.homework || '';
          let displayMaterials = '';
          if (rawHomework.includes('\n[МАТЕРИАЛЫ]:')) {
            const parts = rawHomework.split('\n[МАТЕРИАЛЫ]:');
            rawHomework = parts[0];
            displayMaterials = parts[1].trim();
          } else if (rawHomework.includes('\\n[МАТЕРИАЛЫ]:')) {
            const parts = rawHomework.split('\\n[МАТЕРИАЛЫ]:');
            rawHomework = parts[0];
            displayMaterials = parts[1].trim();
          }
          let displayHomework = this.cleanHomeworkText(rawHomework);

          const prevDoneLesson = ls.status === 'Запланирован' ? this.getPrevConductedLesson(ls.student_id, ls.date) : null;
          const prevHwRaw = prevDoneLesson ? ((prevDoneLesson.homework || '').split('\\n[МАТЕРИАЛЫ]:')[0].trim()) : '';
          const prevHwChecked = prevHwRaw.includes('[ДЗ_ПРОВЕРЕНО]');
          const prevHwClean = this.cleanHomeworkText(prevHwRaw);
          const hasLinks = displayMaterials.includes('http');

          let hwRow = '';
          const lsTel = this.parseHomeworkBotTelemetry(ls.homework || '', studentName);
          const isDone = lsTel.isDone || lsTel.hasPhoto;
          const isChecked = lsTel.isChecked;
          if (displayHomework || isDone || isChecked || lsTel.pct > 0) {
            const photoOrProgBadge = isDone && !isChecked
              ? `<span style="font-size:10px;background:rgba(59,130,246,0.15);color:#3b82f6;font-weight:700;padding:2px 6px;border-radius:6px;display:inline-flex;align-items:center;gap:2px;">${lsTel.hasPhoto ? '📸 Фото тетрадки проверено' : '📬 Сдано в ТГ'} (${lsTel.pct}%)</span><button class="btn btn-secondary btn-xs" style="font-size:10px;padding:2px 6px;color:var(--success);border-color:rgba(16,185,129,0.3);" onclick="event.stopPropagation(); TutoringPage.markPrevHwChecked('${ls.id}')">✅ Проверено</button>`
              : (isChecked
                  ? `<span style="font-size:10px;background:rgba(16,185,129,0.12);color:var(--success);font-weight:700;padding:2px 6px;border-radius:6px;">✅ Проверено${lsTel.hasPhoto ? ' 📸' : ''}</span>`
                  : (lsTel.pct > 0 ? `<span style="font-size:10px;background:rgba(245,158,11,0.15);color:#d97706;font-weight:700;padding:2px 6px;border-radius:6px;">⏳ В ТГ: ${lsTel.pct}%</span>` : ''));
            hwRow = `
              <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;">
                ${displayHomework ? `<i data-lucide="edit-3" style="width:12px;height:12px;"></i> <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.escapeHtml(displayHomework)}</span>` : ''}
                ${photoOrProgBadge}
              </div>
            `;
          }

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
                  ${hwRow}
                  ${(ls.status === 'Запланирован' && prevDoneLesson && prevHwClean) ? `<div style="margin-top:4px;padding:6px 8px;border-radius:8px;background:${prevHwChecked ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.12)'};border:1px solid ${prevHwChecked ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.3)'};font-size:11px;display:flex;justify-content:space-between;align-items:center;gap:8px;"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${prevHwChecked ? '✅ ДЗ проверено:' : '📌 <b>Проверить ДЗ:</b>'} ${this.escapeHtml(prevHwClean)}</span>${!prevHwChecked ? `<button class="btn btn-secondary btn-xs" style="font-size:10px;padding:2px 6px;flex-shrink:0;" onclick="event.stopPropagation(); TutoringPage.markPrevHwChecked('${prevDoneLesson.id}')">✅ Проверено</button>` : ''}</div>` : ''}
                  ${ls.status === 'Запланирован' ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
  <button class="btn btn-secondary btn-xs" style="font-size:10px;padding:3px 8px;color:#0d9488;border-color:rgba(13,148,136,0.35);background:rgba(13,148,136,0.06);" onclick="event.stopPropagation(); TutoringPage.launchPerplexity('${ls.student_id}', '${ls.id}')">🔮 В Perplexity</button>
  <button class="btn btn-secondary btn-xs" style="font-size:10px;padding:3px 8px;" onclick="event.stopPropagation(); TutoringPage.openZenBoard('${ls.id}')">🖥 Экран ученика</button>
  ${hasLinks ? `<a href="${displayMaterials}" target="_blank" onclick="event.stopPropagation()" class="btn btn-secondary btn-xs" style="font-size:10px;padding:3px 8px;color:#0284c7;border-color:rgba(2,132,199,0.35);background:rgba(2,132,199,0.06);display:inline-flex;align-items:center;gap:3px;"><i data-lucide="presentation" style="width:11px;height:11px;"></i> Презентация</a>` : ''}
</div>` : ''}
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
    
    const dossier = st ? this.parseStudentDossier(st) : { schedule: '', tgId: '', tgUser: '', perplexity: '', unit: '', interests: '', errors: '', vocab: '', notes: '' };
    document.getElementById('st-tg-user').value = dossier.tgUser || '';
    document.getElementById('st-tg-id').value = dossier.tgId || '';
    const copyTgBtn = document.getElementById('st-btn-copy-tg-link');
    if (copyTgBtn) {
      copyTgBtn.textContent = dossier.tgId ? '🟢 Подключён (копировать ссылку)' : '🔗 Ссылка привязки к боту';
      copyTgBtn.onclick = () => st ? this.copyStudentBotInvite(st.id) : UI.toast('Сначала сохраните карточку ученика', 'warning');
    }
    const pUserEl = document.getElementById('st-parent-tg-user');
    if (pUserEl) pUserEl.value = dossier.parentTgUser || '';
    const pIdEl = document.getElementById('st-parent-tg-id');
    if (pIdEl) pIdEl.value = dossier.parentTgId || '';
    const copyParentBtn = document.getElementById('st-btn-copy-parent-link');
    if (copyParentBtn) {
      copyParentBtn.textContent = dossier.parentTgId ? '🟢 Родитель подключён (ссылка)' : '👨‍👩‍👧 Ссылка родителю';
      copyParentBtn.onclick = () => st ? this.copyParentBotInvite(st.id) : UI.toast('Сначала сохраните карточку ученика', 'warning');
    }
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
    const freshList = id ? await DB.getStudents().catch(() => this.students) : this.students;
    const freshSt = id ? (freshList.find(s => s.id === id) || this.students.find(s => s.id === id)) : null;
    const freshDoss = freshSt ? this.parseStudentDossier(freshSt) : {};

    let schedule = this.serializeStudentDossier(
      document.getElementById('st-schedule').value.trim(),
      document.getElementById('st-interests').value.trim(),
      document.getElementById('st-errors').value.trim(),
      document.getElementById('st-vocab').value.trim(),
      document.getElementById('st-notes').value.trim(),
      document.getElementById('st-perplexity').value.trim(),
      document.getElementById('st-unit').value.trim(),
      document.getElementById('st-tg-id').value.trim() || freshDoss.tgId || '',
      document.getElementById('st-tg-user').value.trim() || freshDoss.tgUser || '',
      freshDoss.streak || (id ? this.parseStudentDossier(this.students.find(s => s.id === id)).streak : 0),
      document.getElementById('st-parent-tg-id')?.value?.trim() || freshDoss.parentTgId || '',
      document.getElementById('st-parent-tg-user')?.value?.trim() || freshDoss.parentTgUser || '',
      freshDoss.lastActive || (id ? this.parseStudentDossier(this.students.find(s => s.id === id)).lastActive : ''),
      typeof freshDoss.shields === 'number' ? freshDoss.shields : 1
    );
    if (false) {
    const notes = document.getElementById('st-notes').value.trim();
    if (notes) {
      schedule += '\\n[ЗАМЕТКИ]:\\n' + notes;
    }

    }
    if (id) {
      const oldLs = this.lessons.find(l => l.id === id);
      if (false && oldLs) {
        homework = (homework ? homework + '\n' : '') + '[ПЕРЕНЕСЕН_В_ТГ]';
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
      // Если изменилась ставка ученика (например, с 30 на 40 BYN), фиксируем старую цену на уже проведённых неоплаченных уроках,
      // чтобы прошлые долги не пересчитались задним числом по новому тарифу.
      if (id && freshSt && Number(freshSt.price) > 0 && Number(freshSt.price) !== data.price) {
        const oldPrice = Number(freshSt.price);
        const pastUnpaid = (this.lessons || []).filter(l => l.student_id === id && l.status === 'Проведен' && !l.paid && !(l.homework || '').includes('[ЦЕНА_УРОКА:'));
        for (const ul of pastUnpaid) {
          const taggedHw = `${ul.homework || ''} [ЦЕНА_УРОКА:${oldPrice}]`.trim();
          await DB.updateLesson(ul.id, { homework: taggedHw }).catch(() => {});
          ul.homework = taggedHw;
        }
      }
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
  
  switchLessonTab(tab) {
    const tabPrep = document.getElementById('tab-btn-prep');
    const tabPost = document.getElementById('tab-btn-post');
    const secPrep = document.getElementById('lesson-sec-prep');
    const secPost = document.getElementById('lesson-sec-post');
    if (!secPrep || !secPost) return;

    if (tab === 'prep') {
      tabPrep?.classList.add('active');
      tabPrep?.style.setProperty('border-bottom', '2px solid var(--accent)');
      tabPrep?.style.setProperty('color', 'var(--accent)');
      tabPost?.classList.remove('active');
      tabPost?.style.setProperty('border-bottom', 'none');
      tabPost?.style.setProperty('color', 'var(--text-muted)');
      secPrep.style.display = 'block';
      secPost.style.display = 'none';
    } else {
      tabPost?.classList.add('active');
      tabPost?.style.setProperty('border-bottom', '2px solid var(--accent)');
      tabPost?.style.setProperty('color', 'var(--accent)');
      tabPrep?.classList.remove('active');
      tabPrep?.style.setProperty('border-bottom', 'none');
      tabPrep?.style.setProperty('color', 'var(--text-muted)');
      secPrep.style.display = 'none';
      secPost.style.display = 'block';
    }
  },

  openLessonModal(id = null, studentId = null) {
    if (this.students.length === 0) return UI.toast('Сначала добавьте ученика', 'warning');
    
    this.currentLessonId = id;
    const ls = id ? this.lessons.find(l => l.id === id) : null;
    const modal = document.getElementById('lesson-modal');
    
    const sSelect = document.getElementById('ls-student');
    sSelect.innerHTML = this.students.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    if (ls) sSelect.value = ls.student_id;
    else if (studentId) sSelect.value = studentId;

    // Set date to now if new
    const dStr = ls 
      ? new Date(ls.date).toLocaleString('sv-SE', {timeZone: 'Europe/Minsk'}).replace(' ', 'T').slice(0,16) 
      : new Date().toLocaleString('sv-SE', {timeZone: 'Europe/Minsk'}).replace(' ', 'T').slice(0,16);
    document.getElementById('ls-date').value = dStr;
    
    document.getElementById('ls-topic').value = ls ? (ls.topic || '') : '';
    
    let displayHomework = ls ? (ls.homework || '') : '';
    displayHomework = displayHomework.replace(/\[ПЕРЕНЕСЕН_В_ТГ\]/g, '').trim();
    
    // 0. Extract [ДЕБРИФИНГ]
    let debriefNotes = '';
    const debriefMatch = displayHomework.match(/\[ДЕБРИФИНГ\]:([\s\S]*?)\[\/ДЕБРИФИНГ\]/);
    if (debriefMatch) {
      debriefNotes = debriefMatch[1].trim();
      displayHomework = displayHomework.replace(debriefMatch[0], '').trim();
    }
    const debriefEl = document.getElementById('ls-debrief-notes');
    if (debriefEl) debriefEl.value = debriefNotes;

    // 1. Extract [ПРЕЗЕНТАЦИЯ] and [ПРЕЗЕНТАЦИЯ_ФАЙЛ]
    this.attachedPresentation = null;
    this.attachedPresentationFile = null;
    this.attachedPresentationName = '';
    const presMatch = displayHomework.match(/\[ПРЕЗЕНТАЦИЯ\]:([\s\S]*?)\[\/ПРЕЗЕНТАЦИЯ\]/);
    if (presMatch) {
      this.attachedPresentation = presMatch[1].trim();
      displayHomework = displayHomework.replace(presMatch[0], '').trim();
    }
    const presFileMatch = displayHomework.match(/\[ПРЕЗЕНТАЦИЯ_?ФАЙЛ\]:([\s\S]*?)(?=\n\[|$)/i);
    if (presFileMatch) {
      this.attachedPresentationName = presFileMatch[1].trim();
      displayHomework = displayHomework.replace(presFileMatch[0], '').trim();
      if (id) {
        this.getLocalFile('lesson_pres_' + id).then(localData => {
          if (localData) {
            if (localData instanceof Blob || localData instanceof File) {
              this.attachedPresentationFile = localData;
            } else {
              this.attachedPresentation = localData;
            }
            this.renderPresentationBadge();
          }
        });
      }
    }

    // 1.1 Extract [ПРЕЗЕНТАЦИЯ_ТЕКСТ]
    this.attachedPresentationText = '';
    const presTextMatch = displayHomework.match(/\[ПРЕЗЕНТАЦИЯ_?ТЕКСТ\]:([\s\S]*?)(?:\[\/?\s*ПРЕЗЕНТАЦИЯ_?ТЕКСТ\s*\]|(?=\n\[|$))/i);
    if (presTextMatch) {
      this.attachedPresentationText = presTextMatch[1].trim();
      displayHomework = displayHomework.replace(presTextMatch[0], '').trim();
    }

    // Очищаем XML-теги и дедуп-хэши из старого текста презентации, но не удаляем сам текст
    if (this.attachedPresentationText) {
      if (this.attachedPresentationText.includes('pk!') || this.attachedPresentationText.includes('p!kiW') || this.attachedPresentationText.startsWith('PK\x03\x04')) {
        this.attachedPresentationText = '';
      } else if (this.attachedPresentationText.includes('<a:tblPr') || this.attachedPresentationText.includes('<a:')) {
        this.attachedPresentationText = this.attachedPresentationText
          .replace(/<[^>]+>/g, '')
          .replace(/gen-dedup-[a-f0-9]+\.png/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }

    // Если имя файла презентации не было сохранено отдельно, но есть в тексте презентации:
    if (!this.attachedPresentationName && this.attachedPresentationText) {
      const nameMatch = this.attachedPresentationText.match(/\[(?:Конспект|Извлечено) из презентации ([^\]]+)\]/i);
      if (nameMatch) {
        this.attachedPresentationName = nameMatch[1].trim();
      }
    }

    this.renderPresentationBadge();

    // 2. Extract [СЦЕНАРИЙ_УРОКА]
    let scenario = '';
    const scMatch = displayHomework.match(/\[СЦЕНАРИЙ_?УРОКА\]:([\s\S]*?)\[\/?\s*СЦЕНАРИЙ_?УРОКА\s*\]/i);
    if (scMatch) {
      scenario = scMatch[1].trim();
      displayHomework = displayHomework.replace(scMatch[0], '').trim();
    }
    // Clean legacy binary zip garbage or accidentally injected presentation text from scenario
    if (scenario) {
      if (
        scenario.includes('pk!') || 
        scenario.includes('p!kiW') || 
        scenario.startsWith('PK\x03\x04') || 
        scenario.startsWith('[Извлечено из презентации') || 
        scenario.startsWith('[Конспект из презентации') ||
        scenario.trim().startsWith('Слайд 1:') ||
        scenario.trim().startsWith('Slide 1:') ||
        (this.attachedPresentationText && scenario.trim() === this.attachedPresentationText.trim())
      ) {
        scenario = '';
      }
    }

    // 3. Extract [КАРТОЧКИ_ДЗ]
    const cardsMatch = displayHomework.match(/\[КАРТОЧКИ_?ДЗ\]:([\s\S]*?)\[\/?\s*КАРТОЧКИ_?ДЗ\s*\]/i);
    this.attachedCards = cardsMatch ? cardsMatch[1].trim().split('||').map(s => s.trim()).filter(Boolean) : [];
    if (cardsMatch) {
      displayHomework = displayHomework.replace(cardsMatch[0], '').trim();
    }
    this.renderCardsPreview();

    // 4. Strip custom reports from homework input field
    displayHomework = displayHomework
      .replace(/\[КАСТОМНЫЙ_?ОТЧЕТ\]:[\s\S]*?\[\/?КАСТОМНЫЙ_?ОТЧЕТ\]/gi, '')
      .replace(/\[ОТЧЕТ_?РОДИТЕЛЮ\]:[\s\S]*?\[\/?ОТЧЕТ_?РОДИТЕЛЮ\]/gi, '')
      .trim();

    // 5. Extract [МАТЕРИАЛЫ]
    let materials = '';
    const matMatch = displayHomework.match(/(?:\r?\n|\\n)?\[МАТЕРИАЛЫ\]:([\s\S]*)$/i);
    if (matMatch) {
      materials = matMatch[1].trim();
      displayHomework = displayHomework.replace(matMatch[0], '').trim();
    }

    displayHomework = this.cleanHomeworkText(displayHomework);

    document.getElementById('ls-homework').value = displayHomework;

    // 5.5 Render live Telegram HW progress, photo verification & AI feedback inside Lesson Modal
    const telBox = document.getElementById('ls-bot-hw-telemetry-box');
    if (telBox) {
      const curStObj = this.students.find(s => s.id === document.getElementById('ls-student').value);
      const tel = ls?.homework ? this.parseHomeworkBotTelemetry(ls.homework, curStObj?.name || '') : null;
      if (tel && (tel.pct > 0 || tel.hasPhoto || tel.isDone || tel.isChecked || tel.feedbackBlocks.length > 0)) {
        const groupHtml = tel.isGroup
          ? `<div style="margin-top:6px;padding:6px 8px;border-radius:6px;background:rgba(255,255,255,0.6);display:flex;gap:12px;flex-wrap:wrap;font-size:11px;">
               <span>👧 <b>Арина:</b> ${tel.arinaDone ? '📸 фото тетрадки проверено ✅' : `⏳ готовность ${tel.arinaPct}%`}</span>
               <span>👦 <b>Матвей:</b> ${tel.matveyDone ? '📸 фото тетрадки проверено ✅' : `⏳ готовность ${tel.matveyPct}%`}</span>
             </div>`
          : '';
        const fbHtml = tel.feedbackBlocks.length > 0
          ? `<div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:var(--bg-surface);border:1px solid var(--border-light);font-size:11px;white-space:pre-wrap;max-height:160px;overflow-y:auto;">
               <div style="font-weight:700;color:var(--accent);margin-bottom:4px;">🤖 Обратная связь (ОС) бота по фото тетрадки ученика:</div>
               ${tel.feedbackBlocks.map(b => `<div style="margin-bottom:4px;">${b.label ? `<b>${this.escapeHtml(b.label)}:</b> ` : ''}${this.escapeHtml(b.text)}</div>`).join('')}
             </div>`
          : '';
        telBox.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-weight:700;color:${tel.hasPhoto || tel.isDone || tel.isChecked ? '#10b981' : '#2563eb'};">
              ${tel.isChecked ? '✅ ДЗ проверено преподавателем' : (tel.hasPhoto ? '📸 Письменное ДЗ по фото тетрадки проверено и зачтено ботом!' : `📊 Прогресс выполнения ДЗ в Telegram: ${tel.pct}%`)}
            </span>
            <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:rgba(59,130,246,0.15);color:#2563eb;">Готовность: ${tel.pct}%</span>
          </div>
          ${groupHtml}
          ${fbHtml}
        `;
        telBox.classList.remove('hidden');
      } else {
        telBox.innerHTML = '';
        telBox.classList.add('hidden');
      }
    }
    const scenEl = document.getElementById('ls-scenario');
    if (scenEl) {
      // Окно сценария предназначено строго для плана урока из Perplexity, не перезаписываем его презентацией
      scenEl.value = scenario;
    }
    document.getElementById('ls-materials').value = materials;

    // Авто-определение темы урока по СУТИ презентации/сценария (если тема пуста или была записана просто из имени файла)
    const topicInput = document.getElementById('ls-topic');
    if (topicInput && (this.attachedPresentationName || this.attachedPresentationText || scenario)) {
      const curTop = topicInput.value.trim();
      const rawFileClean = (this.attachedPresentationName || '').replace(/\.[^/.]+$/, '').replace(/20\d{6,12}/g, '').replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();
      const looksLikeRawFilename = !curTop || curTop === 'Практика английского языка' || curTop === 'Present Perfect Mission' || /\b\d\s+\d\b/.test(curTop) || (rawFileClean && curTop.toLowerCase() === rawFileClean.toLowerCase());
      if (looksLikeRawFilename) {
        const currentSt = this.students.find(s => s.id === document.getElementById('ls-student').value);
        const autoTopic = this.detectTopicFromPresentation(this.attachedPresentationName, this.attachedPresentationText, currentSt?.name, scenario);
        if (autoTopic && autoTopic !== 'Практика английского языка') {
          topicInput.value = autoTopic;
        }
      }
    }

    const pplxFillBtn = document.getElementById('ls-btn-pplx-fill');
    if (pplxFillBtn) {
      pplxFillBtn.onclick = () => {
        const raw = prompt('📥 Вставьте сценарий / конспект урока из Perplexity:');
        if (raw && raw.trim()) {
          scenEl.value = raw.trim();
          UI.toast('Сценарий вставлен в материалы урока!', 'success');
        }
      };
    }
    document.getElementById('ls-status').value = ls ? ls.status : 'Запланирован';
    // Auto-select tab based on lesson status
    if (ls && ls.status === 'Проведен') {
      this.switchLessonTab('post');
    } else {
      this.switchLessonTab('prep');
    }
    document.getElementById('ls-paid').checked = ls ? ls.paid : false;

    const delBtn = document.getElementById('lesson-modal-delete');
    delBtn.style.display = ls ? '' : 'none';

    // AI Generation click
    // Extract attached cards
    this.attachedCards = this.parseCardsFromHomework(ls?.homework || '');
    this.renderCardsPreview();
    this.bindLessonModalMediaAndDebrief(ls, sSelect.value);

    this.renderLessonMemoryBanner(sSelect.value, ls?.date, ls?.id);
    sSelect.onchange = () => this.renderLessonMemoryBanner(sSelect.value, ls?.date, ls?.id);
    const outBox = document.getElementById('ls-ai-output-box');
    if (outBox) { outBox.classList.add('hidden'); outBox.innerHTML = ''; }
    const runTweeMode = async (mode, btnEl, label) => {
      const student_id = document.getElementById('ls-student').value;
      const st = this.students.find(s => s.id === student_id);
      if (!st) return UI.toast('Выберите ученика', 'warning');
      const topic = document.getElementById('ls-topic').value.trim();
      const hw = document.getElementById('ls-homework').value.trim();
      const mem = this.compileStudentMemory(st.id, ls?.date, ls?.id);
      const prevLs = mem.prevLesson;
      btnEl.disabled = true;
      btnEl.textContent = '⏳ Генерирую...';
      try {
        const rawLsHw = ls?.homework || '';
        const fallbackScen = rawLsHw.match(/\[СЦЕНАРИЙ_?УРОКА\]:([\s\S]*?)\[\/?\s*СЦЕНАРИЙ_?УРОКА\s*\]/i)?.[1]?.trim() || '';
        const fallbackPresText = rawLsHw.match(/\[ПРЕЗЕНТАЦИЯ_?ТЕКСТ\]:([\s\S]*?)(?:\[\/?\s*ПРЕЗЕНТАЦИЯ_?ТЕКСТ\s*\]|(?=\n\[|$))/i)?.[1]?.trim() || '';
        const scenario = document.getElementById('ls-scenario')?.value?.trim() || fallbackScen || '';
        const presText = this.attachedPresentationText || fallbackPresText || '';
        const debrief = document.getElementById('ls-debrief-notes')?.value?.trim() || '';
        const materials = document.getElementById('ls-materials')?.value?.trim() || '';
        const curEssence = this.analyzePresentationEssence(presText, scenario, this.attachedPresentationName || '', st.name);
        const curVocabStr = curEssence.vocabList.map(v => v.formatted).join(', ');
        const combinedVocab = [curVocabStr, mem.enrichedDossier.vocab].filter(Boolean).join(', ');

        const res = await Gemini.generateTutoringAI(mode, 
          {
            name: st.name,
            grade: st.grade,
            ...mem.enrichedDossier,
            vocab: combinedVocab || mem.enrichedDossier.vocab,
            historySummary: mem.aiHistorySummary
          }, 
          { 
            topic: (topic && topic !== 'Present Perfect Mission') ? topic : (curEssence.topic || topic), 
            homework: hw, 
            scenario,
            debrief,
            materials,
            cards: this.attachedCards || [],
            presentation: this.attachedPresentation || '',
            presentationText: presText
          }, 
          prevLs,
          mem.historyLessons
        );
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
    const visionBtn = document.getElementById('ls-btn-vision-ai');
    const visionInput = document.getElementById('ls-vision-file-input');
    if (visionBtn && visionInput) {
      visionBtn.onclick = () => {
        // Если уже прикреплена карточка/скриншот, распознаём её! Иначе открываем выбор файла
        if (this.attachedCards && this.attachedCards.length > 0) {
          this.handleVisionRecognition(this.attachedCards[0]);
          return;
        }
        visionInput.click();
      };
      visionInput.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) this.handleVisionRecognition(file);
        visionInput.value = '';
      };
    }
    const visionCardsBtn = document.getElementById('ls-btn-vision-from-cards');
    if (visionCardsBtn && visionInput) {
      visionCardsBtn.onclick = () => visionInput.click();
    }
    const announceTgBtn = document.getElementById('ls-btn-announce-tg');
    if (announceTgBtn) {
      announceTgBtn.onclick = () => {
        const stId = document.getElementById('ls-student').value;
        const st = this.students.find(s => s.id === stId);
        this.openAnnouncementModal(ls, st);
      };
    }
    const annClose = document.getElementById('announcement-modal-close');
    if (annClose) annClose.onclick = () => document.getElementById('announcement-modal')?.classList.add('hidden');
    const annCancel = document.getElementById('announcement-modal-cancel');
    if (annCancel) annCancel.onclick = () => document.getElementById('announcement-modal')?.classList.add('hidden');

    const pplxBtn = document.getElementById('ls-btn-perplexity');
    if (pplxBtn) pplxBtn.onclick = () => this.launchPerplexity(document.getElementById('ls-student').value, ls?.id);
    const impBtn = document.getElementById('ls-btn-import-perplexity');
    if (impBtn) impBtn.onclick = () => this.importFromPerplexity(document.getElementById('ls-student').value, ls?.id);
    const zenBtn = document.getElementById('ls-btn-zen-board');
    if (zenBtn) zenBtn.onclick = () => this.openZenBoard(ls?.id, document.getElementById('ls-student').value);
    const sendTgBtn = document.getElementById('ls-btn-send-tg');
    if (sendTgBtn) sendTgBtn.onclick = () => this.sendHwToStudentTelegram(document.getElementById('ls-student').value, ls?.id);
    const sendParentTgBtn = document.getElementById('ls-btn-send-parent-tg');
    if (sendParentTgBtn) sendParentTgBtn.onclick = () => this.sendReportToParentTelegram(document.getElementById('ls-student').value, ls?.id);
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
        const rawLsHw = ls?.homework || '';
        const fallbackScen = rawLsHw.match(/\[СЦЕНАРИЙ_?УРОКА\]:([\s\S]*?)\[\/?\s*СЦЕНАРИЙ_?УРОКА\s*\]/i)?.[1]?.trim() || '';
        const fallbackPresText = rawLsHw.match(/\[ПРЕЗЕНТАЦИЯ_?ТЕКСТ\]:([\s\S]*?)(?:\[\/?\s*ПРЕЗЕНТАЦИЯ_?ТЕКСТ\s*\]|(?=\n\[|$))/i)?.[1]?.trim() || '';
        const scenario = document.getElementById('ls-scenario')?.value?.trim() || fallbackScen || '';
        const presText = this.attachedPresentationText || fallbackPresText || '';
        const debrief = document.getElementById('ls-debrief-notes')?.value?.trim() || '';
        const materials = document.getElementById('ls-materials')?.value?.trim() || '';
        const mem = this.compileStudentMemory(st.id, ls?.date, ls?.id);
        const curEssence = this.analyzePresentationEssence(presText, scenario, this.attachedPresentationName || '', st.name);
        const curVocabStr = curEssence.vocabList.map(v => v.formatted).join(', ');
        const combinedVocab = [curVocabStr, mem.enrichedDossier.vocab].filter(Boolean).join(', ');
        const effectiveTopic = (topic && topic !== 'Present Perfect Mission' && !/\b\d\s+\d\b/.test(topic)) ? topic : (curEssence.topic || topic);
        if (effectiveTopic && effectiveTopic !== topic) {
          document.getElementById('ls-topic').value = effectiveTopic;
        }

        const homework = await Gemini.generateTutoringAI('homework', 
          {
            name: st.name,
            grade: st.grade,
            ...mem.enrichedDossier,
            vocab: combinedVocab || mem.enrichedDossier.vocab,
            historySummary: mem.aiHistorySummary
          }, 
          {
            topic: effectiveTopic,
            scenario,
            debrief,
            materials,
            cards: this.attachedCards,
            presentation: this.attachedPresentation,
            presentationText: presText
          }, 
          mem.prevLesson,
          mem.historyLessons
        );
        document.getElementById('ls-homework').value = homework;

        // Авто-генерация красивой PNG-карточки с заданием (Worksheet Card), чтобы ученик получил визуальную карточку в ТГ!
        try {
          const worksheetPng = await this.renderHomeworkWorksheetCardCanvas(topic, homework, st.name);
          if (worksheetPng) {
            if (!this.attachedCards) this.attachedCards = [];
            if (this._lastAutoWorksheetCard) {
              const oldIdx = this.attachedCards.indexOf(this._lastAutoWorksheetCard);
              if (oldIdx !== -1) this.attachedCards.splice(oldIdx, 1);
            }
            this._lastAutoWorksheetCard = worksheetPng;
            this.attachedCards.unshift(worksheetPng);
            this.renderCardsPreview();
          }
        } catch (cardErr) {
          console.warn('Auto worksheet card render error:', cardErr);
        }

        const pBox = document.getElementById('ls-tg-preview-box');
        if (pBox) {
          pBox.classList.remove('hidden');
          this.updateLessonModalTgPreview();
        }
        UI.toast('Домашка + PNG-карточка задания сгенерированы!', 'success');
      } catch (e) {
        UI.toast('Ошибка ИИ: ' + e.message, 'error');
      } finally {
        aiBtn.innerHTML = '<i data-lucide="sparkles" style="width:12px;height:12px;"></i> Сгенерировать ИИ';
        aiBtn.disabled = false;
        if (window.lucide) window.lucide.createIcons();
      }
    };

    const prevToggleBtn = document.getElementById('ls-btn-preview-tg');
    const previewBox = document.getElementById('ls-tg-preview-box');
    if (prevToggleBtn && previewBox) {
      prevToggleBtn.onclick = () => {
        previewBox.classList.toggle('hidden');
        if (!previewBox.classList.contains('hidden')) {
          this.updateLessonModalTgPreview();
        }
      };
    }
    const hwTextarea = document.getElementById('ls-homework');
    if (hwTextarea) {
      hwTextarea.oninput = () => {
        if (previewBox && !previewBox.classList.contains('hidden')) {
          this.updateLessonModalTgPreview();
        }
      };
    }

    document.getElementById('lesson-modal-save').onclick = () => this.saveLesson(ls?.id);
    document.getElementById('lesson-modal-cancel').onclick = () => modal.classList.add('hidden');
    document.getElementById('lesson-modal-close').onclick = () => modal.classList.add('hidden');
    delBtn.onclick = () => { modal.classList.add('hidden'); this.deleteLesson(ls?.id); };

    modal.classList.remove('hidden');
  },

  async saveLesson(id = null) {
    if (!id && this.currentLessonId) id = this.currentLessonId;
    const student_id = document.getElementById('ls-student').value;
    const dStr = document.getElementById('ls-date').value;
    if (!student_id || !dStr) return UI.toast('Заполните обязательные поля', 'warning');

    const targetDateIso = (dStr.includes('+') || dStr.includes('Z')) 
      ? new Date(dStr).toISOString() 
      : new Date(dStr + ':00+03:00').toISOString();

    let homework = document.getElementById('ls-homework').value;
    if (id) {
      const prevLsObj = this.lessons.find(l => l.id === id);
      if (prevLsObj && prevLsObj.status === 'Запланирован' && new Date(prevLsObj.date).getTime() !== new Date(targetDateIso).getTime() && !homework.includes('[ПЕРЕНЕСЕН_В_ТГ]')) {
        homework = (homework ? homework + '\n' : '') + '[ПЕРЕНЕСЕН_В_ТГ]';
      }
    }
    // Clean existing tags from homework text
    homework = homework
      .replace(/(?:\r?\n|\\n)?\[ДЕБРИФИНГ\]:[\s\S]*?\[\/ДЕБРИФИНГ\]/g, '')
      .replace(/(?:\r?\n|\\n)?\[КАРТОЧКИ_ДЗ\]:[\s\S]*?\[\/КАРТОЧКИ_ДЗ\]/g, '')
      .replace(/(?:\r?\n|\\n)?\[ПРЕЗЕНТАЦИЯ\]:[\s\S]*?\[\/ПРЕЗЕНТАЦИЯ\]/g, '')
      .replace(/(?:\r?\n|\\n)?\[ПРЕЗЕНТАЦИЯ_ФАЙЛ\]:[\s\S]*?(?=\n\[|$)/g, '')
      .replace(/(?:\r?\n|\\n)?\[ПРЕЗЕНТАЦИЯ_ТЕКСТ\]:[\s\S]*?\[\/ПРЕЗЕНТАЦИЯ_ТЕКСТ\]/g, '')
      .replace(/(?:\r?\n|\\n)?\[СЦЕНАРИЙ_УРОКА\]:[\s\S]*?\[\/СЦЕНАРИЙ_УРОКА\]/g, '')
      .replace(/(?:\r?\n|\\n)?\[МАТЕРИАЛЫ\]:[\s\S]*$/g, '')
      .trim();

    // 0. Serialize debrief
    const debriefVal = document.getElementById('ls-debrief-notes')?.value?.trim() || '';
    if (debriefVal) {
      homework += '\n\n[ДЕБРИФИНГ]:\n' + debriefVal + '\n[/ДЕБРИФИНГ]';
    }

    // 1. Serialize presentation file
    const fileToPersist = this.attachedPresentationFile || this.attachedPresentation;
    if (this.attachedPresentationFile) {
      if (id) await this.saveLocalFile('lesson_pres_' + id, this.attachedPresentationFile);
      homework += '\n\n[ПРЕЗЕНТАЦИЯ_ФАЙЛ]: ' + (this.attachedPresentationName || 'Презентация урока (файл)') + '\n';
    } else if (this.attachedPresentation) {
      if (typeof this.attachedPresentation === 'string' && this.attachedPresentation.startsWith('http')) {
        homework += '\n\n[ПРЕЗЕНТАЦИЯ]:\n' + this.attachedPresentation + '\n[/ПРЕЗЕНТАЦИЯ]';
      } else if (typeof this.attachedPresentation === 'string' && this.attachedPresentation.length < 150000) {
        homework += '\n\n[ПРЕЗЕНТАЦИЯ]:\n' + this.attachedPresentation + '\n[/ПРЕЗЕНТАЦИЯ]';
      } else {
        if (id) await this.saveLocalFile('lesson_pres_' + id, this.attachedPresentation);
        homework += '\n\n[ПРЕЗЕНТАЦИЯ_ФАЙЛ]: ' + (this.attachedPresentationName || 'Презентация урока (файл)') + '\n';
      }
    } else if (this.attachedPresentationName) {
      homework += '\n\n[ПРЕЗЕНТАЦИЯ_ФАЙЛ]: ' + this.attachedPresentationName + '\n';
    } else if (id) {
      const oldLs = this.lessons.find(l => l.id === id);
      const oldPres = oldLs?.homework?.match(/\[ПРЕЗЕНТАЦИЯ\]:([\s\S]*?)\[\/ПРЕЗЕНТАЦИЯ\]/);
      if (oldPres && (oldPres[1].trim().startsWith('http') || oldPres[1].length < 150000)) {
        homework += '\n\n' + oldPres[0];
      } else {
        const oldPresFile = oldLs?.homework?.match(/\[ПРЕЗЕНТАЦИЯ_ФАЙЛ\]:([\s\S]*?)(?=\n\[|$)/);
        if (oldPresFile) {
          homework += '\n\n' + oldPresFile[0];
        }
      }
    }

    // 1.1 Serialize extracted presentation text
    if (this.attachedPresentationText) {
      homework += '\n\n[ПРЕЗЕНТАЦИЯ_ТЕКСТ]:\n' + this.attachedPresentationText + '\n[/ПРЕЗЕНТАЦИЯ_ТЕКСТ]';
    } else if (id) {
      const oldLs = this.lessons.find(l => l.id === id);
      const oldPresText = oldLs?.homework?.match(/\[ПРЕЗЕНТАЦИЯ_ТЕКСТ\]:([\s\S]*?)\[\/ПРЕЗЕНТАЦИЯ_ТЕКСТ\]/);
      if (oldPresText) {
        homework += '\n\n' + oldPresText[0];
      }
    }

    // 2. Serialize scenario (or preserve existing if not cleared)
    const scenarioVal = document.getElementById('ls-scenario')?.value?.trim() || '';
    if (scenarioVal) {
      homework += '\n\n[СЦЕНАРИЙ_УРОКА]:\n' + scenarioVal + '\n[/СЦЕНАРИЙ_УРОКА]';
    } else if (id) {
      const oldLs = this.lessons.find(l => l.id === id);
      const oldScen = oldLs?.homework?.match(/\[СЦЕНАРИЙ_УРОКА\]:([\s\S]*?)\[\/СЦЕНАРИЙ_УРОКА\]/);
      if (oldScen) {
        homework += '\n\n' + oldScen[0];
      }
    }

    // 3. Serialize cards with auto-compression to avoid PostgreSQL statement timeout
    // Если есть текст ДЗ, но ещё нет PNG-карточки — автоматически создаём PNG-карточку с письменным заданием для тетради!
    const cleanHwForCard = this.cleanHomeworkText(document.getElementById('ls-homework')?.value || '');
    if (cleanHwForCard.length > 10 && (!this.attachedCards || this.attachedCards.length === 0)) {
      try {
        const stObj = this.students.find(s => s.id === student_id);
        const topicVal = document.getElementById('ls-topic')?.value?.trim() || 'English Practice';
        const autoCard = await this.renderHomeworkWorksheetCardCanvas(topicVal, cleanHwForCard, stObj?.name || 'Ученик');
        if (autoCard) {
          this.attachedCards = [autoCard];
        }
      } catch (e) {
        console.warn('Auto card in saveLesson error:', e);
      }
    }
    if (this.attachedCards && this.attachedCards.length > 0) {
      const compressedCards = await Promise.all(this.attachedCards.map(async (card) => {
        if (card && card.startsWith('data:image/') && card.length > 200000) {
          try {
            return await this.compressImage(card, 960, 0.75);
          } catch (e) {
            return card;
          }
        }
        return card;
      }));
      this.attachedCards = compressedCards;
      homework += '\n\n[КАРТОЧКИ_ДЗ]:\n' + this.attachedCards.join('||') + '\n[/КАРТОЧКИ_ДЗ]';
    }

    // 4. Serialize materials
    const materials = document.getElementById('ls-materials')?.value?.trim() || '';
    if (materials) {
      homework += '\n\n[МАТЕРИАЛЫ]:\n' + materials;
    }
    if (id) {
      const oldLs = this.lessons.find(l => l.id === id);
      if (oldLs?.homework) {
        // 1. Сохраняем ВСЕ теги выполнения ДЗ, фото тетрадки, прогресса (%) и ОС бота из Telegram, чтобы сохранение урока в приложении их НИКОГДА не стирало!
        const preservedBotMeta = this.extractPreservedBotTags(oldLs.homework);
        if (preservedBotMeta.prefixTags.length > 0) {
          const missingPrefix = preservedBotMeta.prefixTags.filter(t => !homework.includes(t));
          if (missingPrefix.length > 0) {
            homework = `${missingPrefix.join(' ')} ${homework}`.trim();
          }
        }
        if (preservedBotMeta.suffixBlocks.length > 0) {
          const missingSuffix = preservedBotMeta.suffixBlocks.filter(b => !homework.includes(b));
          if (missingSuffix.length > 0) {
            homework = `${homework}\n${missingSuffix.join('\n')}`.trim();
          }
        }

        // 2. Не перезаписывать ожидающие отправки теги очереди в ТГ-бот
        const pendingTags = [
          '[АНОНС_УРОКА_В_ТГ]',
          '[ОТПРАВИТЬ_АНОНС_УРОКА_В_ТГ]',
          '[ОТПРАВИТЬ_АНОНС_В_ТГ]',
          '[ОТПРАВИТЬ_В_ТГ]',
          '[ОТПРАВИТЬ_РОДИТЕЛЮ_В_ТГ]'
        ];
        for (const tag of pendingTags) {
          if (oldLs.homework.includes(tag) && !homework.includes(tag)) {
            homework += `\n${tag}`;
          }
        }
        const sAnnMatch = oldLs.homework.match(/\[АНОНС_УЧЕНИКУ\]:[\s\S]*?\[\/АНОНС_УЧЕНИКУ\]/);
        if (sAnnMatch && !homework.includes('[АНОНС_УЧЕНИКУ]')) {
          homework += `\n${sAnnMatch[0]}`;
        }
        const pAnnMatch = oldLs.homework.match(/\[АНОНС_РОДИТЕЛЮ\]:[\s\S]*?\[\/АНОНС_РОДИТЕЛЮ\]/);
        if (pAnnMatch && !homework.includes('[АНОНС_РОДИТЕЛЮ]')) {
          homework += `\n${pAnnMatch[0]}`;
        }
      }
    }
    const data = {
      student_id,
      date: targetDateIso,
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
    const wasConducted = ls ? ls.status === 'Проведен' : false;
    const rawUserHwText = (document.getElementById('ls-homework')?.value || '').trim();
    if (!isConductedNow) {
      // Строгая защита: никогда не отправлять ДЗ или отчёт, пока урок в статусе «Запланирован»!
      data.homework = (data.homework || '').replace(/\[ОТПРАВИТЬ_В_ТГ\]/g, '').replace(/\[ОТПРАВИТЬ_РОДИТЕЛЮ_В_ТГ\]/g, '').trim();
    } else if (isConductedNow && !wasConducted) {
      const stObj = this.students.find(s => s.id === student_id);
      const dossObj = stObj ? this.parseStudentDossier(stObj) : {};
      // Отправляем в ТГ только если преподаватель реально сформировал/написал текст ДЗ (а не просто загрузил презентацию!)
      if (dossObj.tgId && rawUserHwText.length > 0 && !data.homework.includes('[ОТПРАВИТЬ_В_ТГ]')) {
        data.homework = `[ОТПРАВИТЬ_В_ТГ] ${data.homework}`;
      }
      if (dossObj.parentTgId && rawUserHwText.length > 0 && !data.homework.includes('[ОТПРАВИТЬ_РОДИТЕЛЮ_В_ТГ]')) {
        data.homework = `${data.homework || ''} [ОТПРАВИТЬ_РОДИТЕЛЮ_В_ТГ]`.trim();
      }
    }
    
    let createTx = false;
    if (!wasPaid && isPaidNow && isConductedNow) {
      const st = this.students.find(s => s.id === student_id);
      const price = this.getLessonPrice(data, st);
      if (price > 0) {
        if (confirm(`Зачислить оплату за урок (${price} BYN) в Финансы (Доходы)?`)) {
          createTx = { amount: price, name: st.name };
        }
      }
    }

    try {
      let savedLessonId = id;
      if (id) {
        await DB.updateLesson(id, data);
      } else {
        const created = await DB.createLesson(data);
        if (created && created.id) {
          savedLessonId = created.id;
          this.currentLessonId = created.id;
        }
      }
      
      // Гарантированное сохранение файла презентации в локальную БД для этого урока
      if (savedLessonId && fileToPersist) {
        try {
          await this.saveLocalFile('lesson_pres_' + savedLessonId, fileToPersist);
        } catch (fErr) {
          console.warn('saveLocalFile error after lesson save:', fErr);
        }
      }

      // Автоматическое обогащение памяти ученика (словарь, интересы, ошибки) по материалам сохранённого урока
      try {
        const stObj = this.students.find(s => s.id === student_id);
        if (stObj && (this.attachedPresentationText || scenarioVal || debriefVal)) {
          const dossier = this.parseStudentDossier(stObj);
          const essence = this.analyzePresentationEssence(this.attachedPresentationText || '', scenarioVal || '', this.attachedPresentationName || '', stObj.name);
          const vocabMap = new Map();
          if (dossier.vocab) {
            for (const item of dossier.vocab.split(/[,;\n]+/)) {
              const t = item.trim();
              if (!t) continue;
              const k = t.split(/[—–\-:]/)[0].trim().toLowerCase();
              if (k) vocabMap.set(k, t);
            }
          }
          for (const v of essence.vocabList) {
            if (!vocabMap.has(v.en.toLowerCase())) {
              vocabMap.set(v.en.toLowerCase(), v.formatted);
            }
          }
          const updatedVocab = Array.from(vocabMap.values()).slice(0, 40).join(', ');
          const updatedInterests = dossier.interests || essence.worlds.join('; ');
          const updatedErrors = debriefVal && !dossier.errors.includes(debriefVal.slice(0, 30))
            ? (dossier.errors ? `${dossier.errors} | ${debriefVal}` : debriefVal)
            : dossier.errors;

          if (updatedVocab !== (dossier.vocab || '') || updatedInterests !== (dossier.interests || '') || updatedErrors !== (dossier.errors || '')) {
            const newSched = this.serializeStudentDossier(
              dossier.schedule,
              updatedInterests,
              updatedErrors,
              updatedVocab,
              dossier.notes,
              dossier.perplexity,
              dossier.unit,
              dossier.tgId,
              dossier.tgUser,
              dossier.streak,
              dossier.parentTgId,
              dossier.parentTgUser,
              dossier.lastActive,
              dossier.shields
            );
            await DB.updateStudent(stObj.id, { schedule: newSched });
            stObj.schedule = newSched;
          }
        }
      } catch (memErr) {
        console.warn('Auto student memory sync error:', memErr);
      }
      
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
      this.saveLocalFile('lesson_pres_' + id, null).catch(() => {});
      UI.toast('Урок удален', 'info');
      await this.load();
    } catch(e) { UI.toast('Ошибка: ' + e.message, 'error'); }
  },

  async payAllDebts(studentId, unpaidCount, pricePerLesson, studentName) {
    const unpaidConductedLessons = this.lessons.filter(l => l.student_id === studentId && l.status === 'Проведен' && !l.paid);
    if (unpaidConductedLessons.length === 0) return;
    const st = this.students.find(s => s.id === studentId);
    const total = unpaidConductedLessons.reduce((acc, l) => acc + this.getLessonPrice(l, st), 0);
    if (!confirm(`Отметить все неоплаченные проведенные уроки (${this.pluralizeLessons(unpaidConductedLessons.length)}) для ${studentName} как оплаченные?\nОбщая сумма: ${total} BYN`)) {
      return;
    }

    try {
      // Update each lesson to paid = true
      await Promise.all(unpaidConductedLessons.map(l => DB.updateLesson(l.id, { paid: true })));

      // Ask user if they want to log this into Finances
      if (confirm(`Зачислить общую сумму оплаты (${total} BYN) в Финансы (Доходы)?`)) {
        await DB.createTransaction({
          type: 'income',
          amount: total,
          category: 'Репетиторство',
          description: JSON.stringify({ text: `Оплата долга за ${this.pluralizeLessons(unpaidCount)}: ${studentName}` })
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
      const nextIdx = rest.search(/\\n\[(ЗАМЕТКИ|ИНТЕРЕСЫ|ОШИБКИ|СЛОВАРЬ|PERPLEXITY|УЧЕБНИК|TG_ID|TG_USER|PARENT_TG_ID|PARENT_TG_USER|СТРИК|ЩИТЫ_СТРИКА|LAST_ACTIVE)\]:|\n\[(ЗАМЕТКИ|ИНТЕРЕСЫ|ОШИБКИ|СЛОВАРЬ|PERPLEXITY|УЧЕБНИК|TG_ID|TG_USER|PARENT_TG_ID|PARENT_TG_USER|СТРИК|ЩИТЫ_СТРИКА|LAST_ACTIVE)\]:/);
      return (nextIdx === -1 ? rest : rest.slice(0, nextIdx)).replace(/^\\n|^\n/, '').trim();
    };
    const firstTagIdx = raw.search(/\\n\[(ЗАМЕТКИ|ИНТЕРЕСЫ|ОШИБКИ|СЛОВАРЬ|PERPLEXITY|УЧЕБНИК|TG_ID|TG_USER|PARENT_TG_ID|PARENT_TG_USER|СТРИК|ЩИТЫ_СТРИКА|LAST_ACTIVE)\]:|\n\[(ЗАМЕТКИ|ИНТЕРЕСЫ|ОШИБКИ|СЛОВАРЬ|PERPLEXITY|УЧЕБНИК|TG_ID|TG_USER|PARENT_TG_ID|PARENT_TG_USER|СТРИК|ЩИТЫ_СТРИКА|LAST_ACTIVE)\]:/);
    const schedule = (firstTagIdx === -1 ? raw : raw.slice(0, firstTagIdx)).trim();
    const rawShields = getSec('[ЩИТЫ_СТРИКА]:');
    const parsedShields = rawShields !== '' ? parseInt(rawShields, 10) : 1;
    return {
      schedule,
      tgId: getSec('[TG_ID]:'),
      tgUser: getSec('[TG_USER]:'),
      parentTgId: getSec('[PARENT_TG_ID]:'),
      parentTgUser: getSec('[PARENT_TG_USER]:'),
      streak: parseInt(getSec('[СТРИК]:') || '0', 10) || 0,
      shields: Number.isNaN(parsedShields) ? 1 : Math.max(0, Math.min(3, parsedShields)),
      lastActive: getSec('[LAST_ACTIVE]:'),
      perplexity: getSec('[PERPLEXITY]:'),
      unit: getSec('[УЧЕБНИК]:'),
      interests: getSec('[ИНТЕРЕСЫ]:'),
      errors: getSec('[ОШИБКИ]:'),
      vocab: getSec('[СЛОВАРЬ]:'),
      notes: getSec('[ЗАМЕТКИ]:')
    };
  },

  serializeStudentDossier(schedule, interests, errors, vocab, notes, perplexity = '', unit = '', tgId = '', tgUser = '', streak = 0, parentTgId = '', parentTgUser = '', lastActive = '', shields = 1) {
    let out = schedule || '';
    if (tgId) out += `\\n[TG_ID]:\\n${tgId}`;
    if (tgUser) out += `\\n[TG_USER]:\\n${tgUser}`;
    if (parentTgId) out += `\\n[PARENT_TG_ID]:\\n${parentTgId}`;
    if (parentTgUser) out += `\\n[PARENT_TG_USER]:\\n${parentTgUser}`;
    if (streak) out += `\\n[СТРИК]:\\n${streak}`;
    if (typeof shields === 'number') out += `\\n[ЩИТЫ_СТРИКА]:\\n${shields}`;
    if (lastActive) out += `\\n[LAST_ACTIVE]:\\n${lastActive}`;
    if (perplexity) out += `\\n[PERPLEXITY]:\\n${perplexity}`;
    if (unit) out += `\\n[УЧЕБНИК]:\\n${unit}`;
    if (interests) out += `\\n[ИНТЕРЕСЫ]:\\n${interests}`;
    if (errors) out += `\\n[ОШИБКИ]:\\n${errors}`;
    if (vocab) out += `\\n[СЛОВАРЬ]:\\n${vocab}`;
    if (notes) out += `\\n[ЗАМЕТКИ]:\\n${notes}`;
    return out;
  },

  extractPreservedBotTags(rawHw) {
    if (!rawHw) return { prefixTags: [], suffixBlocks: [] };
    const prefixTags = [];
    const singleRegex = /\[(ДЗ_ПРОВЕРЕНО[A-ZА-Я0-9_]*|ДЗ_СДАНО[A-ZА-Я0-9_]*|ФОТО_ДЗ_СДАНО[A-ZА-Я0-9_]*|ФОТО_ФАЙЛ[A-ZА-Я0-9_]*:[^\]]+|ПРОГРЕСС[A-ZА-Я0-9_]*:[^\]]+|НАПОМИНАНИЕ_ДЗ_ДАТА:[^\]]+|ЦЕНА_УРОКА:[^\]]+)\]/gi;
    let m;
    while ((m = singleRegex.exec(rawHw)) !== null) {
      if (!prefixTags.includes(m[0])) prefixTags.push(m[0]);
    }
    const suffixBlocks = [];
    const blockRegex = /\[(ОС_ПО_ФОТО_[A-ZА-Я0-9_]+)\]:[\s\S]*?\[\/\1\]/gi;
    let bm;
    while ((bm = blockRegex.exec(rawHw)) !== null) {
      if (!suffixBlocks.includes(bm[0])) suffixBlocks.push(bm[0]);
    }
    return { prefixTags, suffixBlocks };
  },

  parseHomeworkBotTelemetry(rawHw, studentName = '') {
    const hw = rawHw || '';
    const isGroup = (studentName || '').toLowerCase().includes('арина') && (studentName || '').toLowerCase().includes('матвей');
    const isChecked = hw.includes('[ДЗ_ПРОВЕРЕНО]');
    const arinaDone = hw.includes('[ФОТО_ДЗ_СДАНО_АРИНА]') || hw.includes('[ДЗ_СДАНО_АРИНА]') || hw.includes('[ДЗ_ПРОВЕРЕНО_АРИНА]') || isChecked;
    const matveyDone = hw.includes('[ФОТО_ДЗ_СДАНО_МАТВЕЙ]') || hw.includes('[ДЗ_СДАНО_МАТВЕЙ]') || hw.includes('[ДЗ_ПРОВЕРЕНО_МАТВЕЙ]') || isChecked;
    const hasPhoto = isGroup ? (arinaDone && matveyDone) : hw.includes('[ФОТО_ДЗ_СДАНО]');
    const isDone = isGroup ? (arinaDone && matveyDone) : hw.includes('[ДЗ_СДАНО]');

    const arinaM = hw.match(/\[ПРОГРЕСС_АРИНА:(\d+)%\]/);
    const matveyM = hw.match(/\[ПРОГРЕСС_МАТВЕЙ:(\d+)%\]/);
    const arinaPct = arinaM ? parseInt(arinaM[1], 10) : (arinaDone ? 100 : 0);
    const matveyPct = matveyM ? parseInt(matveyM[1], 10) : (matveyDone ? 100 : 0);

    const pctMatch = hw.match(/\[ПРОГРЕСС_ДЗ:(\d+)%\]/);
    const pct = pctMatch
      ? parseInt(pctMatch[1], 10)
      : (isChecked || isDone || hasPhoto ? 100 : (isGroup ? Math.round((arinaPct + matveyPct) / 2) : 0));

    const feedbackBlocks = [];
    const fbRegex = /\[ОС_ПО_ФОТО_([A-ZА-Я0-9_]+)\]:\s*([\s\S]*?)\[\/ОС_ПО_ФОТО_\1\]/gi;
    let fm;
    while ((fm = fbRegex.exec(hw)) !== null) {
      const key = (fm[1] || '').toUpperCase();
      const label = key === 'АРИНА' ? '👧 Арина' : (key === 'МАТВЕЙ' ? '👦 Матвей' : '');
      const text = (fm[2] || '').trim();
      if (text) feedbackBlocks.push({ label, text });
    }

    return {
      isGroup,
      isChecked,
      isDone,
      hasPhoto,
      pct,
      arinaDone,
      matveyDone,
      arinaPct,
      matveyPct,
      feedbackBlocks
    };
  },

  getStudentLessonHistory(studentId, beforeDate = null, excludeLessonId = null, limit = null) {
    const exclId = excludeLessonId || this.currentLessonId || null;
    const cutoff = beforeDate ? new Date(beforeDate).getTime() : null;
    const refDayStr = beforeDate ? new Date(beforeDate).toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk' }) : null;

    const conducted = (this.lessons || [])
      .filter(l => {
        if (l.student_id !== studentId || l.status !== 'Проведен') return false;
        if (exclId && String(l.id) === String(exclId)) return false;
        if (cutoff !== null) {
          const lTime = new Date(l.date).getTime();
          // Строго раньше текущего урока (минимум на 1 минуту раньше, и не тот же самый день, если открыт урок этого дня)
          if (lTime >= cutoff - 60000) return false;
          if (exclId && refDayStr) {
            const lDayStr = new Date(l.date).toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk' });
            if (lDayStr === refDayStr) return false;
          }
        }
        return true;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return limit ? conducted.slice(0, limit) : conducted;
  },

  getPrevConductedLesson(studentId, beforeDate = null, excludeLessonId = null) {
    const history = this.getStudentLessonHistory(studentId, beforeDate, excludeLessonId, 1);
    return history[0] || null;
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

  cleanHomeworkText(rawHw) {
    if (!rawHw) return '';
    return rawHw
      // 1. Remove blocks with opening and closing tags (with or without underscore, mismatched closing tags)
      .replace(/\[(ДЕБРИФИНГ|КАРТОЧКИ_?ДЗ|СЦЕНАРИЙ_?УРОКА|ПРЕЗЕНТАЦИЯ_?ТЕКСТ|ПРЕЗЕНТАЦИЯ_?ФАЙЛ|ПРЕЗЕНТАЦИЯ|КАСТОМНЫЙ_?ОТЧЕТ|ОТЧЕТ_?РОДИТЕЛЮ|МАТЕРИАЛЫ)\]:?[\s\S]*?\[\/\s*\1\s*\]/gi, '')
      .replace(/\[ПРЕЗЕНТАЦИЯ_?ТЕКСТ\]:?[\s\S]*?\[\/?\s*ПРЕЗЕНТАЦИЯ_?ТЕКСТ\s*\]/gi, '')
      .replace(/\[КАРТОЧКИ_?ДЗ\]:?[\s\S]*?\[\/?\s*КАРТОЧКИ_?ДЗ\s*\]/gi, '')
      .replace(/\[СЦЕНАРИЙ_?УРОКА\]:?[\s\S]*?\[\/?\s*СЦЕНАРИЙ_?УРОКА\s*\]/gi, '')
      .replace(/\[([A-ZА-Я0-9_]+)\]:?[\s\S]*?\[\/\s*\1\s*\]/g, '')
      // 2. Remove single-line file/text/material tags
      .replace(/\[(ПРЕЗЕНТАЦИЯ_?ФАЙЛ|ПРЕЗЕНТАЦИЯ_?ТЕКСТ|ПРЕЗЕНТАЦИЯ|МАТЕРИАЛЫ|КАСТОМНЫЙ_?ОТЧЕТ|ОТЧЕТ_?РОДИТЕЛЮ)\]:?[^\n]*/gi, '')
      .split(/\\?n?\[МАТЕРИАЛЫ\]:/i)[0]
      // 3. Remove status / progress / dispatch bracket tags
      .replace(/\[\/?(ПРЕЗЕНТАЦИЯ_?ТЕКСТ|ПРЕЗЕНТАЦИЯ_?ФАЙЛ|ПРЕЗЕНТАЦИЯ|ДЕБРИФИНГ|КАРТОЧКИ_?ДЗ|СЦЕНАРИЙ_?УРОКА|КАСТОМНЫЙ_?ОТЧЕТ|ОТЧЕТ_?РОДИТЕЛЮ|МАТЕРИАЛЫ|ОС_ПО_ФОТО[A-ZА-Я0-9_]*)\]/gi, '')
      .replace(/\[(ДЗ_ПРОВЕРЕНО[A-ZА-Я0-9_]*|ДЗ_СДАНО[A-ZА-Я0-9_]*|ФОТО_ДЗ_СДАНО[A-ZА-Я0-9_]*|ФОТО_ФАЙЛ[A-ZА-Я0-9_]*:[^\]]+|ОТПРАВИТЬ[A-ZА-Я0-9_]*|ПЕРЕНЕСЕН[A-ZА-Я0-9_]*|АНОНС[A-ZА-Я0-9_]*|ПРОГРЕСС[A-ZА-Я0-9_]*:[^\]]+)\]/gi, '')
      .replace(/\[([A-ZА-Я0-9_]{3,}):[^\]]+\]/g, '')
      // 4. Answers / Teacher keys / base64
      .replace(/(?:🔑|🎯)?\s*(?:КЛЮЧИ|ОТВЕТЫ)\s+ДЛЯ\s+(?:ПРЕПОДАВАТЕЛЯ|УЧИТЕЛЯ)[\s\S]*$/gi, '')
      .replace(/data:(image|application)\/[^;]+;base64,[A-Za-z0-9+/=]+/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  },

  cleanVocabulary(rawVocab) {
    if (!rawVocab) return '';
    const items = rawVocab.split(/[,;\r\n]+/).map(w => w.trim()).filter(Boolean);
    const seenEng = new Set();
    const clean = [];
    for (const item of items) {
      const head = (item.split(/[-—–:]/)[0] || '').trim().toLowerCase();
      if (/^(my|your|his|her|its|our|their|i|you|he|she|it|we|they)$/i.test(head)) continue;
      if (head && !seenEng.has(head)) {
        seenEng.add(head);
        clean.push(item);
      }
    }
    return clean.slice(0, 10).join(', ');
  },

  pluralizeLessons(count) {
    const c = Math.abs(Number(count) || 0);
    const rem100 = c % 100;
    const rem10 = c % 10;
    if (rem100 >= 11 && rem100 <= 19) return `${c} уроков`;
    if (rem10 === 1) return `${c} урок`;
    if (rem10 >= 2 && rem10 <= 4) return `${c} урока`;
    return `${c} уроков`;
  },

  formatStudentNameWith(name = '') {
    if (!name) return 'учеником';
    const trimmed = name.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length === 2) {
      let [first, last] = parts;
      if (first.endsWith('я')) first = first.slice(0, -1) + 'ей';
      else if (first.endsWith('а')) first = first.slice(0, -1) + 'ой';
      else if (/[бвгджзклмнпрстфхцчшщ]$/i.test(first)) first = first + 'ом';
      else if (first.endsWith('й')) first = first.slice(0, -1) + 'ем';

      if (last.endsWith('а')) last = last.slice(0, -1) + 'ой';
      else if (last.endsWith('ов') || last.endsWith('ев') || last.endsWith('ин') || last.endsWith('ын')) last = last + 'ым';
      else if (last.endsWith('ий') || last.endsWith('ый')) last = last.slice(0, -2) + 'ым';
      return first + ' ' + last;
    }
    let f = trimmed;
    if (f.endsWith('я')) return f.slice(0, -1) + 'ей';
    if (f.endsWith('а')) return f.slice(0, -1) + 'ой';
    if (/[бвгджзклмнпрстфхцчшщ]$/i.test(f)) return f + 'ом';
    if (f.endsWith('й')) return f.slice(0, -1) + 'ем';
    return trimmed;
  },

  formatTelegramPreviewHtml(text) {
    if (!text) return '';
    let html = this.escapeHtml(text);
    html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    html = html.replace(/\*(.*?)\*/g, '<b>$1</b>');
    html = html.replace(/_([^_]+)_/g, '<i>$1</i>');
    html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 4px;border-radius:4px;font-family:monospace;font-size:11px;">$1</code>');
    html = html.replace(/\n/g, '<br>');
    return html;
  },

  renderTelegramPreviewBubble({
    type = 'student',
    recipientName = '',
    topic = '',
    cleanHw = '',
    vocab = '',
    cards = [],
    streak = 0,
    customReportText = ''
  }) {
    const timeNow = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    if (type === 'parent') {
      const parentBody = customReportText || `Здравствуйте! 👋\nСегодня провели занятие по английскому с *${recipientName}*.\n\n📚 *Тема урока:* ${topic || 'Практика'}\n${vocab ? `🔤 *Слова урока:* ${vocab}\n` : ''}${cleanHw ? `📌 *Домашнее задание:* ${cleanHw}\n` : ''}🔥 *Серия занятий:* ${streak || 0} ДЗ подряд!\nСпасибо за поддержку! 🌟`;
      return `
        <div style="background:#18222d;border-radius:12px;padding:12px;color:#e1e3e6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.45;box-shadow:0 4px 12px rgba(0,0,0,0.3);max-width:100%;">
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px;margin-bottom:10px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#8b5cf6,#a855f7);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;">👨‍👩‍👧</div>
              <div>
                <div style="font-weight:700;color:#fff;font-size:12px;line-height:1.2;">Репетитор Бот</div>
                <div style="font-size:10px;color:#c084fc;">@gor_pavlovskiy_bot • отчёт родителю</div>
              </div>
            </div>
            <span style="font-size:10px;padding:2px 8px;border-radius:10px;background:rgba(168,85,247,0.15);color:#c084fc;font-weight:600;">📱 Telegram родителя</span>
          </div>

          <div style="background:#212d3b;border-radius:12px 12px 12px 2px;padding:12px 14px;border:1px solid rgba(255,255,255,0.06);">
            <div style="color:#f1f5f9;white-space:pre-wrap;">${this.formatTelegramPreviewHtml(parentBody)}</div>
            <div style="text-align:right;font-size:10px;color:#64748b;margin-top:6px;">${timeNow} ✓✓</div>
          </div>

          <div style="margin-top:8px;display:flex;flex-direction:column;gap:5px;">
            <div style="background:#2e3c4d;border-radius:8px;padding:7px;text-align:center;font-size:11px;font-weight:600;color:#c084fc;cursor:default;">
              📊 Запросить сводный отчёт о прогрессе
            </div>
            <div style="background:#2e3c4d;border-radius:8px;padding:7px;text-align:center;font-size:11px;font-weight:600;color:#c084fc;cursor:default;">
              📚 Посмотреть текущее ДЗ ребёнка
            </div>
          </div>

          <div style="margin-top:10px;padding:6px 10px;border-radius:8px;background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.25);font-size:11px;color:#c084fc;display:flex;align-items:center;gap:6px;">
            <span>👀 <b>Точная копия:</b> При отправке этот же отчёт мгновенно продублируется вам в личку Telegram!</span>
          </div>
        </div>
      `;
    }

    // Default: student view
    return `
      <div style="background:#18222d;border-radius:12px;padding:12px;color:#e1e3e6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.45;box-shadow:0 4px 12px rgba(0,0,0,0.3);max-width:100%;">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px;margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#2563eb,#38bdf8);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;">🤖</div>
            <div>
              <div style="font-weight:700;color:#fff;font-size:12px;line-height:1.2;">Репетитор Бот</div>
              <div style="font-size:10px;color:#38bdf8;">@gor_pavlovskiy_bot • онлайн</div>
            </div>
          </div>
          <span style="font-size:10px;padding:2px 8px;border-radius:10px;background:rgba(56,189,248,0.15);color:#38bdf8;font-weight:600;">📱 Telegram ученика</span>
        </div>

        ${cards && cards.length > 0 ? `
          <div style="margin-bottom:10px;">
            <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;display:flex;align-items:center;gap:4px;">
              <span>🖼 Прикреплённые карточки (${cards.length} шт.):</span>
            </div>
            <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;">
              ${cards.map(c => `
                <div style="width:60px;height:60px;border-radius:6px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);background:#000;flex-shrink:0;">
                  <img src="${c}" style="width:100%;height:100%;object-fit:cover;" />
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div style="background:#212d3b;border-radius:12px 12px 12px 2px;padding:12px 14px;border:1px solid rgba(255,255,255,0.06);">
          <div style="font-weight:700;color:#60a5fa;margin-bottom:4px;">🇬🇧 Привет, ${this.escapeHtml(recipientName || 'Ученик')}!</div>
          <div style="color:#cbd5e1;margin-bottom:10px;font-size:12px;">Итоги нашего урока и домашнее задание на следующий раз:</div>

          ${topic ? `<div style="margin-bottom:6px;">📚 <b>Тема:</b> <span style="color:#f8fafc;">${this.escapeHtml(topic)}</span></div>` : ''}
          ${vocab ? `<div style="margin-bottom:6px;">🔤 <b>Полезные слова (Vocabulary):</b> <span style="color:#cbd5e1;">${this.escapeHtml(vocab)}</span></div>` : ''}

          ${cleanHw ? `
            <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);">
              <div style="font-weight:700;color:#fbbf24;margin-bottom:4px;">📌 Домашнее задание:</div>
              <div style="color:#f1f5f9;white-space:pre-wrap;">${this.formatTelegramPreviewHtml(cleanHw)}</div>
            </div>
          ` : '<div style="color:#94a3b8;font-style:italic;margin-top:6px;">(Текст ДЗ пока не заполнен)</div>'}

          ${cards && cards.length > 0 ? `<div style="margin-top:8px;color:#94a3b8;font-size:11px;">🖼 <b>Прикреплено карточек к уроку:</b> ${cards.length} шт. (отправлены выше)</div>` : ''}
          <div style="margin-top:8px;color:#f97316;font-size:12px;font-weight:600;">🔥 Твоя серия (Streak): ${streak || 0} ДЗ подряд без пропусков!</div>

          <div style="margin-top:10px;font-size:11px;color:#94a3b8;font-style:italic;">Когда выполнишь — нажми кнопку ниже, пришли фото тетрадки или напиши ответ! 💪</div>
          
          <div style="text-align:right;font-size:10px;color:#64748b;margin-top:4px;">${timeNow} ✓✓</div>
        </div>

        <div style="margin-top:8px;display:flex;flex-direction:column;gap:5px;">
          <div style="background:#2e3c4d;border-radius:8px;padding:7px;text-align:center;font-size:11px;font-weight:600;color:#fff;cursor:default;">
            🔒 Сдать ДЗ (0% — пришли 📸 фото тетради!)
          </div>
          <div style="display:flex;gap:5px;">
            <div style="flex:1;background:#2e3c4d;border-radius:8px;padding:7px;text-align:center;font-size:11px;color:#93c5fd;cursor:default;">📖 Правило урока</div>
            <div style="flex:1;background:#2e3c4d;border-radius:8px;padding:7px;text-align:center;font-size:11px;color:#93c5fd;cursor:default;">🔤 5 слов урока</div>
          </div>
          <div style="display:flex;gap:5px;">
            <div style="flex:1;background:#2e3c4d;border-radius:8px;padding:7px;text-align:center;font-size:11px;color:#93c5fd;cursor:default;">📝 Тестик по уроку</div>
            <div style="flex:1;background:#2e3c4d;border-radius:8px;padding:7px;text-align:center;font-size:11px;color:#93c5fd;cursor:default;">🃏 Флеш-карточки</div>
          </div>
          <div style="display:flex;gap:5px;">
            <div style="flex:1;background:#2e3c4d;border-radius:8px;padding:7px;text-align:center;font-size:11px;color:#93c5fd;cursor:default;">🎤 Голосовой челлендж</div>
            <div style="flex:1;background:#2e3c4d;border-radius:8px;padding:7px;text-align:center;font-size:11px;color:#93c5fd;cursor:default;">🎮 Мини-игра</div>
          </div>
          <div style="display:flex;gap:5px;">
            <div style="flex:1;background:#2e3c4d;border-radius:8px;padding:7px;text-align:center;font-size:11px;color:#93c5fd;cursor:default;">🛡️ Нововведения и Щит</div>
            <div style="flex:1;background:#2e3c4d;border-radius:8px;padding:7px;text-align:center;font-size:11px;color:#93c5fd;cursor:default;">🏆 Паспорт прогресса</div>
          </div>
        </div>

        <div style="margin-top:10px;padding:6px 10px;border-radius:8px;background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.25);font-size:11px;color:#93c5fd;display:flex;align-items:center;gap:6px;">
          <span>👀 <b>Точная копия:</b> При отправке этот же пост с карточками и кнопками продублируется вам в личку Telegram!</span>
        </div>
      </div>
    `;
  },

  updateLessonModalTgPreview() {
    const container = document.getElementById('ls-tg-preview-box');
    if (!container) return;
    const studentId = document.getElementById('ls-student')?.value;
    const st = this.students.find(s => s.id === studentId) || { name: 'Ученик' };
    const topic = document.getElementById('ls-topic')?.value || '';
    const hwText = document.getElementById('ls-homework')?.value || '';
    const dossier = this.parseStudentDossier(st);
    container.innerHTML = this.renderTelegramPreviewBubble({
      type: 'student',
      recipientName: st.name,
      topic: topic,
      cleanHw: this.cleanHomeworkText(hwText),
      vocab: dossier.vocab || '',
      cards: this.attachedCards || [],
      streak: dossier.streak || 0
    });
  },

  compileStudentMemory(studentId, lessonDate = null, excludeLessonId = null) {
    const st = this.students.find(s => s.id === studentId);
    const dossier = st ? this.parseStudentDossier(st) : {};
    const history = this.getStudentLessonHistory(studentId, lessonDate, excludeLessonId, null);
    const prevLesson = history[0] || null;

    // 1. Все проведённые уроки ученика за всё время (без лимитов!) для общей копилки знаний
    const allStudentConducted = (this.lessons || [])
      .filter(l => l.student_id === studentId && l.status === 'Проведен')
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const vocabSet = new Map();
    if (dossier.vocab) {
      for (const item of dossier.vocab.split(/[,;\n]+/)) {
        const t = item.trim();
        if (!t) continue;
        const k = t.split(/[—–\-:]/)[0].trim().toLowerCase();
        if (k && k.length > 1) vocabSet.set(k, t);
      }
    }

    const detectedWorlds = new Set();
    if (dossier.interests) detectedWorlds.add(dossier.interests.trim());

    const detectedUnits = new Set();
    if (dossier.unit) detectedUnits.add(dossier.unit.trim());

    const errorNotesList = [];
    if (dossier.errors) errorNotesList.push(dossier.errors.trim());

    // Вытаскиваем [РАЗМИНКА_ПО_ОШИБКАМ_ДЗ] из заметок досье (куда бот пишет разбор ошибок ДЗ)
    if (dossier.notes) {
      const warmupMatch = dossier.notes.match(/\[РАЗМИНКА_ПО_ОШИБКАМ_ДЗ\]:\s*([\s\S]*)/i);
      if (warmupMatch && warmupMatch[1].trim()) {
        const wText = warmupMatch[1].trim();
        // Не дублируем отбивку про фото условия
        if (!wText.includes('вижу только условие задачи')) {
          errorNotesList.push(`По прошлому ДЗ в боте: ${wText.slice(0, 260)}`);
        }
      } else if (dossier.notes.trim() && !dossier.notes.includes('вижу только условие задачи')) {
        errorNotesList.push(dossier.notes.trim().slice(0, 220));
      }
    }

    const formatLessonDetails = (ls) => {
      if (!ls) return null;
      const hwRaw = ls.homework || '';
      const presMatch = hwRaw.match(/\[ПРЕЗЕНТАЦИЯ_?ТЕКСТ\]:([\s\S]*?)(?:\[\/?\s*ПРЕЗЕНТАЦИЯ_?ТЕКСТ\s*\]|(?=\n\[|$))/i);
      const presText = presMatch ? presMatch[1].trim() : '';
      const scenMatch = hwRaw.match(/\[СЦЕНАРИЙ_?УРОКА\]:([\s\S]*?)\[\/?\s*СЦЕНАРИЙ_?УРОКА\s*\]/i);
      const scenText = scenMatch ? scenMatch[1].trim() : '';
      const debriefMatch = hwRaw.match(/\[ДЕБРИФИНГ\]:([\s\S]*?)\[\/ДЕБРИФИНГ\]/i);
      const debriefText = debriefMatch ? debriefMatch[1].trim() : '';
      const fileMatch = hwRaw.match(/\[ПРЕЗЕНТАЦИЯ_?ФАЙЛ\]:([^\n\[]+)/i);
      const fileName = fileMatch ? fileMatch[1].trim() : '';

      const essence = this.analyzePresentationEssence(presText, scenText, fileName, st?.name);

      // Если тема урока в базе была сырым именем файла или пустой, берём умную тему из сути слайдов/конспекта
      let smartTopic = (ls.topic || '').trim();
      const looksRaw = !smartTopic || smartTopic === 'Present Perfect Mission' || /\b\d\s+\d\b/.test(smartTopic) || smartTopic.toLowerCase().includes('арина матвей');
      if (looksRaw && (presText || scenText) && essence.topic && essence.topic !== 'Практика английского языка') {
        smartTopic = essence.topic;
      }
      if (!smartTopic) smartTopic = essence.topic || 'Практика английского языка';

      // Статус и прогресс ДЗ (включая раздельный для Арины и Матвея)
      const isChecked = hwRaw.includes('[ДЗ_ПРОВЕРЕНО]');
      const isSubmitted = hwRaw.includes('[ДЗ_СДАНО]');
      const arinaChecked = hwRaw.includes('[ДЗ_ПРОВЕРЕНО_АРИНА]');
      const matveyChecked = hwRaw.includes('[ДЗ_ПРОВЕРЕНО_МАТВЕЙ]');
      const arinaSubmitted = hwRaw.includes('[ДЗ_СДАНО_АРИНА]');
      const matveySubmitted = hwRaw.includes('[ДЗ_СДАНО_МАТВЕЙ]');
      const arinaPct = hwRaw.match(/\[ПРОГРЕСС_АРИНА:(\d+)%\]/)?.[1];
      const matveyPct = hwRaw.match(/\[ПРОГРЕСС_МАТВЕЙ:(\d+)%\]/)?.[1];
      const totalPct = hwRaw.match(/\[ПРОГРЕСС_ДЗ:(\d+)%\]/)?.[1];

      let hwStatusLabel = '';
      const isVoroniny = (st?.name || '').toLowerCase().includes('арина');
      if (isVoroniny && (arinaPct || matveyPct || arinaSubmitted || matveySubmitted || arinaChecked || matveyChecked)) {
        const aStat = arinaChecked ? '✅ проверено' : (arinaSubmitted ? `📬 сдано (${arinaPct || 100}%)` : `${arinaPct || 0}%`);
        const mStat = matveyChecked ? '✅ проверено' : (matveySubmitted ? `📬 сдано (${matveyPct || 100}%)` : `${matveyPct || 0}%`);
        hwStatusLabel = `👧 Арина: ${aStat} • 👦 Матвей: ${mStat}`;
      } else if (isChecked) {
        hwStatusLabel = '✅ ДЗ проверено';
      } else if (isSubmitted) {
        hwStatusLabel = `📬 Сдано в ТГ${totalPct ? ` (${totalPct}%)` : ''}`;
      } else if (totalPct) {
        hwStatusLabel = `⏳ Прогресс в боте: ${totalPct}%`;
      }

      return {
        id: ls.id,
        date: ls.date,
        dateStr: new Date(ls.date).toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk' }),
        rawTopic: ls.topic || '',
        smartTopic,
        grammarPoints: essence.grammarPoints,
        lexThemes: essence.lexThemes,
        vocabList: essence.vocabList,
        worlds: essence.worlds,
        cleanHw: this.cleanHomeworkText(hwRaw),
        debrief: debriefText,
        hasPres: Boolean(presText || fileName || hwRaw.includes('[ПРЕЗЕНТАЦИЯ]')),
        hasScenario: Boolean(scenText),
        isChecked,
        isSubmitted,
        hwStatusLabel
      };
    };

    // Обогащаем общую память по всем урокам ученика
    for (const ls of allStudentConducted) {
      const info = formatLessonDetails(ls);
      if (!info) continue;
      for (const w of info.worlds) detectedWorlds.add(w);
      for (const v of info.vocabList) {
        if (!vocabSet.has(v.en.toLowerCase())) {
          vocabSet.set(v.en.toLowerCase(), v.formatted);
        }
      }
      const uMatch = info.smartTopic.match(/Unit\s*\d+/i);
      if (uMatch && detectedUnits.size === 0) {
        detectedUnits.add(`${uMatch[0]} (${st?.grade || 'программа РБ'})`);
      }
      if (info.debrief && !errorNotesList.includes(info.debrief)) {
        errorNotesList.push(`Итоги (${info.dateStr}): ${info.debrief}`);
      }
      // Если в самой теме урока была записана заметка "На будущее: ..."
      if (info.rawTopic && info.rawTopic.toLowerCase().includes('на будущее:')) {
        const notePart = info.rawTopic.split(/на будущее:/i)[1]?.trim();
        if (notePart) errorNotesList.push(`Заметка с урока ${info.dateStr}: ${notePart}`);
      }
    }

    const detailedHistory = history.map(formatLessonDetails).filter(Boolean);
    const prevDetailed = detailedHistory[0] || null;

    const mergedInterests = Array.from(detectedWorlds).filter(Boolean).join('; ');
    const mergedUnit = Array.from(detectedUnits).filter(Boolean).join('; ');
    const mergedErrors = errorNotesList.filter(Boolean).join(' | ');
    const mergedVocab = Array.from(vocabSet.values()).slice(0, 80).join(', ');

    const aiHistorySummary = detailedHistory.map(h => {
      return `- ${h.dateStr}: Тема "${h.smartTopic}"${h.hwStatusLabel ? ` [${h.hwStatusLabel}]` : ''}${h.debrief ? ` | Заметки: ${h.debrief}` : ''}`;
    }).join('\n');

    return {
      prevLesson,
      prevDetailed,
      historyLessons: history,
      detailedHistory,
      enrichedDossier: {
        ...dossier,
        unit: mergedUnit || dossier.unit || '',
        interests: mergedInterests || dossier.interests || '',
        errors: mergedErrors || dossier.errors || '',
        vocab: mergedVocab || dossier.vocab || ''
      },
      aiHistorySummary
    };
  },

  async syncStudentMemoryToDossier(studentId) {
    const st = this.students.find(s => s.id === studentId);
    if (!st) return;
    const dossier = this.parseStudentDossier(st);
    const mem = this.compileStudentMemory(studentId);
    const enr = mem.enrichedDossier;

    const newSched = this.serializeStudentDossier(
      dossier.schedule,
      enr.interests || dossier.interests,
      enr.errors || dossier.errors,
      enr.vocab || dossier.vocab,
      dossier.notes,
      dossier.perplexity,
      enr.unit || dossier.unit,
      dossier.tgId,
      dossier.tgUser,
      dossier.streak,
      dossier.parentTgId,
      dossier.parentTgUser,
      dossier.lastActive,
      dossier.shields
    );
    await DB.updateStudent(st.id, { schedule: newSched });
    st.schedule = newSched;

    // Также автоматически обновим темы уроков, где стояли сырые имена файлов
    for (const h of mem.detailedHistory) {
      const orig = this.lessons.find(l => l.id === h.id);
      if (orig && h.smartTopic && orig.topic !== h.smartTopic && (orig.topic === 'Present Perfect Mission' || /\b\d\s+\d\b/.test(orig.topic || '') || !(orig.topic || '').trim())) {
        await DB.updateLesson(orig.id, { topic: h.smartTopic }).catch(() => {});
        orig.topic = h.smartTopic;
      }
    }

    UI.toast(`🧠 Память по ученику (${st.name}) синхронизирована и сохранена в досье!`, 'success');
    const curDate = document.getElementById('ls-date')?.value;
    this.renderLessonMemoryBanner(studentId, curDate, this.currentLessonId);
  },

  renderLessonMemoryBanner(studentId, lessonDate = null, excludeLessonId = null) {
    const banner = document.getElementById('ls-memory-banner');
    if (!banner) return;
    const st = this.students.find(s => s.id === studentId);
    if (!st) { banner.innerHTML = ''; return; }

    const exclId = excludeLessonId || this.currentLessonId || null;
    const refDate = lessonDate || document.getElementById('ls-date')?.value || null;
    const mem = this.compileStudentMemory(studentId, refDate, exclId);
    const prev = mem.prevDetailed;
    const enr = mem.enrichedDossier;
    const ebb = this.getEbbinghausLesson(studentId, refDate);

    // Полная цепочка всех прошлых проведённых уроков (без обрезки до 5 штук)
    const historyRows = mem.detailedHistory.map((h, idx) => {
      const isPrev = idx === 0;
      return `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding:4px 6px;border-radius:6px;background:${isPrev ? 'rgba(13,148,136,0.08)' : 'transparent'};border-left:2px solid ${isPrev ? '#0d9488' : 'var(--border-light)'};">
          <div style="flex:1;min-width:0;">
            <span style="font-weight:700;color:${isPrev ? '#0d9488' : 'var(--text-secondary)'};">${h.dateStr}:</span>
            <span style="color:var(--text-primary);font-weight:${isPrev ? '600' : '400'};margin-left:4px;">${this.escapeHtml(h.smartTopic)}</span>
          </div>
          ${h.hwStatusLabel ? `<span style="font-size:10px;white-space:nowrap;padding:1px 6px;border-radius:4px;background:var(--bg-surface);border:1px solid var(--border-light);color:var(--text-secondary);">${this.escapeHtml(h.hwStatusLabel)}</span>` : ''}
        </div>
      `;
    }).join('');

    const cleanHwShort = prev?.cleanHw ? (prev.cleanHw.length > 170 ? prev.cleanHw.slice(0, 170) + '...' : prev.cleanHw) : '';
    const vocabShort = enr.vocab ? (enr.vocab.length > 200 ? enr.vocab.slice(0, 200) + '...' : enr.vocab) : '';

    banner.innerHTML = `
      <div style="padding:12px;border-radius:10px;background:var(--bg-primary);border:1px solid var(--border-light);font-size:12px;display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;border-bottom:1px solid var(--border-light);padding-bottom:6px;">
          <div style="font-weight:700;color:var(--accent);display:flex;align-items:center;gap:6px;font-size:13px;">
            <span>🧠 Память и база знаний по ученику: ${this.escapeHtml(st.name)}</span>
            ${enr.streak ? `<span style="font-size:11px;padding:1px 6px;border-radius:6px;background:rgba(249,115,22,0.12);color:#f97316;">🔥 Стрик: ${enr.streak}</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            ${prev ? `<span style="font-size:11px;color:var(--text-muted);font-weight:600;">Предыдущий урок: ${prev.dateStr}</span>` : ''}
            <button type="button" class="btn btn-secondary btn-xs" style="font-size:10px;padding:2px 7px;color:#0d9488;border-color:rgba(13,148,136,0.35);" onclick="TutoringPage.syncStudentMemoryToDossier('${studentId}')" title="Автоматически сохранить все распознанные слова, темы и ошибки из прошлых уроков в карточку ученика">
              💾 Запомнить всё в досье
            </button>
          </div>
        </div>

        ${prev ? `
          <div style="display:flex;flex-direction:column;gap:4px;">
            <div>⏪ <b>Прошлая тема (${prev.dateStr}):</b> <span style="color:var(--text-primary);font-weight:600;">${this.escapeHtml(prev.smartTopic)}</span></div>
            ${prev.hwStatusLabel ? `<div>📊 <b>Статус прошлого ДЗ:</b> <span style="font-weight:600;color:#0d9488;">${this.escapeHtml(prev.hwStatusLabel)}</span> ${!prev.isChecked ? `<button type="button" class="btn btn-secondary btn-xs" style="font-size:10px;padding:1px 6px;margin-left:6px;" onclick="TutoringPage.markPrevHwChecked('${prev.id}').then(()=>TutoringPage.renderLessonMemoryBanner('${studentId}', '${refDate || ''}', '${exclId || ''}'))">✅ Отметить проверенным</button>` : ''}</div>` : ''}
            ${cleanHwShort ? `<div style="color:var(--text-secondary);font-size:11px;">📌 <b>Задавали на дом:</b> ${this.escapeHtml(cleanHwShort)}</div>` : ''}
          </div>
        ` : '<div style="color:var(--text-muted);">Предыдущих проведённых уроков до этой даты пока нет</div>'}

        ${mem.detailedHistory.length > 0 ? `
          <div style="margin-top:2px;">
            <div style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:4px;">📚 Полная хронология проведённых уроков (всего в памяти: ${mem.detailedHistory.length}):</div>
            <div style="display:flex;flex-direction:column;gap:3px;max-height:155px;overflow-y:auto;padding-right:4px;">${historyRows}</div>
          </div>
        ` : ''}

        <div style="display:flex;flex-direction:column;gap:4px;padding-top:4px;border-top:1px dashed var(--border-light);">
          ${enr.errors ? `<div style="color:#d97706;">⚠️ <b>Выводы, ошибки и фокус внимания:</b> <span style="color:var(--text-primary);">${this.escapeHtml(enr.errors)}</span></div>` : ''}
          ${ebb ? `<div style="color:#0d9488;font-weight:600;">🔄 <b>Кривая Эббингауза (повторить тему ~2 нед. назад, ${new Date(ebb.date).toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk' })}):</b> ${this.escapeHtml(ebb.topic)}</div>` : ''}
          ${enr.interests ? `<div>🎯 <b>Контекст и интересы:</b> ${this.escapeHtml(enr.interests)}</div>` : ''}
          ${enr.unit ? `<div>📖 <b>Учебник / Программа:</b> ${this.escapeHtml(enr.unit)}</div>` : ''}
          ${vocabShort ? `<div style="font-size:11px;color:var(--text-secondary);">🔤 <b>Активный словарь (из уроков и презентаций):</b> ${this.escapeHtml(vocabShort)}</div>` : ''}
        </div>
      </div>
    `;
  },

  async generateMonthlyReport(studentId) {
    UI.toast('Сверяю данные и формирую ИИ-отчёт...', 'info');
    await this.load();
    const st = this.students.find(s => s.id === studentId);
    if (!st) return;
    const dossier = this.parseStudentDossier(st);
    const stLessons = (this.lessons.filter(l => l.student_id === studentId && l.status === 'Проведен') || []).map(l => ({
      ...l,
      _rawHomework: l.homework || '',
      homework: this.cleanHomeworkText(l.homework)
    }));
    try {
      const report = await Gemini.generateTutoringAI('monthly_report', { name: st.name, grade: st.grade, ...dossier }, {}, stLessons[0], stLessons);
      try { await navigator.clipboard.writeText(report); } catch (e) {}

      const modal = document.getElementById('report-modal');
      const title = document.getElementById('report-modal-title');
      const statusDiv = document.getElementById('report-modal-status');
      const textarea = document.getElementById('report-modal-text');
      const copyBtn = document.getElementById('report-modal-copy');
      const sendMeBtn = document.getElementById('report-modal-send-me');
      const sendParentBtn = document.getElementById('report-modal-send-parent');
      const closeBtn = document.getElementById('report-modal-close');

      title.innerHTML = `<i data-lucide="bar-chart-2"></i> Отчёт об успеваемости: ${this.escapeHtml(st.name)}`;
      textarea.value = report;

      if (dossier.parentTgId) {
        statusDiv.style.background = 'rgba(34, 197, 94, 0.12)';
        statusDiv.style.border = '1px solid rgba(34, 197, 94, 0.35)';
        statusDiv.style.color = 'var(--text-primary)';
        statusDiv.innerHTML = `🟢 <b>Родитель подключён к ТГ-боту</b> (${dossier.parentTgUser || 'ID: ' + dossier.parentTgId})! Текст скопирован в буфер обмена. Вы можете отправить его родителю в один клик:`;
        sendParentBtn.disabled = false;
        sendParentBtn.style.opacity = '1';
        sendParentBtn.innerHTML = `<i data-lucide="send" style="width:14px;height:14px;"></i> Отправить родителю в ТГ`;
        sendParentBtn.onclick = async () => {
          await this.sendCustomReportToParentTelegram(studentId, textarea.value.trim());
          modal.classList.add('hidden');
        };
      } else {
        statusDiv.style.background = 'rgba(234, 179, 8, 0.12)';
        statusDiv.style.border = '1px solid rgba(234, 179, 8, 0.35)';
        statusDiv.style.color = 'var(--text-primary)';
        statusDiv.innerHTML = `⚠️ <b>Родитель ещё не подключён к боту.</b> Текст отчёта уже в буфере обмена (Ctrl+V). Перешлите родителю ссылку-приглашение:`;
        sendParentBtn.disabled = false;
        sendParentBtn.style.opacity = '1';
        sendParentBtn.innerHTML = `🔗 Скопировать ссылку родителю`;
        sendParentBtn.onclick = async () => {
          await this.copyParentBotInvite(studentId);
        };
      }

      sendMeBtn.onclick = async () => {
        await this.sendCustomReportToTeacherTelegram(studentId, textarea.value.trim());
        modal.classList.add('hidden');
      };

      copyBtn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(textarea.value.trim());
          UI.toast('Текст отчёта скопирован в буфер!', 'success');
        } catch (e) {
          prompt('Скопируйте текст:', textarea.value.trim());
        }
      };

      closeBtn.onclick = () => modal.classList.add('hidden');
      modal.onclick = (e) => { if (e.target === modal) modal.classList.add('hidden'); };

      modal.classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    } catch (e) {
      UI.toast('Ошибка генерации отчёта: ' + e.message, 'error');
    }
  },

  async sendCustomReportToParentTelegram(studentId, reportText) {
    const st = this.students.find(s => s.id === studentId);
    if (!st) return;
    const dossier = this.parseStudentDossier(st);
    if (!dossier.parentTgId) {
      UI.toast(`Родитель ученика ${st.name} ещё не подключился к боту!`, 'warning');
      await this.copyParentBotInvite(studentId);
      return;
    }
    let ls = this.lessons.find(l => l.student_id === studentId && l.status === 'Проведен');
    if (!ls) ls = this.lessons.find(l => l.student_id === studentId);
    if (!ls) {
      ls = await DB.createLesson({
        student_id: studentId,
        date: new Date().toISOString(),
        topic: 'Отчёт об успеваемости',
        status: 'Проведен',
        paid: true
      });
    }
    const cleanHw = (ls.homework || '').replace('[ОТПРАВИТЬ_РОДИТЕЛЮ_В_ТГ]', '').replace(/\[КАСТОМНЫЙ_ОТЧЕТ\]:[\s\S]*?\[\/КАСТОМНЫЙ_ОТЧЕТ\]/, '').trim();
    const newHw = `${cleanHw}\n[КАСТОМНЫЙ_ОТЧЕТ]:\n${reportText}\n[/КАСТОМНЫЙ_ОТЧЕТ] [ОТПРАВИТЬ_РОДИТЕЛЮ_В_ТГ]`.trim();
    await DB.updateLesson(ls.id, { homework: newHw });
    UI.toast(`🚀 Отчёт отправляется родителю (${st.name}) в Telegram! Копия также придёт вам в бот.`, 'success');
  },

  async sendCustomReportToTeacherTelegram(studentId, reportText) {
    const st = this.students.find(s => s.id === studentId);
    let ls = this.lessons.find(l => l.student_id === studentId && l.status === 'Проведен');
    if (!ls) ls = this.lessons.find(l => l.student_id === studentId);
    if (!ls) {
      ls = await DB.createLesson({
        student_id: studentId,
        date: new Date().toISOString(),
        topic: 'Отчёт об успеваемости',
        status: 'Проведен',
        paid: true
      });
    }
    const cleanHw = (ls.homework || '').replace('[ОТПРАВИТЬ_УЧИТЕЛЮ_В_ТГ]', '').replace(/\[ОТПРАВИТЬ_УЧИТЕЛЮ_В_ТГ\]:[\s\S]*?\[\/ОТПРАВИТЬ_УЧИТЕЛЮ_В_ТГ\]/, '').trim();
    const newHw = `${cleanHw}\n[ОТПРАВИТЬ_УЧИТЕЛЮ_В_ТГ]:\n${reportText}\n[/ОТПРАВИТЬ_УЧИТЕЛЮ_В_ТГ]`.trim();
    await DB.updateLesson(ls.id, { homework: newHw });
    UI.toast(`📲 Отчёт отправляется в ваш Telegram бот...`, 'success');
  },

  async paySingleLesson(lessonId) {
    const ls = this.lessons.find(l => l.id === lessonId);
    if (!ls) return;
    const st = this.students.find(s => s.id === ls.student_id);
    const price = this.getLessonPrice(ls, st);
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
    const mem = this.compileStudentMemory(studentId, ls?.date, ls?.id);
    const enr = mem.enrichedDossier;
    const prev = mem.prevDetailed;
    const ebb = this.getEbbinghausLesson(studentId, ls?.date);
    const modalTopic = (!document.getElementById('lesson-modal')?.classList.contains('hidden')) ? (document.getElementById('ls-topic')?.value?.trim() || '') : '';
    const todayTopic = customTopic || modalTopic || ls?.topic || 'Продолжение по программе + отработка лексики и говорения';

    return [
      `Привет! Готовим и проводим интерактивный урок английского языка.`,
      `👤 Ученик: ${st.name} (${st.grade || 'уровень не указан'})`,
      enr.unit ? `📖 Учебник / Программа: ${enr.unit}` : '',
      enr.interests ? `🎯 Интересы и хобби ученика (используй их во всех примерах и текстах!): ${enr.interests}` : '',
      enr.errors ? `⚠️ Типичные ошибки ученика и выводы по прошлым урокам (включи ловушки на эти правила!): ${enr.errors}` : '',
      enr.vocab ? `📚 Активный словарь на отработку: ${enr.vocab}` : '',
      prev ? `⏪ Прошлый урок (${prev.dateStr}): Тема "${prev.smartTopic}"${prev.cleanHw ? `, Заданное ДЗ: "${prev.cleanHw.slice(0, 300)}"` : ''}${prev.hwStatusLabel ? ` (${prev.hwStatusLabel})` : ''}` : '',
      mem.aiHistorySummary ? `📚 История последних проведённых уроков:\n${mem.aiHistorySummary}` : '',
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
      const scenEl = document.getElementById('ls-scenario');
      if (scenEl) scenEl.value = rawText.trim();
      if (parsed.new_vocab) {
        const dossier = this.parseStudentDossier(st);
        const existingVocab = dossier.vocab ? `${dossier.vocab}, ${parsed.new_vocab}` : parsed.new_vocab;
        const newSchedule = this.serializeStudentDossier(dossier.schedule, dossier.interests, dossier.errors, existingVocab, dossier.notes, dossier.perplexity, dossier.unit, dossier.tgId, dossier.tgUser, dossier.streak, dossier.parentTgId, dossier.parentTgUser, dossier.lastActive, dossier.shields);
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
    const rawHwSource = (!document.getElementById('lesson-modal')?.classList.contains('hidden') && document.getElementById('ls-homework')?.value)
      ? document.getElementById('ls-homework').value
      : (ls?.homework || '');
    const hwVal = this.cleanHomeworkText(rawHwSource);

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

  async copyStudentBotInvite(studentId) {
    const st = this.students.find(s => s.id === studentId);
    if (!st) return;
    let botUser = 'gor_pavlovskiy_bot';
    try {
      const settings = await DB.getSettings();
      botUser = settings?.context?.bot_username || 'gor_pavlovskiy_bot';
    } catch (e) {}
    if (!botUser) {
      botUser = prompt('Введите @username вашего Telegram-бота (без @, один раз):', '') || '';
      botUser = botUser.replace('@', '').trim();
    }
    if (!botUser) return;
    const link = `https://t.me/${botUser}?start=st_${st.id}`;
    const inviteText = `Привет! 👋 Подключись, пожалуйста, к моему боту по английскому языку (нажми Start / Запустить) — туда будет автоматически приходить домашка, слова урока и напоминалки:\n${link}`;
    try {
      await navigator.clipboard.writeText(inviteText);
      UI.toast(`🔗 Приглашение для ${st.name} скопировано в буфер обмена! Отправь его ученику в ТГ.`, 'success');
    } catch (e) {
      prompt('Скопируйте приглашение для ученика:', inviteText);
    }
  },

  async sendHwToStudentTelegram(studentId, lessonId = null) {
    const st = this.students.find(s => s.id === studentId);
    if (!st) return UI.toast('Выберите ученика', 'warning');
    const dossier = this.parseStudentDossier(st);

    if (!dossier.tgId && !dossier.tgUser) {
      UI.toast(`Ученик ${st.name} ещё не подключён к ТГ-боту — копирую ссылку-приглашение!`, 'info');
      await this.copyStudentBotInvite(studentId);
      return;
    }

    let ls = lessonId ? this.lessons.find(l => l.id === lessonId) : null;
    if (!ls) ls = this.getPrevConductedLesson(studentId);
    if (!ls) ls = this.lessons.find(l => l.student_id === studentId);

    // Open Homework Dispatcher Modal
    this.openHwDispatcherModal(st, ls);
  },

  dispatcherCards: [],

  openHwDispatcherModal(st, ls) {
    const modal = document.getElementById('hw-dispatcher-modal');
    if (!modal) return;
    const dossier = this.parseStudentDossier(st);

    document.getElementById('hw-disp-title').innerHTML = `<i data-lucide="send"></i> Отправка ДЗ и материалов: ${this.escapeHtml(st.name)}`;
    
    const statusBox = document.getElementById('hw-disp-status');
    if (dossier.tgId) {
      statusBox.style.background = 'rgba(34, 197, 94, 0.12)';
      statusBox.style.border = '1px solid rgba(34, 197, 94, 0.35)';
      statusBox.style.color = 'var(--text-primary)';
      statusBox.innerHTML = `🟢 <b>Ученик подключён к ТГ-боту</b> (${dossier.tgUser || 'ID: ' + dossier.tgId}). Сообщение и карточки придут в личку за 5 секунд!`;
    } else {
      statusBox.style.background = 'rgba(234, 179, 8, 0.12)';
      statusBox.style.border = '1px solid rgba(234, 179, 8, 0.35)';
      statusBox.style.color = 'var(--text-primary)';
      statusBox.innerHTML = `⚠️ <b>Ученик ещё не нажал Start в боте.</b> Откроется диалог с учеником в Telegram для прямой отправки.`;
    }

    // Extract raw homework, cards, and scenario
    const rawHw = ls?.homework || '';
    const cardsMatch = rawHw.match(/\[КАРТОЧКИ_?ДЗ\]:([\s\S]*?)\[\/?\s*КАРТОЧКИ_?ДЗ\s*\]/i);
    this.dispatcherCards = cardsMatch ? cardsMatch[1].trim().split('||').map(s=>s.trim()).filter(Boolean) : [];
    
    const scenMatch = rawHw.match(/\[СЦЕНАРИЙ_?УРОКА\]:([\s\S]*?)\[\/?\s*СЦЕНАРИЙ_?УРОКА\s*\]/i);
    const existingScenario = scenMatch ? scenMatch[1].trim() : '';

    const cleanHwText = this.cleanHomeworkText(rawHw);

    this._currentDispatcherStudent = st;
    document.getElementById('hw-disp-topic').value = ls?.topic || '';
    document.getElementById('hw-disp-text').value = cleanHwText || '';
    document.getElementById('hw-disp-scenario').value = existingScenario || '';
    document.getElementById('hw-disp-send-parent').checked = !!dossier.parentTgId;

    this.renderDispatcherCardsPreview();
    this.updateDispatcherPreview(st);
    this.bindDispatcherModalEvents(st, ls);

    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  },

  updateDispatcherPreview(st) {
    if (!st) st = this._currentDispatcherStudent;
    if (!st) return;
    const container = document.getElementById('hw-disp-live-preview');
    if (!container) return;
    const topic = document.getElementById('hw-disp-topic')?.value || '';
    const hwText = document.getElementById('hw-disp-text')?.value || '';
    const cleanHw = this.cleanHomeworkText(hwText);
    const dossier = this.parseStudentDossier(st);
    const cleanVocab = this.cleanVocabulary(dossier.vocab || '');
    container.innerHTML = this.renderTelegramPreviewBubble({
      type: 'student',
      recipientName: st.name,
      topic: topic,
      cleanHw: cleanHw,
      vocab: cleanVocab,
      cards: this.dispatcherCards || [],
      streak: dossier.streak || 0
    });

    const sendParentChecked = document.getElementById('hw-disp-send-parent')?.checked;
    const parentSection = document.getElementById('hw-disp-parent-preview-section');
    const parentContainer = document.getElementById('hw-disp-parent-live-preview');
    if (parentSection && parentContainer) {
      if (sendParentChecked) {
        parentSection.classList.remove('hidden');
        const stNameWith = this.formatStudentNameWith(st.name);
        const parentDraft = `Здравствуйте! 👋\nСегодня провели занятие по английскому с *${stNameWith}*.\n\n📚 *Тема урока:* ${topic || 'Практика'}\n${cleanVocab ? `🔤 *Слова урока:* ${cleanVocab}\n` : ''}${cleanHw ? `📌 *Домашнее задание:*\n${cleanHw}\n` : ''}\n🔥 *Серия занятий:* ${dossier.streak || 0} ДЗ подряд!\nСпасибо за поддержку! 🌟`;
        parentContainer.innerHTML = this.renderTelegramPreviewBubble({
          type: 'parent',
          recipientName: 'Родитель',
          customReportText: parentDraft
        });
      } else {
        parentSection.classList.add('hidden');
      }
    }
  },

  renderDispatcherCardsPreview() {
    const container = document.getElementById('hw-disp-cards-preview');
    if (!container) return;
    if (!this.dispatcherCards || this.dispatcherCards.length === 0) {
      container.innerHTML = '<span style="font-size:11px;color:var(--text-muted);">Нет прикреплённых карточек</span>';
      return;
    }
    container.innerHTML = this.dispatcherCards.map((card, idx) => `
      <div style="position:relative;width:64px;height:64px;border-radius:8px;overflow:hidden;border:1px solid var(--border-light);background:#000;">
        <img src="${card}" style="width:100%;height:100%;object-fit:cover;cursor:pointer;" onclick="window.open('${card}')" />
        <button type="button" onclick="event.stopPropagation(); TutoringPage.removeDispatcherCard(${idx})" style="position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,0.7);color:#fff;border:none;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;">✕</button>
      </div>
    `).join('');
  },

  removeDispatcherCard(idx) {
    this.dispatcherCards.splice(idx, 1);
    this.renderDispatcherCardsPreview();
    if (this._currentDispatcherStudent) this.updateDispatcherPreview(this._currentDispatcherStudent);
  },

  addDispatcherCard(dataUrl) {
    if (!this.dispatcherCards) this.dispatcherCards = [];
    if (this.dispatcherCards.length >= 10) return UI.toast('Максимум 10 карточек на урок', 'warning');
    this.dispatcherCards.push(dataUrl);
    this.renderDispatcherCardsPreview();
    if (this._currentDispatcherStudent) this.updateDispatcherPreview(this._currentDispatcherStudent);
    UI.toast('Карточка прикреплена!', 'success');
  },

  bindDispatcherModalEvents(st, ls) {
    const modal = document.getElementById('hw-dispatcher-modal');
    const closeBtn = document.getElementById('hw-disp-close');
    const cancelBtn = document.getElementById('hw-disp-btn-cancel');
    const sendBtn = document.getElementById('hw-disp-btn-send');
    const fileInput = document.getElementById('hw-disp-file-input');
    const addFileBtn = document.getElementById('hw-disp-btn-add-file');
    const dropzone = document.getElementById('hw-disp-dropzone');
    const genCardsBtn = document.getElementById('hw-disp-btn-gen-cards');
    const importPplxBtn = document.getElementById('hw-disp-btn-import-pplx');
    const aiHwBtn = document.getElementById('hw-disp-btn-ai-hw');
    const topicEl = document.getElementById('hw-disp-topic');
    const textEl = document.getElementById('hw-disp-text');
    const sendParentEl = document.getElementById('hw-disp-send-parent');

    if (topicEl) topicEl.oninput = () => this.updateDispatcherPreview(st);
    if (textEl) textEl.oninput = () => this.updateDispatcherPreview(st);
    if (sendParentEl) sendParentEl.onchange = () => this.updateDispatcherPreview(st);

    closeBtn.onclick = () => modal.classList.add('hidden');
    cancelBtn.onclick = () => modal.classList.add('hidden');

    if (addFileBtn && fileInput) {
      addFileBtn.onclick = () => fileInput.click();
      fileInput.onchange = (e) => {
        const files = Array.from(e.target.files || []);
        files.forEach(f => {
          if (!f.type.startsWith('image/')) return;
          const reader = new FileReader();
          reader.onload = ev => this.addDispatcherCard(ev.target.result);
          reader.readAsDataURL(f);
        });
        fileInput.value = '';
      };
    }

    if (dropzone) {
      dropzone.ondragover = (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--accent)'; };
      dropzone.ondragleave = () => { dropzone.style.borderColor = 'var(--border-light)'; };
      dropzone.ondrop = (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--border-light)';
        const files = Array.from(e.dataTransfer.files || []);
        files.forEach(f => {
          if (!f.type.startsWith('image/')) return;
          const reader = new FileReader();
          reader.onload = ev => this.addDispatcherCard(ev.target.result);
          reader.readAsDataURL(f);
        });
      };
      dropzone.onclick = (e) => {
        if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'IMG') fileInput.click();
      };
    }

    if (!modal._pasteBound) {
      modal._pasteBound = true;
      modal.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (const item of items) {
          if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            const reader = new FileReader();
            reader.onload = ev => this.addDispatcherCard(ev.target.result);
            reader.readAsDataURL(blob);
          }
        }
      });
    }

    if (genCardsBtn) {
      genCardsBtn.onclick = async () => {
        const dossier = this.parseStudentDossier(st);
        const defaultWords = dossier.vocab || 'adventure, challenge, discover, explore, achieve';
        const wordsInput = prompt('Введите слова через запятую для создания PNG-карточек:', defaultWords);
        if (!wordsInput || !wordsInput.trim()) return;
        const words = wordsInput.split(/[,;\r\n]+/).map(w => w.trim()).filter(Boolean).slice(0, 5);
        for (const w of words) {
          const cardPng = await this.renderWordCardCanvas(w);
          this.addDispatcherCard(cardPng);
        }
      };
    }

    if (importPplxBtn) {
      importPplxBtn.onclick = async () => {
        const rawText = prompt(`📥 Вставьте конспект / материалы урока из Perplexity для ${st.name}:`);
        if (!rawText || !rawText.trim()) return;
        try {
          const parsed = await Gemini.parsePerplexityLesson(rawText, st.name);
          if (parsed.topic && !document.getElementById('hw-disp-topic').value) {
            document.getElementById('hw-disp-topic').value = parsed.topic;
          }
          if (parsed.homework && !document.getElementById('hw-disp-text').value) {
            document.getElementById('hw-disp-text').value = parsed.homework;
          }
          document.getElementById('hw-disp-scenario').value = rawText.trim();
          this.updateDispatcherPreview(st);
          UI.toast('Конспект из Perplexity вставлен в материалы урока!', 'success');
        } catch(e) {
          document.getElementById('hw-disp-scenario').value = rawText.trim();
          this.updateDispatcherPreview(st);
          UI.toast('Текст конспекта вставлен в сценарий!', 'info');
        }
      };
    }

    if (aiHwBtn) {
      aiHwBtn.onclick = async () => {
        const topic = document.getElementById('hw-disp-topic').value.trim();
        if (!topic) return UI.toast('Укажите тему урока', 'warning');
        aiHwBtn.disabled = true;
        aiHwBtn.textContent = '⏳ Генерирую...';
        try {
          const dossier = this.parseStudentDossier(st);
          const scenario = document.getElementById('hw-disp-scenario')?.value?.trim() || '';
          const presTextMatch = ls?.homework?.match(/\[ПРЕЗЕНТАЦИЯ_?ТЕКСТ\]:([\s\S]*?)\[\/ПРЕЗЕНТАЦИЯ_?ТЕКСТ\]/i);
          const presText = presTextMatch ? presTextMatch[1].trim() : (this.attachedPresentationText || '');
          const presFileMatch = ls?.homework?.match(/\[ПРЕЗЕНТАЦИЯ\]:([\s\S]*?)\[\/ПРЕЗЕНТАЦИЯ\]/i);
          const presLink = presFileMatch ? presFileMatch[1].trim() : (this.attachedPresentation || '');
          const hw = await Gemini.generateTutoringAI('homework', 
            { name: st.name, grade: st.grade, ...dossier }, 
            { 
              topic, 
              scenario, 
              cards: this.dispatcherCards || [],
              presentation: presLink,
              presentationText: presText
            }, 
            ls
          );
          document.getElementById('hw-disp-text').value = hw;
          try {
            const wsPng = await this.renderHomeworkWorksheetCardCanvas(topic, hw, st.name);
            if (wsPng) {
              if (!this.dispatcherCards) this.dispatcherCards = [];
              if (this._lastDispAutoCard) {
                const oldIdx = this.dispatcherCards.indexOf(this._lastDispAutoCard);
                if (oldIdx !== -1) this.dispatcherCards.splice(oldIdx, 1);
              }
              this._lastDispAutoCard = wsPng;
              this.dispatcherCards.unshift(wsPng);
              this.renderDispatcherCardsPreview(st);
            }
          } catch (ce) {
            console.warn('Dispatcher auto card error:', ce);
          }
          this.updateDispatcherPreview(st);
          UI.toast('ДЗ + PNG-карточка задания сгенерированы!', 'success');
        } catch (e) {
          UI.toast('Ошибка ИИ: ' + e.message, 'error');
        } finally {
          aiHwBtn.disabled = false;
          aiHwBtn.innerHTML = '<i data-lucide="sparkles" style="width:12px;height:12px;"></i> Сгенерировать ИИ';
          if (window.lucide) lucide.createIcons();
        }
      };
    }

    sendBtn.onclick = async () => {
      const topic = document.getElementById('hw-disp-topic').value.trim();
      const hwText = document.getElementById('hw-disp-text').value.trim();
      const cleanHwOnly = this.cleanHomeworkText(hwText);
      const scenarioText = document.getElementById('hw-disp-scenario').value.trim();
      const sendToParent = document.getElementById('hw-disp-send-parent').checked;

      if (!cleanHwOnly && this.dispatcherCards.length === 0) {
        return UI.toast('Напишите текст ДЗ или прикрепите карточки!', 'warning');
      }

      sendBtn.disabled = true;
      sendBtn.textContent = '⏳ Отправляю...';

      try {
        if (cleanHwOnly && (!this.dispatcherCards || this.dispatcherCards.length === 0)) {
          try {
            const autoWsPng = await this.renderHomeworkWorksheetCardCanvas(topic || 'English Lesson', cleanHwOnly, st.name);
            if (autoWsPng) {
              this.dispatcherCards = [autoWsPng];
            }
          } catch (e) {}
        }
        let lessonTarget = ls;
        if (!lessonTarget) {
          lessonTarget = await DB.createLesson({
            student_id: st.id,
            date: new Date().toISOString(),
            topic: topic || 'Английский язык',
            homework: '',
            status: 'Проведен',
            paid: false
          });
          this.lessons.unshift(lessonTarget);
        }

        // Build composite homework string strictly with clean HW
        let compositeHw = cleanHwOnly;
        if (this.dispatcherCards.length > 0) {
          compositeHw += `\n\n[КАРТОЧКИ_ДЗ]:\n${this.dispatcherCards.join('||')}\n[/КАРТОЧКИ_ДЗ]`;
        }
        if (scenarioText) {
          compositeHw += `\n\n[СЦЕНАРИЙ_УРОКА]:\n${scenarioText}\n[/СЦЕНАРИЙ_УРОКА]`;
        } else if (lessonTarget?.homework) {
          const oldScen = lessonTarget.homework.match(/\[СЦЕНАРИЙ_УРОКА\]:([\s\S]*?)\[\/СЦЕНАРИЙ_УРОКА\]/);
          if (oldScen) compositeHw += `\n\n${oldScen[0]}`;
        }

        if (lessonTarget?.homework) {
          const oldDebrief = lessonTarget.homework.match(/\[ДЕБРИФИНГ\]:([\s\S]*?)\[\/ДЕБРИФИНГ\]/);
          if (oldDebrief) compositeHw += `\n\n${oldDebrief[0]}`;
          const oldPresFile = lessonTarget.homework.match(/\[ПРЕЗЕНТАЦИЯ_ФАЙЛ\]:[^\n]*/);
          if (oldPresFile) compositeHw += `\n\n${oldPresFile[0]}`;
          const oldPresText = lessonTarget.homework.match(/\[ПРЕЗЕНТАЦИЯ_ТЕКСТ\]:([\s\S]*?)\[\/ПРЕЗЕНТАЦИЯ_ТЕКСТ\]/);
          if (oldPresText) compositeHw += `\n\n${oldPresText[0]}`;
          const oldPres = lessonTarget.homework.match(/\[ПРЕЗЕНТАЦИЯ\]:([\s\S]*?)\[\/ПРЕЗЕНТАЦИЯ\]/);
          if (oldPres) compositeHw += `\n\n${oldPres[0]}`;
          const oldMat = lessonTarget.homework.match(/\[МАТЕРИАЛЫ\]:[^\n]*/i);
          if (oldMat) compositeHw += `\n\n${oldMat[0]}`;
          const preservedBotMeta = this.extractPreservedBotTags(lessonTarget.homework);
          if (preservedBotMeta.prefixTags.length > 0) {
            compositeHw = `${preservedBotMeta.prefixTags.join(' ')} ${compositeHw}`.trim();
          }
          if (preservedBotMeta.suffixBlocks.length > 0) {
            compositeHw += `\n${preservedBotMeta.suffixBlocks.join('\n')}`;
          }
        }

        compositeHw = `[ОТПРАВИТЬ_В_ТГ] ${compositeHw}`;
        if (sendToParent) {
          const dossier = this.parseStudentDossier(st);
          const cleanVocab = this.cleanVocabulary(dossier.vocab || '');
          const stNameWith = this.formatStudentNameWith(st.name);
          const parentReportDraft = `Здравствуйте! 👋\nСегодня провели занятие по английскому с *${stNameWith}*.\n\n📚 *Тема урока:* ${topic || 'Практика английского'}\n${cleanVocab ? `🔤 *Слова урока:* ${cleanVocab}\n` : ''}${cleanHwOnly ? `📌 *Домашнее задание:*\n${cleanHwOnly}\n` : ''}\n🔥 *Серия занятий:* ${dossier.streak || 0} ДЗ подряд!\nСпасибо за поддержку! 🌟`;
          compositeHw += `\n[ОТЧЕТ_РОДИТЕЛЮ]:\n${parentReportDraft}\n[/ОТЧЕТ_РОДИТЕЛЮ] [ОТПРАВИТЬ_РОДИТЕЛЮ_В_ТГ]`;
        }

        await DB.updateLesson(lessonTarget.id, {
          topic: topic || lessonTarget.topic,
          homework: compositeHw
        });

        // Also update student vocabulary if new words found in scenario
        if (scenarioText) {
          try {
            const dossier = this.parseStudentDossier(st);
            const parsed = await Gemini.parsePerplexityLesson(scenarioText, st.name);
            if (parsed.new_vocab) {
              const updatedVocab = dossier.vocab ? `${dossier.vocab}, ${parsed.new_vocab}` : parsed.new_vocab;
              const newSched = this.serializeStudentDossier(dossier.schedule, dossier.interests, dossier.errors, updatedVocab, dossier.notes, dossier.perplexity, dossier.unit, dossier.tgId, dossier.tgUser, dossier.streak, dossier.parentTgId, dossier.parentTgUser, dossier.lastActive, dossier.shields);
              await DB.updateStudent(st.id, { schedule: newSched });
            }
          } catch(e) {}
        }

        modal.classList.add('hidden');
        UI.toast(`🚀 Домашнее задание отправлено ${st.name} в Telegram! Точная копия сообщения отправлена вам в бот.`, 'success');
        await this.load();
      } catch (err) {
        UI.toast('Ошибка отправки: ' + err.message, 'error');
      } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i data-lucide="send" style="width:14px;height:14px;"></i> Отправить ученику в Telegram';
        if (window.lucide) lucide.createIcons();
      }
    };
  },

  async copyParentBotInvite(studentId) {
    const st = this.students.find(s => s.id === studentId);
    if (!st) return;
    let botUser = 'gor_pavlovskiy_bot';
    try {
      const settings = await DB.getSettings();
      botUser = settings?.context?.bot_username || 'gor_pavlovskiy_bot';
    } catch (e) {}
    if (!botUser) {
      botUser = prompt('Введите @username вашего Telegram-бота (без @, один раз):', '') || '';
      botUser = botUser.replace('@', '').trim();
    }
    if (!botUser) return;
    const link = `https://t.me/${botUser}?start=pr_${st.id}`;
    const inviteText = `Здравствуйте! 👋 Подключитесь, пожалуйста, к электронному дневнику по английскому языку для ${st.name} (нажмите Start / Запустить по ссылке) — туда будут автоматически приходить отчёты после наших уроков, пройденные темы и прогресс:\n${link}`;
    try {
      await navigator.clipboard.writeText(inviteText);
      UI.toast(`👨‍👩‍👧 Ссылка-приглашение для родителя (${st.name}) скопирована в буфер! Отправь её маме/папе в ТГ.`, 'success');
    } catch (e) {
      prompt('Скопируйте приглашение для родителя:', inviteText);
    }
  },

  async sendReportToParentTelegram(studentId, lessonId = null, customReportText = '') {
    [this.students, this.lessons] = await Promise.all([
      DB.getStudents(),
      DB.getLessons()
    ]);
    const st = this.students.find(s => s.id === studentId);
    if (!st) return UI.toast('Выберите ученика', 'warning');
    const dossier = this.parseStudentDossier(st);
    let ls = lessonId ? this.lessons.find(l => l.id === lessonId) : null;
    if (!ls) ls = this.getPrevConductedLesson(studentId);
    const modalOpen = !document.getElementById('lesson-modal')?.classList.contains('hidden');
    const currentHwText = modalOpen ? document.getElementById('ls-homework')?.value?.trim() : '';
    const currentTopicText = modalOpen ? document.getElementById('ls-topic')?.value?.trim() : '';

    const modal = document.getElementById('report-modal');
    const title = document.getElementById('report-modal-title');
    const statusDiv = document.getElementById('report-modal-status');
    const textarea = document.getElementById('report-modal-text');
    const copyBtn = document.getElementById('report-modal-copy');
    const sendMeBtn = document.getElementById('report-modal-send-me');
    const sendParentBtn = document.getElementById('report-modal-send-parent');
    const closeBtn = document.getElementById('report-modal-close');
    const aiGenBtn = document.getElementById('report-modal-btn-ai');

    title.innerHTML = `<i data-lucide="bar-chart-2"></i> Отчёт для родителей: ${this.escapeHtml(st.name)}`;

    if (dossier.parentTgId) {
      statusDiv.style.background = 'rgba(34, 197, 94, 0.12)';
      statusDiv.style.border = '1px solid rgba(34, 197, 94, 0.35)';
      statusDiv.style.color = 'var(--text-primary)';
      statusDiv.innerHTML = `🟢 <b>Родитель подключён к ТГ-боту</b> (${dossier.parentTgUser || 'ID: ' + dossier.parentTgId}). Сообщение уйдёт родителю в Telegram, а копия — вам!`;
      sendParentBtn.disabled = false;
      sendParentBtn.style.opacity = '1';
      sendParentBtn.innerHTML = `<i data-lucide="send" style="width:14px;height:14px;"></i> Отправить родителю в ТГ`;
    } else if (dossier.parentTgUser) {
      statusDiv.style.background = 'rgba(234, 179, 8, 0.12)';
      statusDiv.style.border = '1px solid rgba(234, 179, 8, 0.35)';
      statusDiv.style.color = 'var(--text-primary)';
      statusDiv.innerHTML = `⚠️ <b>Родитель ещё не в боте, но указан @${dossier.parentTgUser.replace('@','')}.</b> Нажав кнопку, вы откроете диалог со скопированным текстом.`;
      sendParentBtn.disabled = false;
      sendParentBtn.style.opacity = '1';
      sendParentBtn.innerHTML = `📲 Открыть чат с родителем`;
    } else {
      statusDiv.style.background = 'rgba(234, 179, 8, 0.12)';
      statusDiv.style.border = '1px solid rgba(234, 179, 8, 0.35)';
      statusDiv.style.color = 'var(--text-primary)';
      statusDiv.innerHTML = `⚠️ <b>Родитель ещё не подключён к боту.</b> Текст отчёта будет скопирован, и вы сможете отправить ссылку-приглашение:`;
      sendParentBtn.disabled = false;
      sendParentBtn.style.opacity = '1';
      sendParentBtn.innerHTML = `🔗 Скопировать ссылку родителю`;
    }

    // Determine report text
    let initialReport = customReportText;
    if (!initialReport) {
      const existingMatch = (ls?.homework || '').match(/\[КАСТОМНЫЙ_ОТЧЕТ\]:([\s\S]*?)\[\/КАСТОМНЫЙ_ОТЧЕТ\]/) || (ls?.homework || '').match(/\[ОТЧЕТ_РОДИТЕЛЮ\]:([\s\S]*?)\[\/ОТЧЕТ_РОДИТЕЛЮ\]/);
      if (existingMatch && existingMatch[1].trim()) {
        initialReport = existingMatch[1].trim();
      }
    }

    if (!initialReport) {
      const topic = currentTopicText || ls?.topic || 'Практика английского языка';
      const hwClean = this.cleanHomeworkText(currentHwText || ls?.homework || '');
      const dateStr = ls?.date ? new Date(ls.date).toLocaleDateString('ru-RU', { timeZone: 'Europe/Minsk', day: 'numeric', month: 'long' }) : 'сегодня';
      initialReport = `Здравствуйте! 👋\nСегодня провели занятие по английскому с *${st.name}* (${dateStr}).\n\n📚 *Тема урока:* ${topic}\n${dossier.vocab ? `🔤 *Слова урока:* ${dossier.vocab}\n` : ''}${hwClean ? `📌 *Домашнее задание:* ${hwClean}\n` : ''}🔥 *Серия занятий (Streak):* ${dossier.streak || 0} ДЗ подряд!\n\nСпасибо за поддержку! 🌟`;
    }

    textarea.value = initialReport;

    const updateReportPreview = () => {
      const prevContainer = document.getElementById('report-modal-live-preview');
      if (prevContainer) {
        prevContainer.innerHTML = this.renderTelegramPreviewBubble({
          type: 'parent',
          recipientName: st.name,
          customReportText: textarea.value
        });
      }
    };

    textarea.oninput = updateReportPreview;
    updateReportPreview();

    if (aiGenBtn) {
      aiGenBtn.onclick = async () => {
        aiGenBtn.disabled = true;
        aiGenBtn.textContent = '⏳ Генерирую...';
        try {
          const topic = currentTopicText || ls?.topic || 'Английский язык';
          const hwClean = this.cleanHomeworkText(currentHwText || ls?.homework || '');
          const newRep = await Gemini.generateTutoringAI('parent_msg', { name: st.name, grade: st.grade, ...dossier }, { topic, homework: hwClean }, ls);
          textarea.value = newRep;
          updateReportPreview();
          UI.toast('Отчёт сгенерирован!', 'success');
        } catch(e) {
          UI.toast('Ошибка ИИ: ' + e.message, 'error');
        } finally {
          aiGenBtn.disabled = false;
          aiGenBtn.innerHTML = '<i data-lucide="sparkles" style="width:12px;height:12px;"></i> Сгенерировать ИИ';
          if (window.lucide) lucide.createIcons();
        }
      };
    }

    sendParentBtn.onclick = async () => {
      const textToSend = textarea.value.trim();
      if (!textToSend) return UI.toast('Текст отчёта пуст', 'warning');

      if (!dossier.parentTgId) {
        if (dossier.parentTgUser) {
          try { await navigator.clipboard.writeText(textToSend); } catch(e){}
          const cleanUser = dossier.parentTgUser.replace('@', '').trim();
          window.open(`https://t.me/${cleanUser}?text=${encodeURIComponent(textToSend)}`, '_blank');
          modal.classList.add('hidden');
          return;
        }
        await this.copyParentBotInvite(studentId);
        modal.classList.add('hidden');
        return;
      }

      await this.sendCustomReportToParentTelegram(studentId, textToSend);
      modal.classList.add('hidden');
    };

    sendMeBtn.onclick = async () => {
      const textToSend = textarea.value.trim();
      if (!textToSend) return UI.toast('Текст отчёта пуст', 'warning');
      await this.sendCustomReportToTeacherTelegram(studentId, textToSend);
      modal.classList.add('hidden');
    };

    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(textarea.value.trim());
        UI.toast('Текст отчёта скопирован в буфер!', 'success');
      } catch (e) {
        prompt('Скопируйте текст:', textarea.value.trim());
      }
    };

    closeBtn.onclick = () => modal.classList.add('hidden');
    modal.onclick = (e) => { if (e.target === modal) modal.classList.add('hidden'); };

    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  },

  attachedCards: [],
  _voiceRec: null,

  attachedPresentation: null,
  attachedPresentationFile: null,
  attachedPresentationName: '',
  attachedPresentationText: '',
  _lastAutoWorksheetCard: null,

  _openIDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('IndexedDB not supported'));
      const req = indexedDB.open('AssistantMediaDB', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async saveLocalFile(key, value) {
    try {
      const db = await this._openIDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('files', 'readwrite');
        if (value === null || value === undefined) {
          tx.objectStore('files').delete(key);
        } else {
          tx.objectStore('files').put(value, key);
        }
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('saveLocalFile error:', e);
      try {
        if (typeof value === 'string' && value.length < 5000000) {
          sessionStorage.setItem(key, value);
        }
      } catch (_) {}
    }
  },

  async getLocalFile(key) {
    try {
      const db = await this._openIDB();
      return new Promise((resolve) => {
        const tx = db.transaction('files', 'readonly');
        const req = tx.objectStore('files').get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      console.warn('getLocalFile error:', e);
      return sessionStorage.getItem(key) || null;
    }
  },

  async extractTextFromPresentationFile(file) {
    if (!file) return '';
    try {
      const name = (file.name || '').toLowerCase();
      if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.csv')) {
        return await file.text();
      }
      if (name.endsWith('.pdf') || file.type === 'application/pdf') {
        // Load pdf.js dynamically if not loaded yet
        if (!window.pdfjsLib) {
          await new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            s.onload = resolve;
            s.onerror = resolve;
            document.head.appendChild(s);
          });
        }
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          const buf = await file.arrayBuffer();
          const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
          let fullText = '';
          const maxPages = Math.min(pdf.numPages, 30);
          for (let p = 1; p <= maxPages; p++) {
            const page = await pdf.getPage(p);
            const content = await page.getTextContent();
            const pageText = content.items.map(it => it.str).join(' ').replace(/\s+/g, ' ').trim();
            if (pageText) fullText += `Слайд ${p}: ${pageText}\n`;
          }
          if (fullText.trim().length > 15) return fullText.trim().slice(0, 15000);
        }
      }

      // PPTX extraction via JSZip (unpacking XML slides cleanly by paragraphs)
      if (name.endsWith('.pptx') || file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
        if (!window.JSZip) {
          await new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            s.onload = resolve;
            s.onerror = resolve;
            document.head.appendChild(s);
          });
        }
        if (window.JSZip) {
          const ab = await file.arrayBuffer();
          const zip = await window.JSZip.loadAsync(ab);
          const slideKeys = Object.keys(zip.files).filter(k => k.startsWith('ppt/slides/slide') && k.endsWith('.xml') && !k.includes('_rels'));
          slideKeys.sort((a, b) => {
            const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || 0, 10);
            const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || 0, 10);
            return numA - numB;
          });

          const slideLines = [];
          for (let i = 0; i < slideKeys.length; i++) {
            const xml = await zip.file(slideKeys[i]).async('text');
            // 1. Parse paragraphs <a:p> so sentences and table cells don't glue together
            const paragraphs = [];
            const pRegex = /<a:p(?:\s+[^>]*)?>([\s\S]*?)<\/a:p>/gi;
            let pm;
            while ((pm = pRegex.exec(xml)) !== null) {
              const pXml = pm[1];
              const runTexts = [];
              const tRegex = /<a:t(?:\s+[^>]*)?>([\s\S]*?)<\/a:t>/gi;
              let tm;
              while ((tm = tRegex.exec(pXml)) !== null) {
                const t = tm[1]
                  .replace(/<[^>]+>/g, '')
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"')
                  .replace(/&apos;/g, "'");
                if (t && !t.trim().startsWith('http://') && !t.trim().startsWith('https://') && !/^gen-dedup/i.test(t.trim())) {
                  runTexts.push(t);
                }
              }
              const pText = runTexts.join('').replace(/\s+/g, ' ').trim();
              if (pText && !/^preencoded\.png$/i.test(pText)) {
                paragraphs.push(pText);
              }
            }

            // Fallback if no <a:p> matched
            if (paragraphs.length === 0) {
              const tRegex = /<a:t(?:\s+[^>]*)?>([\s\S]*?)<\/a:t>/gi;
              let tm;
              while ((tm = tRegex.exec(xml)) !== null) {
                const t = tm[1].replace(/<[^>]+>/g, '').trim();
                if (t && !t.startsWith('http') && !/^gen-dedup/i.test(t)) paragraphs.push(t);
              }
            }

            const bodyText = paragraphs.join(' · ').replace(/\s+/g, ' ').trim();

            // 2. Human descriptions from Gamma exports (only if not already duplicated in bodyText and not a cover-image tag)
            const descrs = (xml.match(/descr="([^"]+)"/g) || [])
              .map(m => m.slice(7, -1).replace(/\s*—\s*cover\b/gi, '').trim())
              .filter(d => d && !/\.(?:png|jpe?g|gif|svg|webp|mp[34])$/i.test(d) && !/^gen-dedup/i.test(d) && !d.includes('<') && !d.startsWith('http') && !/^[a-f0-9_\-]{16,}$/i.test(d) && d.length > 3 && !bodyText.toLowerCase().includes(d.slice(0, 25).toLowerCase()));

            const combined = [...descrs, bodyText].filter(Boolean).join(' · ').replace(/\s+/g, ' ').trim();
            if (combined && !combined.startsWith('preencoded.png')) {
              slideLines.push(`Слайд ${i + 1}: ${combined}`);
            }
          }
          if (slideLines.length > 0) {
            return slideLines.join('\n').slice(0, 15000);
          }
        }
      }
    } catch (e) {
      console.warn('extractTextFromPresentationFile error:', e);
    }
    return '';
  },

  extractVocabFromPresentationAndScenario(presentationText = '', scenarioText = '') {
    const wordsMap = new Map();
    const stopWords = new Set(['word', 'words', 'expression', 'ipa', 'translation', 'example', 'examples', 'model', 'rule', 'step', 'stage', 'slide', 'today', 'mission', 'check', 'stars', 'arina', 'matvey', 'skyrim', 'spore', 'academy', 'library', 'sound', 'police', 'grammar', 'tracker', 'vocabulary', 'unit', 'lesson']);

    const addWord = (en, ipa, ru) => {
      const cleanEn = (en || '').replace(/^[^a-zA-Z]+|[^a-zA-Z\s'-]+$/g, '').replace(/\s+/g, ' ').trim();
      const cleanRu = (ru || '').replace(/^[—–\-:\s·•]+|[—–\-:\s·•]+$/g, '').split(/\s*(?:Примеры|Угадай|Полезно|Не путай|Важно|Слова|Слайд|Этап|·)\b/i)[0].trim();
      if (!cleanEn || cleanEn.length < 2 || cleanEn.length > 28) return;
      if (cleanEn.split(/\s+/).length > 3) return;
      if (stopWords.has(cleanEn.toLowerCase())) return;
      if (!cleanRu || !/[а-яА-ЯёЁ]/.test(cleanRu) || cleanRu.length > 50) return;
      const key = cleanEn.toLowerCase();
      if (!wordsMap.has(key)) {
        wordsMap.set(key, {
          en: cleanEn,
          ipa: (ipa || '').trim(),
          ru: cleanRu,
          formatted: `${cleanEn} — ${cleanRu}`
        });
      }
    };

    const fullSource = `${presentationText || ''}\n${scenarioText || ''}`;

    // 1. Формат слайдов Gamma/PPTX: word /ipa/ перевод (например: ever /ˈevə/ когда-либо)
    const ipaRegex = /\b([a-zA-Z][a-zA-Z'-]*(?:\s+[a-zA-Z][a-zA-Z'-]*)?)\s+\/([^\/\n]{1,28})\/\s+([а-яА-ЯёЁ][а-яА-ЯёЁ\s,;\-—–()]{1,42}?)(?=\s+[a-zA-Z]{2,}(?:\s+[a-zA-Z]+)?\s+\/|\s+(?:Примеры|Угадай|Полезно|Не путай|Важно|Слова|Слайд|Этап|ВЫРАЖЕНИЕ|СЛОВО)|·|\n|$)/g;
    let m;
    while ((m = ipaRegex.exec(fullSource)) !== null) {
      addWord(m[1], m[2], m[3]);
    }

    // 2. Формат таблиц Markdown из Perplexity: | word | /ipa/ | перевод |
    const tableRegex = /\|\s*\*\*?([a-zA-Z][a-zA-Z\s'-]{1,25}?)\*\*?\s*\|\s*(?:[\/\[]([^\/\]|\n]+)[\/\]])?\s*\|\s*([а-яА-ЯёЁ][^|\n]{1,45}?)\s*\|/g;
    while ((m = tableRegex.exec(fullSource)) !== null) {
      addWord(m[1], m[2] || '', m[3]);
    }

    // 3. Списки через тире: word [ipa] — перевод
    const dashRegex = /(?:^|\n|·)\s*(?:\d+\.\s*|[•\-]\s*)?([a-zA-Z][a-zA-Z\s'-]{1,22}?)\s*(?:[\[\/]([^\]\/\n]{1,25})[\]\/])?\s+[—–-]\s+([а-яА-ЯёЁ][^\n·(]{1,40})/g;
    while ((m = dashRegex.exec(fullSource)) !== null) {
      // Отсекаем длинные примеры предложений (если больше 3 английских слов)
      if (m[1].trim().split(/\s+/).length <= 3 && !/^(The|He|She|We|They|It|Has|Have|Did|Do|Does)\b/.test(m[1].trim())) {
        addWord(m[1], m[2] || '', m[3]);
      }
    }

    return Array.from(wordsMap.values());
  },

  analyzePresentationEssence(presentationText = '', scenarioText = '', filename = '', studentName = '') {
    const combined = `${presentationText || ''}\n${scenarioText || ''}`;
    const lower = combined.toLowerCase();

    // 1. Очищаем имя файла от имени ученика без багов с границами кириллицы
    let cleanFile = (filename || '').replace(/\.[^/.]+$/, '').trim();
    const cleanWord = (text, word) => {
      if (!word || word.length < 2) return text;
      const escaped = word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      return text.replace(new RegExp(`(^|[^а-яА-ЯёЁa-zA-Z0-9])${escaped}(?=[^а-яА-ЯёЁa-zA-Z0-9]|$)`, 'gi'), '$1').trim();
    };
    if (studentName) {
      for (const p of studentName.split(/\s+/)) cleanFile = cleanWord(cleanFile, p);
    }
    if (this.students && Array.isArray(this.students)) {
      for (const s of this.students) {
        if (s?.name) {
          for (const p of s.name.split(/\s+/)) cleanFile = cleanWord(cleanFile, p);
        }
      }
    }
    cleanFile = cleanFile
      .replace(/\b20\d{6,12}\b/g, '')
      .replace(/\b\d{1,2}[._]\d{1,2}(?:[._]\d{2,4})?\b/g, '')
      .replace(/\b\d{6,14}\b/g, '')
      .replace(/\b\d+\s*(?:класс|кл)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // 2. Извлекаем Unit и Lesson из имени файла или текста (с поддержкой диапазонов типа 5-6)
    const unitMatch = cleanFile.match(/Unit\s*\d+(?:\s*[·.,:\-_–]?\s*Lesson\s*[\d\-–/]+)?/i) || 
                      combined.match(/Unit\s*\d+(?:\s*[·.,:\-_–]?\s*Lesson\s*[\d\-–/]+)?/i);
    const unitTag = unitMatch ? unitMatch[0].replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim() : '';

    // 3. Извлекаем смысловую тему из названия файла, если она там указана
    let fileTopic = cleanFile;
    if (unitTag) {
      fileTopic = fileTopic.replace(new RegExp(unitTag.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i'), '').trim();
    }
    fileTopic = fileTopic.replace(/^[_\-\s–]+/, '').replace(/[_\-\s–]+$/, '').trim();
    if (fileTopic.length >= 3 && !/^\d+$/.test(fileTopic)) {
      fileTopic = fileTopic.charAt(0).toUpperCase() + fileTopic.slice(1);
    } else {
      fileTopic = '';
    }

    // 4. Распознаём ключевые грамматические темы по сути контента
    const grammarPoints = [];
    if (lower.includes('present perfect continuous') || /\b(?:have|has)\s+been\s+[a-z]{2,}ing\b/i.test(lower) || ((lower.includes('have been') || lower.includes('has been')) && lower.includes('v-ing'))) {
      if (lower.includes('процесс или результат') || lower.includes('has chosen') || lower.includes('present perfect')) {
        grammarPoints.push('Present Perfect Continuous vs Present Perfect (процесс и результат)');
      } else {
        grammarPoints.push('Present Perfect Continuous (длительность: have/has been + V-ing)');
      }
    } else if (lower.includes('present perfect')) {
      const markers = [];
      if (lower.includes('past simple') || (lower.includes('last summer') && lower.includes('have visited'))) markers.push('vs Past Simple');
      if (lower.includes('already') && lower.includes('yet')) markers.push('already/just/yet');
      if (lower.includes('ever') && lower.includes('never')) markers.push('ever/never');
      if (lower.includes('for') && lower.includes('since') && (lower.includes('период') || lower.includes('начальная точка') || lower.includes('for two years') || lower.includes('for, since'))) markers.push('for/since');
      if (lower.includes('been') && lower.includes('gone') && (lower.includes('вернулся') || lower.includes('been to') || lower.includes('gone to'))) markers.push('been/gone');
      const markerSuffix = markers.length > 0 ? `: ${markers.join(', ')}` : ' (результат и опыт)';
      grammarPoints.push(`Present Perfect${markerSuffix}`);
    }

    if (lower.includes('past continuous') || (lower.includes('was') && lower.includes('were') && lower.includes('v-ing'))) {
      if (lower.includes('past simple')) {
        grammarPoints.push('Past Continuous vs Past Simple');
      } else {
        grammarPoints.push('Past Continuous (длительное действие в прошлом)');
      }
    }

    // Present Simple (I / you / we / they / he / she / it) — домашние дела, распорядок дня
    if (lower.includes('present simple') || (lower.includes("don't") && lower.includes('do you') && (lower.includes('every day') || lower.includes('usually') || lower.includes('bed') || lower.includes('teeth')))) {
      if (lower.includes('housework') || lower.includes('home jobs') || lower.includes('дела по дому') || lower.includes('tidy') || cleanFile.toLowerCase().includes('about my day')) {
        grammarPoints.push('Present Simple (I/you/we/they) — Дела по дому');
      } else {
        grammarPoints.push('Present Simple (I / you / we / they)');
      }
    }

    // Притяжательные местоимения — только если это реальная основная грамматическая тема урока
    if ((lower.includes('притяжательн') && (lower.includes('местоимен') || lower.includes('падеж') || lower.includes('чей') || lower.includes('чья'))) || 
        (lower.includes('whose') && lower.includes('possessive') && !lower.includes('present simple'))) {
      grammarPoints.push("Притяжательные местоимения (my, his, her, their) и падеж 's");
    }

    if (lower.includes('too') && lower.includes('enough') && (lower.includes('warm enough') || lower.includes('too heavy') || lower.includes('слишком') || lower.includes('достаточно'))) {
      grammarPoints.push('Конструкции too / enough');
    }

    if (lower.includes('степен') && lower.includes('сравнен') || lower.includes('comparative') || lower.includes('superlative')) {
      grammarPoints.push('Степени сравнения прилагательных');
    }

    if (lower.includes('артикл') && (lower.includes('географ') || lower.includes('озер') || lower.includes('рек') || lower.includes('стран'))) {
      grammarPoints.push('Артикль the с географическими названиями');
    }

    // 5. Распознаём лексические блоки со слайдов ("Лексика: ...", "Слова 1-5: ...")
    const lexThemes = [];
    const lexMatches = combined.matchAll(/Лексика\s*[·:]?\s*([а-яА-ЯёЁa-zA-Z\s,]{3,35}?)(?=\s+Слова|\s+ВЫРАЖЕНИЕ|\s+СЛОВО|·|\n|$)/gi);
    for (const lm of lexMatches) {
      const theme = lm[1].replace(/\bПродолжение\b/gi, '').replace(/\bИгра\b/gi, '').trim();
      if (theme && theme.length > 2 && !lexThemes.includes(theme.toLowerCase())) {
        lexThemes.push(theme);
      }
    }
    if (lexThemes.length === 0) {
      if (lower.includes('housework') || lower.includes('home jobs') || lower.includes('дела по дому') || lower.includes('wash the dishes') || lower.includes('tidy my room') || cleanFile.toLowerCase().includes('about my day')) {
        lexThemes.push('дела по дому (Home jobs: housework, tidy room, wash dishes)');
      } else if (lower.includes('fitting room') || lower.includes('try on') || lower.includes('discount') || lower.includes('customer')) {
        lexThemes.push('покупки и магазин (sale, customer, try on, fitting room)');
      } else if (lower.includes('complete') && lower.includes('achieve') && lower.includes('experience')) {
        lexThemes.push('достижения и опыт (complete, achieve, find, lose)');
      } else if (lower.includes('endangered') || lower.includes('wildlife') || lower.includes('bison')) {
        lexThemes.push('природа и животные (wildlife, endangered)');
      } else if (lower.includes('get up') && lower.includes('brush my teeth')) {
        lexThemes.push('распорядок дня (My Morning)');
      }
    }

    // 6. Извлекаем слова и игровые миры/интересы
    const vocabList = this.extractVocabFromPresentationAndScenario(presentationText, scenarioText);
    const worlds = [];
    if (lower.includes('skyrim')) worlds.push('Арина — волшебница мира Skyrim');
    if (lower.includes('spore')) worlds.push('Матвей — исследователь мира Spore');
    if (lower.includes('genshin')) worlds.push('Genshin Impact');

    // 7. Ищем смысловой подзаголовок урока на Слайде 1–2
    let subtitle = '';
    const quoteMatch = combined.match(/«([^»]{6,65})»/) || combined.match(/(?:Что уже сделано[^?.!]*\?|Распродажа Академии:\s*[^?.!]*\?)/i);
    if (quoteMatch) {
      subtitle = (quoteMatch[1] || quoteMatch[0]).trim();
    }

    // 8. Собираем умную тему урока по СУТИ И КОНТЕКСТУ (приоритет смыслу из файла и слайдов!)
    let smartTopic = '';
    if (fileTopic) {
      smartTopic = fileTopic;
      if (grammarPoints.length > 0 && !smartTopic.toLowerCase().includes(grammarPoints[0].toLowerCase().slice(0, 10))) {
        smartTopic += ` (${grammarPoints[0]})`;
      } else if (lexThemes.length > 0 && !smartTopic.toLowerCase().includes('housework') && !smartTopic.toLowerCase().includes('дел')) {
        smartTopic += ` + Лексика: ${lexThemes[0]}`;
      }
      if (unitTag && !smartTopic.toLowerCase().includes('unit')) {
        smartTopic = `${unitTag}: ${smartTopic}`;
      }
    } else if (grammarPoints.length > 0) {
      smartTopic = grammarPoints[0];
      if (lexThemes.length > 0 && !smartTopic.toLowerCase().includes(lexThemes[0].toLowerCase())) {
        smartTopic += ` + Лексика: ${lexThemes.slice(0, 2).join(', ')}`;
      } else if (subtitle && !smartTopic.toLowerCase().includes(subtitle.slice(0, 12).toLowerCase()) && smartTopic.length < 55) {
        smartTopic += ` (${subtitle})`;
      }
      if (unitTag && !smartTopic.toLowerCase().includes('unit')) {
        smartTopic = `${unitTag}: ${smartTopic}`;
      }
    } else if (lexThemes.length > 0) {
      smartTopic = `${unitTag ? unitTag + ': ' : ''}Лексика и практика (${lexThemes.slice(0, 2).join(', ')})`;
    } else if (subtitle) {
      smartTopic = `${unitTag ? unitTag + ': ' : ''}${subtitle}`;
    }

    // Если в сценарии Perplexity есть явный заголовок темы, учитываем его
    if (!smartTopic && scenarioText) {
      const scTopicMatch = scenarioText.match(/(?:Тема урока|Тема занятия|^#\s+)[:\s]*([^\n#*]{5,80})/im);
      if (scTopicMatch && scTopicMatch[1].trim()) {
        smartTopic = scTopicMatch[1].trim();
      }
    }

    // Fallback очистка
    if (!smartTopic) {
      const noiseWords = ['и', 'с', 'со', 'для', 'от', 'к', 'по', 'в', 'на', 'and', 'with', 'for', 'to', 'lesson', 'урок', 'класс', '7', '6', '5', '4'];
      let parts = cleanFile.split(/\s+/).filter(Boolean);
      while (parts.length > 1 && noiseWords.includes(parts[parts.length - 1].toLowerCase())) parts.pop();
      while (parts.length > 1 && noiseWords.includes(parts[0].toLowerCase())) parts.shift();
      smartTopic = parts.join(' ').trim() || 'Практика английского языка';
    }

    return {
      topic: smartTopic,
      grammarPoints,
      lexThemes,
      vocabList,
      worlds,
      subtitle
    };
  },

  detectTopicFromPresentation(filename = '', presentationText = '', studentName = '', scenarioText = '') {
    const scen = scenarioText || document.getElementById('ls-scenario')?.value?.trim() || '';
    const analysis = this.analyzePresentationEssence(presentationText, scen, filename, studentName);
    return analysis.topic || 'Практика английского языка';
  },

  openPresentationPreviewModal() {
    const text = this.attachedPresentationText || '';
    if (!text) return UI.toast('Текст презентации пуст', 'warning');

    const stId = document.getElementById('ls-student')?.value;
    const st = this.students.find(s => s.id === stId);
    const scen = document.getElementById('ls-scenario')?.value?.trim() || '';
    const analysis = this.analyzePresentationEssence(text, scen, this.attachedPresentationName, st?.name);

    const slides = text.split(/\n(?=Слайд \d+:)/i).map(s => s.trim()).filter(Boolean);

    let overlay = document.getElementById('pres-preview-modal-overlay');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'pres-preview-modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '100000';

    const vocabBadges = analysis.vocabList.length > 0
      ? analysis.vocabList.map(v => `<span style="display:inline-flex;align-items:center;padding:3px 8px;border-radius:6px;background:var(--bg-primary);border:1px solid var(--border-light);font-size:11px;"><b>${this.escapeHtml(v.en)}</b>${v.ipa ? ` <span style="color:var(--text-muted);margin-left:3px;">/${this.escapeHtml(v.ipa)}/</span>` : ''} — ${this.escapeHtml(v.ru)}</span>`).join('')
      : '<span style="color:var(--text-muted);font-size:12px;">Слова будут взяты из контекста слайдов</span>';

    overlay.innerHTML = `
      <div class="modal" style="max-width:780px;width:95%;max-height:88vh;display:flex;flex-direction:column;">
        <div class="modal-header">
          <h2 class="modal-title" style="display:flex;align-items:center;gap:8px;">
            <span>📑 Что прочитано из презентации (${slides.length} сл.)</span>
          </h2>
          <button type="button" class="modal-close" id="pres-prev-close"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body" style="overflow-y:auto;display:flex;flex-direction:column;gap:12px;">
          <div style="padding:12px;border-radius:10px;background:rgba(13,148,136,0.08);border:1px solid rgba(13,148,136,0.3);display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
              <div style="font-size:13px;font-weight:700;color:#0d9488;">🧠 Выжимка сути урока (как презентацию понимает ИИ и бот):</div>
              <button type="button" id="pres-prev-apply-topic" class="btn btn-primary btn-xs" style="background:#0d9488;border-color:#0d9488;color:#fff;font-size:11px;">
                🎯 Записать эту суть в «Тему урока»
              </button>
            </div>
            <div style="font-size:13px;"><b>📌 Суть и тема урока:</b> <span style="color:var(--accent);font-weight:700;">${this.escapeHtml(analysis.topic)}</span></div>
            ${analysis.grammarPoints.length > 0 ? `<div style="font-size:12px;"><b>🧩 Грамматика на слайдах:</b> ${this.escapeHtml(analysis.grammarPoints.join(' • '))}</div>` : ''}
            ${analysis.worlds.length > 0 ? `<div style="font-size:12px;"><b>🐉 Игровой контекст учеников:</b> ${this.escapeHtml(analysis.worlds.join(', '))}</div>` : ''}
            <div>
              <div style="font-size:12px;font-weight:600;margin-bottom:4px;">🔤 Распознанная лексика со слайдов (${analysis.vocabList.length} сл.):</div>
              <div style="display:flex;flex-wrap:wrap;gap:5px;">${vocabBadges}</div>
            </div>
          </div>

          <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-top:4px;">📖 Полный распознанный текст по слайдам (${text.length} симв.):</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${slides.map(s => {
              const colonIdx = s.indexOf(':');
              const sHead = colonIdx !== -1 ? s.slice(0, colonIdx + 1) : '';
              const sBody = colonIdx !== -1 ? s.slice(colonIdx + 1).trim() : s;
              return `
                <div style="padding:10px 12px;border-radius:8px;background:var(--bg-primary);border:1px solid var(--border-light);font-size:12px;line-height:1.5;">
                  <span style="font-weight:700;color:var(--accent);">${this.escapeHtml(sHead)}</span>
                  <span style="color:var(--text-primary);margin-left:4px;">${this.escapeHtml(sBody)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        <div class="modal-footer" style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:11px;color:var(--text-muted);">✅ Весь этот текст передаётся в ИИ для генерации ДЗ и в Telegram-бот</span>
          <button type="button" class="btn btn-primary" id="pres-prev-ok">Закрыть</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    const close = () => overlay.remove();
    document.getElementById('pres-prev-close').onclick = close;
    document.getElementById('pres-prev-ok').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };

    const applyBtn = document.getElementById('pres-prev-apply-topic');
    if (applyBtn) {
      applyBtn.onclick = () => {
        const topicEl = document.getElementById('ls-topic');
        if (topicEl) {
          topicEl.value = analysis.topic;
          UI.toast(`🎯 Тема урока обновлена по сути презентации: "${analysis.topic}"`, 'success');
        }
        close();
      };
    }
  },

  renderPresentationBadge() {
    const badge = document.getElementById('ls-pres-badge');
    const nameSpan = document.getElementById('ls-pres-name');
    const statusSpan = document.getElementById('ls-pres-status');
    const previewBtn = document.getElementById('ls-pres-preview-btn');
    const linkA = document.getElementById('ls-pres-link');
    const removeBtn = document.getElementById('ls-pres-remove');
    const uploadBtn = document.getElementById('ls-btn-upload-pres');
    const fileInput = document.getElementById('ls-presentation-file');

    if (!badge) return;

    if (uploadBtn && fileInput && !uploadBtn._bound) {
      uploadBtn._bound = true;
      uploadBtn.onclick = () => fileInput.click();
      fileInput.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        this.attachedPresentationName = file.name || 'Презентация урока (файл)';
        this.attachedPresentationFile = file;
        this.renderPresentationBadge();

        if (file.type.startsWith('image/')) {
          const dataUrl = await this.compressImage(file);
          this.attachedPresentation = dataUrl;
          this.attachedPresentationFile = null;
          this.renderPresentationBadge();
          UI.toast('Изображение материалов прикреплено!', 'success');
          this.handleVisionRecognition(dataUrl);
          return;
        }
        UI.toast('⏳ Презентация прикреплена, анализирую слайды и контекст...', 'info');
        const extracted = await this.extractTextFromPresentationFile(file);
        if (extracted) {
          this.attachedPresentationText = extracted;
          // Окно сценария ls-scenario НЕ трогаем! Оно строго для конспекта Perplexity.
          const scenEl = document.getElementById('ls-scenario');
          if (scenEl && (scenEl.value.startsWith('[Конспект из презентации') || scenEl.value.startsWith('[Извлечено из презентации') || scenEl.value.includes('pk!') || scenEl.value.includes('p!kiW') || scenEl.value.trim().startsWith('Слайд 1:'))) {
            scenEl.value = '';
          }
        }

        // Автоматическое определение темы урока по СУТИ И КОНТЕКСТУ презентации (а не просто по имени файла)
        const stId = document.getElementById('ls-student')?.value;
        const st = this.students.find(s => s.id === stId);
        const scenVal = document.getElementById('ls-scenario')?.value?.trim() || '';
        const detectedTopic = this.detectTopicFromPresentation(file.name, extracted, st?.name, scenVal);
        const topicEl = document.getElementById('ls-topic');
        const oldTopic = (topicEl?.value || '').trim();
        const isRawFilenameTopic = !oldTopic || oldTopic === 'Практика английского языка' || oldTopic.toLowerCase() === file.name.replace(/\.[^/.]+$/, '').replace(/[_\-\d]+/g, ' ').trim().toLowerCase() || oldTopic === 'Present Perfect Mission';
        if (detectedTopic && topicEl && isRawFilenameTopic) {
          topicEl.value = detectedTopic;
          UI.toast(`🎯 Тема урока по сути презентации: "${detectedTopic}"`, 'success');
        }
        const detectTopicBtn = document.getElementById('ls-btn-detect-topic');
        if (detectTopicBtn) detectTopicBtn.style.display = 'inline-flex';

        if (this.currentLessonId) {
          try {
            await this.saveLocalFile('lesson_pres_' + this.currentLessonId, file);
          } catch (fErr) {
            console.warn('saveLocalFile error on upload:', fErr);
          }
        }

        this.renderPresentationBadge();
        const scCount = extracted ? (extracted.match(/Слайд \d+/gi)?.length || 1) : 0;
        UI.toast(extracted ? `✅ Презентация прочитана (${scCount} сл.)! Нажмите «👁️ Что прочитано» для просмотра разбора.` : 'Презентация прикреплена к уроку!', 'success');
      };
    }

    if (removeBtn) {
      removeBtn.onclick = () => {
        this.attachedPresentation = null;
        this.attachedPresentationFile = null;
        this.attachedPresentationName = '';
        this.attachedPresentationText = '';
        if (fileInput) fileInput.value = '';
        if (this.currentLessonId) {
          this.saveLocalFile('lesson_pres_' + this.currentLessonId, null).catch(() => {});
        }
        const detectTopicBtn = document.getElementById('ls-btn-detect-topic');
        if (detectTopicBtn) detectTopicBtn.style.display = 'none';
        this.renderPresentationBadge();
      };
    }

    const detectTopicBtn = document.getElementById('ls-btn-detect-topic');
    if (detectTopicBtn) {
      detectTopicBtn.style.display = (this.attachedPresentationName || this.attachedPresentationText) ? 'inline-flex' : 'none';
      detectTopicBtn.onclick = () => {
        const stId = document.getElementById('ls-student')?.value;
        const st = this.students.find(s => s.id === stId);
        const scenVal = document.getElementById('ls-scenario')?.value?.trim() || '';
        const topic = this.detectTopicFromPresentation(this.attachedPresentationName, this.attachedPresentationText, st?.name, scenVal);
        if (topic) {
          document.getElementById('ls-topic').value = topic;
          UI.toast(`🎯 Тема урока обновлена по сути презентации: "${topic}"`, 'success');
        } else {
          UI.toast('Сначала прикрепите файл презентации', 'info');
        }
      };
    }

    if (this.attachedPresentation || this.attachedPresentationFile || this.attachedPresentationName || this.attachedPresentationText) {
      badge.style.display = 'inline-flex';
      nameSpan.textContent = this.attachedPresentationName || '📄 Презентация урока (PDF/PPTX)';

      // Индикатор статуса распознавания
      const slideMatches = this.attachedPresentationText ? this.attachedPresentationText.match(/Слайд \d+/gi) : null;
      const slideCount = slideMatches ? slideMatches.length : (this.attachedPresentationText && this.attachedPresentationText.length > 50 ? 1 : 0);

      if (statusSpan) {
        if (this.attachedPresentationText && slideCount > 0) {
          statusSpan.style.display = 'inline-flex';
          statusSpan.innerHTML = `✅ Прочитано (${slideCount} сл.)`;
          statusSpan.style.background = 'rgba(16,185,129,0.15)';
          statusSpan.style.color = '#059669';
        } else if (this.attachedPresentationFile || this.attachedPresentation || this.attachedPresentationName) {
          statusSpan.style.display = 'inline-flex';
          statusSpan.innerHTML = `📎 Файл привязан`;
          statusSpan.style.background = 'rgba(2,132,199,0.12)';
          statusSpan.style.color = '#0284c7';
        } else {
          statusSpan.style.display = 'none';
        }
      }

      // Кнопка предпросмотра прочитанного текста и разбора сути (красивое модальное окно вместо alert)
      if (previewBtn) {
        if (this.attachedPresentationText && this.attachedPresentationText.length > 20) {
          previewBtn.style.display = 'inline-block';
          previewBtn.onclick = () => this.openPresentationPreviewModal();
        } else {
          previewBtn.style.display = 'none';
        }
      }

      const target = this.attachedPresentationFile || this.attachedPresentation;
      if (target) {
        linkA.style.display = 'inline';
        linkA.onclick = (e) => {
          e.preventDefault();
          const cur = this.attachedPresentationFile || this.attachedPresentation;
          if (!cur) return;
          if (cur instanceof Blob || cur instanceof File) {
            const url = URL.createObjectURL(cur);
            if (cur.type === 'application/pdf') {
              window.open(url, '_blank');
            } else {
              const a = document.createElement('a');
              a.href = url;
              a.download = (this.attachedPresentationName || 'presentation').replace(/[^\w\.\-\_]/g, '_');
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(url), 60000);
            }
            return;
          }
          if (typeof cur === 'string' && cur.startsWith('data:')) {
            if (cur.startsWith('data:application/pdf') || cur.startsWith('data:image/')) {
              const win = window.open();
              win.document.write('<iframe src="' + cur + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
            } else {
              const a = document.createElement('a');
              a.href = cur;
              a.download = (this.attachedPresentationName || 'presentation').replace(/[^\w\.\-\_]/g, '_');
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
          } else if (typeof cur === 'string' && cur.startsWith('http')) {
            window.open(cur, '_blank');
          }
        };
      } else {
        linkA.style.display = 'none';
      }
    } else {
      badge.style.display = 'none';
    }
  },

  parseCardsFromHomework(rawHw) {
    if (!rawHw) return [];
    const match = rawHw.match(/\[КАРТОЧКИ_ДЗ\]:([\s\S]*?)\[\/КАРТОЧКИ_ДЗ\]/);
    if (!match) return [];
    return match[1].trim().split('||').map(s => s.trim()).filter(Boolean);
  },

  renderCardsPreview() {
    const container = document.getElementById('ls-cards-preview');
    if (!container) return;
    if (!this.attachedCards || this.attachedCards.length === 0) {
      container.innerHTML = '<span style="font-size:11px;color:var(--text-muted);">Нет прикреплённых карточек</span>';
      return;
    }
    container.innerHTML = this.attachedCards.map((card, idx) => {
      const isImg = card.startsWith('data:image') || card.startsWith('http');
      return `
        <div style="position:relative;width:64px;height:64px;border-radius:8px;overflow:hidden;border:1px solid var(--border-light);background:#000;box-shadow:0 2px 6px rgba(0,0,0,0.1);">
          <img src="${card}" style="width:100%;height:100%;object-fit:cover;cursor:pointer;" onclick="window.open('${card}')" title="Нажмите для просмотра во весь экран" />
          <button type="button" onclick="event.stopPropagation(); TutoringPage.removeCard(${idx})" style="position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,0.7);color:#fff;border:none;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;">✕</button>
        </div>
      `;
    }).join('');
    if (window.lucide) window.lucide.createIcons();
  },

  removeCard(idx) {
    this.attachedCards.splice(idx, 1);
    this.renderCardsPreview();
  },

  async addCardDataUrl(dataUrl) {
    if (!this.attachedCards) this.attachedCards = [];
    if (this.attachedCards.length >= 10) return UI.toast('Максимум 10 карточек на урок', 'warning');
    let finalCard = dataUrl;
    if (dataUrl && dataUrl.startsWith('data:image/') && dataUrl.length > 200000) {
      try {
        finalCard = await this.compressImage(dataUrl, 960, 0.75);
      } catch (_) {}
    }
    this.attachedCards.push(finalCard);
    this.renderCardsPreview();
    UI.toast('Карточка прикреплена к ДЗ!', 'success');
  },

  bindLessonModalMediaAndDebrief(ls, studentId) {
    const openPresBtn = document.getElementById('ls-btn-open-presentation-link');
    if (openPresBtn) {
      openPresBtn.onclick = () => {
        const url = document.getElementById('ls-materials')?.value?.trim();
        if (!url) return UI.toast('Введите ссылку на презентацию (Google Презентации, Gamma, Canva)', 'warning');
        const validUrl = url.startsWith('http') ? url : 'https://' + url;
        window.open(validUrl, '_blank');
      };
    }
    const fileInput = document.getElementById('ls-card-file-input');
    const addFileBtn = document.getElementById('ls-btn-add-card-file');
    const dropzone = document.getElementById('ls-cards-dropzone');
    const genCardsBtn = document.getElementById('ls-btn-gen-cards');
    const voiceRecBtn = document.getElementById('ls-btn-voice-rec');
    const processDebriefBtn = document.getElementById('ls-btn-process-debrief');

    if (addFileBtn && fileInput) {
      addFileBtn.onclick = () => fileInput.click();
      fileInput.onchange = (e) => {
        const files = Array.from(e.target.files || []);
        files.forEach(async (file) => {
          if (file.type.startsWith('image/')) {
            const compressed = await this.compressImage(file);
            this.addCardDataUrl(compressed);
          } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              this.attachedPresentation = ev.target.result;
              this.renderPresentationBadge();
              UI.toast('PDF презентация прикреплена к уроку!', 'success');
            };
            reader.readAsDataURL(file);
          }
        });
        fileInput.value = '';
      };
    }

    if (dropzone) {
      dropzone.ondragover = (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--accent)'; };
      dropzone.ondragleave = () => { dropzone.style.borderColor = 'var(--border-light)'; };
      dropzone.ondrop = (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--border-light)';
        const files = Array.from(e.dataTransfer.files || []);
        files.forEach(async (file) => {
          if (!file.type.startsWith('image/')) return;
          const compressed = await this.compressImage(file);
          this.addCardDataUrl(compressed);
        });
      };
      dropzone.onclick = (e) => {
        if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'IMG') fileInput.click();
      };
    }

    // Paste image from clipboard anywhere in lesson modal
    const modalEl = document.getElementById('lesson-modal');
    if (modalEl && !modalEl._pasteBound) {
      modalEl._pasteBound = true;
      modalEl.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (const item of items) {
          if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            this.compressImage(blob).then(compressed => {
              this.addCardDataUrl(compressed);
            });
          }
        }
      });
    }

    if (genCardsBtn) {
      genCardsBtn.onclick = () => this.promptGenerateCards(studentId);
    }

    if (voiceRecBtn) {
      voiceRecBtn.onclick = () => this.toggleVoiceDebrief();
    }

    if (processDebriefBtn) {
      processDebriefBtn.onclick = () => this.processTeacherDebrief(studentId, ls?.id);
    }
  },

  async promptGenerateCards(studentId) {
    const st = this.students.find(s => s.id === studentId);
    const topic = document.getElementById('ls-topic')?.value?.trim() || 'English Lesson';
    const hwVal = document.getElementById('ls-homework')?.value?.trim() || '';
    if (hwVal && confirm('🖼 Сгенерировать готовую PNG-карточку домашнего задания (слова + письменное упражнение из ДЗ) для отправки ученику?')) {
      const wsPng = await this.renderHomeworkWorksheetCardCanvas(topic, hwVal, st?.name || 'Ученик');
      if (wsPng) this.addCardDataUrl(wsPng);
      return;
    }
    const dossier = st ? this.parseStudentDossier(st) : {};
    const defaultWords = dossier.vocab || 'adventure, challenge, discover, explore, achieve';
    const wordsInput = prompt('Введите слова через запятую для генерации красивых PNG-карточек (или нажмите ОК, чтобы взять активный словарь ученика):', defaultWords);
    if (!wordsInput || !wordsInput.trim()) return;

    const words = wordsInput.split(/[,;\r\n]+/).map(w => w.trim()).filter(Boolean).slice(0, 5);
    UI.toast(`Генерирую ${words.length} PNG-карточек...`, 'info');
    for (const w of words) {
      const cardPng = await this.renderWordCardCanvas(w);
      this.addCardDataUrl(cardPng);
    }
  },

  async renderHomeworkWorksheetCardCanvas(topic, hwText, studentName = 'Ученик') {
    const canvas = document.createElement('canvas');
    canvas.width = 920;
    canvas.height = 760;
    const ctx = canvas.getContext('2d');

    // Deep slate gradient background
    const grad = ctx.createLinearGradient(0, 0, 920, 760);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 920, 760);

    // Subtle accent glow
    const glow = ctx.createRadialGradient(460, 120, 20, 460, 280, 460);
    glow.addColorStop(0, 'rgba(13, 148, 136, 0.22)');
    glow.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 920, 760);

    // Outer frame
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, 880, 720);

    // Header bar
    ctx.fillStyle = 'rgba(13, 148, 136, 0.22)';
    ctx.fillRect(22, 22, 876, 86);

    ctx.textAlign = 'left';
    ctx.font = 'bold 16px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#2dd4bf';
    ctx.fillText(`🇬🇧 ПИСЬМЕННОЕ ЗАДАНИЕ В ТЕТРАДИ • ${(studentName || 'STUDENT').toUpperCase()}`, 44, 54);

    ctx.font = 'bold 25px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#f8fafc';
    const cleanTopic = (topic || 'English Practice').slice(0, 52);
    ctx.fillText(`📚 Тема: ${cleanTopic}`, 44, 88);

    // Extract clean lines from hwText (keep Vocabulary & Written Exercise, exclude section 3/4 meta instructions)
    const cleanHw = (hwText || '')
      .replace(/\[[\s\S]*?\]/g, '')
      .replace(/[*_`#]/g, '')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 2 && !/^4\.\s*📬/.test(l) && !/^3\.\s*🎯/.test(l));

    // Helper for word wrapping on canvas
    const drawWrappedLine = (text, x, y, maxWidth, lineHeight, maxLines = 2) => {
      const words = text.split(' ');
      let line = '';
      let linesDrawn = 0;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line.trim(), x, y);
          line = words[n] + ' ';
          y += lineHeight;
          linesDrawn++;
          if (linesDrawn >= maxLines - 1) {
            const rest = words.slice(n).join(' ');
            ctx.fillText(rest.length > 78 ? rest.slice(0, 75) + '...' : rest, x, y);
            return y + lineHeight;
          }
        } else {
          line = testLine;
        }
      }
      if (line.trim()) {
        ctx.fillText(line.trim(), x, y);
        y += lineHeight;
      }
      return y;
    };

    let curY = 138;
    ctx.font = '18px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#e2e8f0';

    for (const line of cleanHw.slice(0, 18)) {
      if (curY > 645) break;
      if (/^(1\.|2\.|🔤|✍️|💡)/.test(line)) {
        curY += 6;
        ctx.font = 'bold 19px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#5eead4';
        curY = drawWrappedLine(line, 44, curY, 830, 24, 2);
        ctx.font = '17px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#f1f5f9';
      } else {
        curY = drawWrappedLine(line, 52, curY, 820, 23, 2);
      }
    }

    // Footer mandatory instruction box
    ctx.fillStyle = 'rgba(15, 118, 110, 0.42)';
    ctx.fillRect(36, 668, 848, 56);
    ctx.font = 'bold 17px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#99f6e4';
    ctx.textAlign = 'center';
    ctx.fillText('📸 ОБЯЗАТЕЛЬНО: Выполни письменно в тетради и пришли ФОТО тетрадки в бот!', 460, 702);

    return canvas.toDataURL('image/png');
  },

  async renderWordCardCanvas(word) {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    // Gradient Background
    const grad = ctx.createLinearGradient(0, 0, 800, 480);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 480);

    // Decorative glow circle
    const glow = ctx.createRadialGradient(400, 240, 20, 400, 240, 300);
    glow.addColorStop(0, 'rgba(13, 148, 136, 0.25)');
    glow.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 800, 480);

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, 768, 448);

    // Header badge
    ctx.fillStyle = '#0d9488';
    ctx.beginPath();
    ctx.arc(48, 48, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 18px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('ENGLISH FLASHCARD', 74, 54);

    // Main English Word
    ctx.font = 'bold 54px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText(word, 400, 220);

    // Footer hint
    ctx.font = '16px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Gor Pavlovskiy • Репетиторство по английскому', 400, 430);

    return canvas.toDataURL('image/png');
  },

  toggleVoiceDebrief() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return UI.toast('Голосовой ввод не поддерживается браузером. Вы можете печатать текст в поле заметки!', 'warning');
    }

    const btnText = document.getElementById('ls-voice-rec-text');
    const debriefArea = document.getElementById('ls-debrief-notes');

    if (this._voiceRec) {
      this._voiceRec.stop();
      this._voiceRec = null;
      if (btnText) btnText.textContent = 'Надиктовать';
      UI.toast('Запись остановлена', 'info');
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = 'ru-RU';
      rec.continuous = true;
      rec.interimResults = true;

      rec.onstart = () => {
        if (btnText) btnText.textContent = '🔴 Слушаю...';
        UI.toast('Слушаю вас! Надиктовывайте итоги урока...', 'info');
      };

      rec.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        if (debriefArea) debriefArea.value = transcript.trim();
      };

      rec.onerror = (e) => {
        console.error('Speech rec error:', e);
        if (btnText) btnText.textContent = 'Надиктовать';
        this._voiceRec = null;
      };

      rec.onend = () => {
        if (btnText) btnText.textContent = 'Надиктовать';
        this._voiceRec = null;
      };

      this._voiceRec = rec;
      rec.start();
    } catch (e) {
      UI.toast('Ошибка запуска микрофона: ' + e.message, 'error');
    }
  },

  async processTeacherDebrief(studentId, lessonId = null) {
    const rawNotes = document.getElementById('ls-debrief-notes')?.value?.trim();
    if (!rawNotes) return UI.toast('Сначала надиктуйте или запишите итоги урока!', 'warning');

    const st = this.students.find(s => s.id === studentId);
    if (!st) return UI.toast('Выберите ученика', 'warning');

    const procBtn = document.getElementById('ls-btn-process-debrief');
    if (procBtn) { procBtn.disabled = true; procBtn.textContent = '⏳ Разбираю...'; }

    try {
      const dossier = this.parseStudentDossier(st);
      const res = await Gemini.parseTeacherDebrief(rawNotes, { name: st.name, grade: st.grade, ...dossier });

      // 1. Update Student profile if new errors or words
      let updatedErrors = dossier.errors || '';
      if (res.errors) {
        updatedErrors = updatedErrors ? `${updatedErrors}, ${res.errors}` : res.errors;
      }
      let updatedVocab = dossier.vocab || '';
      if (res.words) {
        updatedVocab = updatedVocab ? `${updatedVocab}, ${res.words}` : res.words;
      }

      if (res.errors || res.words) {
        const newSched = this.serializeStudentDossier(
          dossier.schedule,
          dossier.interests,
          updatedErrors,
          updatedVocab,
          dossier.notes,
          dossier.perplexity,
          dossier.unit,
          dossier.tgId,
          dossier.tgUser,
          dossier.streak,
          dossier.parentTgId,
          dossier.parentTgUser
        );
        await DB.updateStudent(st.id, { schedule: newSched });
        st.schedule = newSched;
      }

      // 2. Populate Homework textarea
      if (res.homework) {
        const hwEl = document.getElementById('ls-homework');
        if (hwEl) hwEl.value = res.homework;
      }

      // 3. Open Report Modal with polite parent report
      if (res.parent_report) {
        UI.toast('Дебрифинг успешно разобран! Ошибки и словарь обновлены, отчёт готов к отправке.', 'success');
        await this.generateMonthlyReport(studentId);
        const repTextEl = document.getElementById('report-modal-text');
        if (repTextEl) repTextEl.value = res.parent_report;
      } else {
        UI.toast('Дебрифинг разобран, ошибки и словарь сохранены!', 'success');
      }

    } catch (e) {
      UI.toast('Ошибка разбора дебрифинга: ' + e.message, 'error');
    } finally {
      if (procBtn) { procBtn.disabled = false; procBtn.textContent = '✨ Разобрать в отчёт и ошибки'; }
    }
  },

  compressImage(fileOrDataUrl, maxDim = 1400, quality = 0.82) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => {
        if (typeof fileOrDataUrl === 'string') resolve(fileOrDataUrl);
      };

      if (typeof fileOrDataUrl === 'string') {
        img.src = fileOrDataUrl;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => { img.src = e.target.result; };
        reader.readAsDataURL(fileOrDataUrl);
      }
    });
  },

  async handleVisionRecognition(fileOrDataUrl) {
    const studentId = document.getElementById('ls-student')?.value;
    const st = this.students.find(s => s.id === studentId);
    const dateVal = document.getElementById('ls-date')?.value;
    const visionBtn = document.getElementById('ls-btn-vision-ai');

    if (visionBtn) {
      visionBtn.disabled = true;
      visionBtn.innerHTML = '<i class="lucide-loader" style="width:12px;height:12px;animation:spin 1s linear infinite;"></i> Распознаю...';
    }
    UI.toast('🤖 Распознаю материалы урока...', 'info');

    try {
      // 1. Если передан PDF — извлекаем текст напрямую из слайдов без тяжелого vision
      const isPdf = (fileOrDataUrl instanceof File && (fileOrDataUrl.type === 'application/pdf' || fileOrDataUrl.name.toLowerCase().endsWith('.pdf')))
        || (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:application/pdf'));

      if (isPdf) {
        let pdfText = '';
        if (fileOrDataUrl instanceof File) {
          pdfText = await this.extractTextFromPresentationFile(fileOrDataUrl);
          this.attachedPresentationText = pdfText;
          const reader = new FileReader();
          reader.onload = (ev) => {
            this.attachedPresentation = ev.target.result;
            this.renderPresentationBadge();
          };
          reader.readAsDataURL(fileOrDataUrl);
        } else {
          pdfText = this.attachedPresentationText || '';
        }

        if (pdfText) {
          UI.toast('✅ Презентация PDF успешно распознана для ДЗ!', 'success');
        } else {
          UI.toast('PDF прикреплен к уроку!', 'success');
        }
        return;
      }

      // 2. Распознавание изображения через Vision AI
      let base64 = typeof fileOrDataUrl === 'string' ? fileOrDataUrl : await this.compressImage(fileOrDataUrl);
      if (typeof base64 !== 'string' || !base64.startsWith('data:')) {
        throw new Error('Некорректное изображение');
      }

      const studentCtx = st ? { name: st.name, grade: st.grade, ...this.parseStudentDossier(st) } : {};
      const res = await Gemini.recognizeLessonImage(base64, studentCtx);

      if (res.topic) {
        const topicEl = document.getElementById('ls-topic');
        if (topicEl && !topicEl.value.trim()) topicEl.value = res.topic;
      }
      if (res.scenario) {
        const scenEl = document.getElementById('ls-scenario');
        if (scenEl) {
          scenEl.value = scenEl.value ? `${scenEl.value}\n\n${res.scenario}` : res.scenario;
        }
      }
      if (res.vocabulary && st) {
        const dossier = this.parseStudentDossier(st);
        const currentVocab = dossier.vocab || '';
        const newWords = res.vocabulary.split(',').map(w => w.trim()).filter(w => w && !currentVocab.includes(w));
        if (newWords.length > 0) {
          const updatedVocab = currentVocab ? `${currentVocab}, ${newWords.join(', ')}` : newWords.join(', ');
          const newSched = this.serializeStudentDossier(
            dossier.schedule, dossier.interests, dossier.errors, updatedVocab,
            dossier.notes, dossier.perplexity, dossier.unit, dossier.tgId,
            dossier.tgUser, dossier.streak, dossier.parentTgId, dossier.parentTgUser
          );
          await DB.updateStudent(st.id, { schedule: newSched });
          st.schedule = newSched;
        }
      }

      UI.toast('✅ Тема урока и лексика успешно распознаны!', 'success');

      await this.openAnnouncementModal(
        { id: this.currentLessonId, date: dateVal, topic: res.topic || document.getElementById('ls-topic')?.value, scenario: res.scenario },
        st,
        res.announcement_student,
        res.announcement_parent
      );
    } catch (err) {
      console.error('Vision recognition error:', err);
      UI.toast('Ошибка распознавания: ' + err.message, 'error');
    } finally {
      if (visionBtn) {
        visionBtn.disabled = false;
        visionBtn.innerHTML = '📸 Распознать тему из файла';
      }
    }
  },

  async openAnnouncementModal(ls = null, st = null, customStudentAnn = '', customParentAnn = '') {
    const modal = document.getElementById('announcement-modal');
    if (!modal) return;

    const studentId = st?.id || document.getElementById('ls-student')?.value;
    const student = st || this.students.find(s => s.id === studentId);
    if (!student) return UI.toast('Выберите ученика', 'warning');

    const dossier = this.parseStudentDossier(student);
    const dateVal = ls?.date || document.getElementById('ls-date')?.value;
    const topicVal = ls?.topic || document.getElementById('ls-topic')?.value?.trim() || 'Практика английского языка';

    const dStr = dateVal ? new Date(dateVal).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : 'сегодня';
    const tStr = dateVal ? new Date(dateVal).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '17:00';

    const statusDiv = document.getElementById('announcement-modal-status');
    const studentTextarea = document.getElementById('announcement-student-text');
    const parentTextarea = document.getElementById('announcement-parent-text');
    const studentCheck = document.getElementById('announcement-send-student-check');
    const parentCheck = document.getElementById('announcement-send-parent-check');

    let statusHtml = '<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;">';
    statusHtml += `<div style="font-size:12px;display:flex;align-items:center;gap:6px;">👤 <b>Ученик (${this.escapeHtml(student.name)}):</b> ${dossier.tgId ? `<span style="color:var(--success);font-weight:700;">✅ В сети (${this.escapeHtml(dossier.tgUser || 'ID: ' + dossier.tgId)})</span>` : `<span style="color:#f59e0b;">⚠️ Нет Telegram ID</span>`}</div>`;
    statusHtml += `<div style="font-size:12px;display:flex;align-items:center;gap:6px;">👨‍👩‍👧 <b>Родитель:</b> ${dossier.parentTgId ? `<span style="color:var(--success);font-weight:700;">✅ В сети (${this.escapeHtml(dossier.parentTgUser || 'ID: ' + dossier.parentTgId)})</span>` : `<span style="color:#f59e0b;">⚠️ Нет Telegram ID</span>`}</div>`;
    statusHtml += '</div>';
    statusDiv.innerHTML = statusHtml;

    if (studentCheck) studentCheck.checked = !!dossier.tgId;
    if (parentCheck) parentCheck.checked = !!dossier.parentTgId;

    studentTextarea.value = customStudentAnn || `Привет, ${student.name}! 🚀\nСегодня (${dStr}) в ${tStr} у нас занятие по английскому!\n\n🎯 Тема урока: ${topicVal}\nПриготовь отличное настроение, скоро начинаем! 👍`;
    parentTextarea.value = customParentAnn || `Здравствуйте! 👋\nНапоминаю, что сегодня (${dStr}) в ${tStr} состоится занятие по английскому языку с ${student.name}.\n\n📚 Тема занятия: ${topicVal}\nПосле урока пришлю подробный отчёт об успехах и домашнее задание. Спасибо за поддержку!`;

    modal.classList.remove('hidden');

    const sendBtn = document.getElementById('announcement-modal-send');
    sendBtn.onclick = async () => {
      sendBtn.disabled = true;
      sendBtn.innerHTML = '<i class="lucide-loader" style="width:14px;height:14px;animation:spin 1s linear infinite;"></i> Отправка...';

      try {
        const sendStudent = studentCheck?.checked;
        const sendParent = parentCheck?.checked;
        const sText = studentTextarea.value.trim();
        const pText = parentTextarea.value.trim();

        if (!sendStudent && !sendParent) {
          return UI.toast('Выберите хотя бы одного получателя (ученика или родителя)', 'warning');
        }

        let queuePayload = '\n[АНОНС_УРОКА_В_ТГ]';
        if (sendStudent && sText) {
          queuePayload += `\n[АНОНС_УЧЕНИКУ]:\n${sText}\n[/АНОНС_УЧЕНИКУ]`;
        }
        if (sendParent && pText) {
          queuePayload += `\n[АНОНС_РОДИТЕЛЮ]:\n${pText}\n[/АНОНС_РОДИТЕЛЮ]`;
        }

        let targetLessonId = ls?.id || this.currentLessonId;
        if (!targetLessonId) {
          const newLesson = await DB.createLesson({
            student_id: student.id,
            date: dateVal || new Date().toISOString(),
            topic: topicVal,
            homework: queuePayload,
            status: 'Запланирован',
            paid: false
          });
          targetLessonId = newLesson.id;
          this.currentLessonId = newLesson.id;
        } else {
          const existing = this.lessons.find(l => l.id === targetLessonId);
          const cleanHw = (existing?.homework || '')
            .replace('[АНОНС_УРОКА_В_ТГ]', '')
            .replace('[ОТПРАВИТЬ_АНОНС_УРОКА_В_ТГ]', '')
            .replace('[ОТПРАВИТЬ_АНОНС_В_ТГ]', '')
            .replace(/\[АНОНС_УЧЕНИКУ\]:[\s\S]*?\[\/АНОНС_УЧЕНИКУ\]/g, '')
            .replace(/\[АНОНС_РОДИТЕЛЮ\]:[\s\S]*?\[\/АНОНС_РОДИТЕЛЮ\]/g, '')
            .trim();
          const updatedHw = `${cleanHw}${queuePayload}`.trim();
          await DB.updateLesson(targetLessonId, {
            topic: topicVal,
            homework: updatedHw
          });
          if (existing) {
            existing.homework = updatedHw;
          }
        }

        UI.toast('📢 Анонс урока успешно отправлен в Telegram бот!', 'success');
        modal.classList.add('hidden');
        await this.load();
      } catch (err) {
        UI.toast('Ошибка отправки: ' + err.message, 'error');
      } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i data-lucide="send" style="width:14px;height:14px;"></i> Отправить анонс в Telegram';
        if (window.lucide) lucide.createIcons();
      }
    };
  },

  escapeHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};

window.TutoringPage = TutoringPage;
