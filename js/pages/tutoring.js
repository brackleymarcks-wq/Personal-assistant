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
          <div class="page-actions" style="display:flex;gap:12px;">
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
                  <button type="button" id="ls-btn-send-tg" class="btn btn-secondary btn-xs" style="font-size:11px;padding:6px 10px;color:#3b82f6;border-color:rgba(59,130,246,0.35);" title="Отправить домашнее задание и слова урока напрямую ученику в Telegram через бота">📨 Отправить ДЗ ученику в ТГ</button>
                  <button type="button" id="ls-btn-send-parent-tg" class="btn btn-secondary btn-xs" style="font-size:11px;padding:6px 10px;color:#8b5cf6;border-color:rgba(139,92,246,0.35);" title="Сгенерировать и отправить отчёт об этом уроке родителю в Telegram">👨‍👩‍👧 Отчёт родителю в ТГ</button>
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
                <div style="margin-top:10px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <label class="form-label" style="margin-bottom:0;display:flex;align-items:center;gap:6px;">
                      <i data-lucide="image" style="width:14px;height:14px;color:var(--accent);"></i>
                      <span>Карточки и материалы ДЗ (PNG / Картинки)</span>
                    </label>
                    <div style="display:flex;gap:6px;">
                      <button type="button" id="ls-btn-gen-cards" class="btn btn-secondary btn-xs" style="font-size:11px;color:#0d9488;border-color:rgba(13,148,136,0.35);" title="Сгенерировать стильные PNG-карточки слов для отправки в Telegram">🎨 Создать карточки (PNG)</button>
                      <button type="button" id="ls-btn-add-card-file" class="btn btn-secondary btn-xs" style="font-size:11px;" title="Прикрепить PNG/JPG с диска">📎 Прикрепить PNG</button>
                    </div>
                  </div>
                  <input type="file" id="ls-card-file-input" accept="image/*" multiple style="display:none;" />
                  <div id="ls-cards-dropzone" style="border:2px dashed var(--border-light);border-radius:10px;padding:12px;text-align:center;cursor:pointer;background:var(--bg-primary);transition:border-color 0.2s;" title="Перетащите сюда PNG или нажмите Ctrl+V для вставки из буфера">
                    <div style="font-size:12px;color:var(--text-secondary);display:flex;align-items:center;justify-content:center;gap:6px;">
                      <i data-lucide="upload-cloud" style="width:16px;height:16px;color:var(--accent);"></i>
                      <span>Перетащите PNG-карточки сюда, выберите файл или вставьте из буфера (<b>Ctrl+V</b>)</span>
                    </div>
                    <div id="ls-cards-preview" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;"></div>
                  </div>
                </div>

                <div style="margin-top:12px;padding:12px;border-radius:12px;background:linear-gradient(145deg, rgba(13,148,136,0.06), rgba(99,102,241,0.06));border:1px solid rgba(13,148,136,0.25);">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <label class="form-label" style="margin-bottom:0;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:6px;">
                      <i data-lucide="mic" style="width:14px;height:14px;color:#0d9488;"></i> Итоги урока (Дебрифинг преподавателя)
                    </label>
                    <div style="display:flex;gap:6px;">
                      <button type="button" id="ls-btn-voice-rec" class="btn btn-secondary btn-xs" style="font-size:11px;display:flex;align-items:center;gap:4px;" title="Надиктовать голосом итоги урока"><i data-lucide="mic" style="width:12px;height:12px;"></i> <span id="ls-voice-rec-text">Надиктовать</span></button>
                      <button type="button" id="ls-btn-process-debrief" class="btn btn-primary btn-xs" style="font-size:11px;background:#0d9488;border-color:#0d9488;color:#fff;" title="Разобрать ИИ: обновить ошибки, пополнить словарь и составить отчёт родителям">✨ Разобрать в отчёт и ошибки</button>
                    </div>
                  </div>
                  <textarea id="ls-debrief-notes" class="form-input" rows="2" style="font-size:12px;" placeholder="Надиктуйте или запишите своими словами: что прошли, что получилось, где ошибся (например: путал was/were, забывал -s), какие новые слова взяли..."></textarea>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">
                  <button type="button" id="ls-ai-warmup" class="btn btn-secondary btn-xs" style="font-size:11px;padding:4px 8px;">🎲 Разминка (Warm-up 5м)</button>
                  <button type="button" id="ls-ai-blitz" class="btn btn-secondary btn-xs" style="font-size:11px;padding:4px 8px;">🔍 Блиц-проверка прошлого ДЗ</button>
                  <button type="button" id="ls-ai-parent" class="btn btn-secondary btn-xs" style="font-size:11px;padding:4px 8px;">📲 Текст ученику/родителям</button>
                  <button type="button" id="ls-ai-game" class="btn btn-secondary btn-xs" style="font-size:11px;padding:4px 8px;color:var(--accent);border-color:var(--accent-alpha);">🎮 Игра на 5 минут</button>
                </div>
                <div id="ls-ai-output-box" class="hidden" style="margin-top:8px;padding:10px 12px;background:var(--bg-primary);border:1px solid var(--accent-alpha);border-radius:10px;font-size:12px;white-space:pre-wrap;max-height:200px;overflow-y:auto;"></div>
              </div>
              <div class="form-group">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                  <label class="form-label" style="margin-bottom:0;display:flex;align-items:center;gap:6px;">
                    <i data-lucide="file-text" style="width:14px;height:14px;color:#0d9488;"></i>
                    <span style="font-weight:700;">Сценарий и материалы урока (Конспект из Perplexity / План)</span>
                  </label>
                  <button type="button" id="ls-btn-pplx-fill" class="btn btn-secondary btn-xs" style="font-size:11px;color:#0d9488;border-color:rgba(13,148,136,0.35);" title="Вставить текст конспекта из Perplexity">📥 Вставить из Perplexity</button>
                </div>
                <textarea id="ls-scenario" class="form-input" rows="4" style="font-size:12px;font-family:inherit;" placeholder="Вставьте сюда сценарий / конспект урока из Perplexity (все слайды, слова, правила). Бот запомнит этот сценарий и будет по нему подкидывать ученице 5 слов, 5 глаголов и тестик!"></textarea>
                <input id="ls-materials" type="text" class="form-input" style="margin-top:6px;" placeholder="Ссылки на материалы, видео или PDF (например: https://youtube.com/...)" />
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


        <!-- Homework & Materials Dispatcher Modal -->
        <div id="hw-dispatcher-modal" class="modal-overlay hidden">
          <div class="modal" style="max-width: 680px; width: 95%;">
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

              <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--bg-primary);border-radius:10px;border:1px solid var(--border-light);">
                <input id="hw-disp-send-parent" type="checkbox" style="cursor:pointer;" />
                <label for="hw-disp-send-parent" style="font-size:12px;color:var(--text-primary);cursor:pointer;margin:0;">
                  👨‍👩‍👧 Также отправить это домашнее задание и карточки родителю в Telegram
                </label>
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
          <div class="modal" style="max-width: 640px; width: 95%;">
            <div class="modal-header">
              <h2 class="modal-title" id="report-modal-title"><i data-lucide="bar-chart-2"></i> Отчёт об успеваемости</h2>
              <button class="modal-close" id="report-modal-close"><i data-lucide="x"></i></button>
            </div>
            <div class="modal-body">
              <div id="report-modal-status" style="margin-bottom:12px; font-size:13px; padding:10px 12px; border-radius:8px;"></div>
              <label class="form-label">Текст отчёта (можно отредактировать перед отправкой):</label>
              <textarea id="report-modal-text" class="form-input" style="height:280px; font-size:13px; line-height:1.5; font-family:inherit; resize:vertical;"></textarea>
            </div>
            <div class="modal-footer" style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
              <button type="button" class="btn btn-secondary btn-sm" id="report-modal-copy"><i data-lucide="copy" style="width:14px;height:14px;"></i> Скопировать</button>
              <button type="button" class="btn btn-secondary btn-sm" id="report-modal-send-me"><i data-lucide="send" style="width:14px;height:14px;"></i> Отправить мне в ТГ</button>
              <button type="button" class="btn btn-primary btn-sm" id="report-modal-send-parent" style="background:#8b5cf6; border-color:#8b5cf6;"><i data-lucide="send" style="width:14px;height:14px;"></i> Отправить родителю в ТГ</button>
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
        // Find latest homework lesson for this student
        const lastHwLesson = this.lessons
          .filter(l => l.student_id === st.id && l.homework && l.homework.trim())
          .sort((a,b) => new Date(b.date) - new Date(a.date))[0];
        let hwStatusBadge = '';
        if (lastHwLesson) {
          const rawHw = lastHwLesson.homework || '';
          const isDone = rawHw.includes('[ДЗ_СДАНО]');
          const isChecked = rawHw.includes('[ДЗ_ПРОВЕРЕНО]');
          const cleanHwText = rawHw.split('\\n[МАТЕРИАЛЫ]:')[0].split('\\n[КАРТОЧКИ_ДЗ]:')[0].replace('[ДЗ_ПРОВЕРЕНО]', '').replace('[ДЗ_СДАНО]', '').replace('[ОТПРАВИТЬ_В_ТГ]', '').replace('[ОТПРАВИТЬ_РОДИТЕЛЮ_В_ТГ]', '').trim();
          if (isDone && !isChecked) {
            hwStatusBadge = `<div style="margin-top:8px;padding:6px 10px;border-radius:8px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.25);font-size:11px;display:flex;justify-content:space-between;align-items:center;gap:6px;min-width:0;overflow:hidden;"><span style="color:#2563eb;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;">📬 Сдано в ТГ: ${this.escapeHtml(cleanHwText || 'Домашка')}</span><button class="btn btn-secondary btn-xs" style="font-size:10px;padding:2px 6px;color:var(--success);border-color:rgba(16,185,129,0.3);flex-shrink:0;" onclick="event.stopPropagation(); TutoringPage.markPrevHwChecked('${lastHwLesson.id}')">✅ Проверено</button></div>`;
          } else if (isChecked) {
            hwStatusBadge = `<div style="margin-top:8px;padding:4px 8px;border-radius:8px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);font-size:11px;color:var(--success);display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;"><i data-lucide="check-circle" style="width:12px;height:12px;flex-shrink:0;"></i> <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;">✅ ДЗ проверено: ${this.escapeHtml(cleanHwText || 'Задание')}</span></div>`;
          } else if (cleanHwText) {
            hwStatusBadge = `<div style="margin-top:8px;padding:4px 8px;border-radius:8px;background:var(--bg-primary);border:1px solid var(--border-light);font-size:11px;color:var(--text-secondary);display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;"><i data-lucide="edit-3" style="width:12px;height:12px;color:var(--accent);flex-shrink:0;"></i> <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;">ДЗ: ${this.escapeHtml(cleanHwText)}</span></div>`;
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
                  <div style="font-weight:700;font-size:16px;color:var(--text-primary);display:flex;align-items:center;gap:6px;">${this.escapeHtml(st.name)}<span title="Ударный режим (выполненных ДЗ подряд без пропусков)" style="font-size:11px;padding:2px 8px;border-radius:10px;background:rgba(249,115,22,0.15);color:#f97316;font-weight:800;border:1px solid rgba(249,115,22,0.3);display:inline-flex;align-items:center;gap:3px;">🔥 ${dossier.streak || 0} ДЗ</span></div>
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
            ${(dossier.unit || dossier.interests || dossier.errors) ? `<div style="margin-top:8px;font-size:11px;color:var(--text-secondary);display:flex;flex-direction:column;gap:2px;overflow:hidden;word-break:break-word;min-width:0;">${dossier.unit ? `<div style="color:var(--accent);">📖 <b>Программа:</b> ${this.escapeHtml(dossier.unit)}</div>` : ''}${dossier.interests ? `<div>🎯 <b>Интересы:</b> ${this.escapeHtml(dossier.interests)}</div>` : ''}${dossier.errors ? `<div style="color:var(--warning);">⚠️ <b>Ошибки:</b> ${this.escapeHtml(dossier.errors)}</div>` : ''}</div>` : ''}
            ${hwStatusBadge}

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:14px; padding-top:12px; border-top:1px dashed var(--border-light); width: 100%; flex-wrap:wrap; min-width:0;">
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
                  ${displayHomework ? `<div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;"><i data-lucide="edit-3" style="width:12px;height:12px;"></i> <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.escapeHtml(displayHomework.replace('[ДЗ_ПРОВЕРЕНО]', '✅ ').replace('[ДЗ_СДАНО]', '📬 '))}</span> ${(ls.homework || '').includes('[ДЗ_СДАНО]') && !(ls.homework || '').includes('[ДЗ_ПРОВЕРЕНО]') ? `<span style="font-size:10px;background:rgba(59,130,246,0.15);color:#3b82f6;font-weight:700;padding:2px 6px;border-radius:6px;display:inline-flex;align-items:center;gap:2px;">📬 Сдано в ТГ!</span><button class="btn btn-secondary btn-xs" style="font-size:10px;padding:2px 6px;color:var(--success);border-color:rgba(16,185,129,0.3);" onclick="event.stopPropagation(); TutoringPage.markPrevHwChecked('${ls.id}')">✅ Проверено</button>` : ((ls.homework || '').includes('[ДЗ_ПРОВЕРЕНО]') ? `<span style="font-size:10px;background:rgba(16,185,129,0.12);color:var(--success);font-weight:700;padding:2px 6px;border-radius:6px;">✅ Проверено</span>` : '')}</div>` : ''}
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
      document.getElementById('st-parent-tg-user')?.value?.trim() || freshDoss.parentTgUser || ''
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
    
    // Extract [СЦЕНАРИЙ_УРОКА]
    let scenario = '';
    const scMatch = displayHomework.match(/\[СЦЕНАРИЙ_УРОКА\]:([\s\S]*?)\[\/СЦЕНАРИЙ_УРОКА\]/);
    if (scMatch) {
      scenario = scMatch[1].trim();
      displayHomework = displayHomework.replace(scMatch[0], '').trim();
    }
    displayHomework = displayHomework.replace(/\[КАРТОЧКИ_ДЗ\]:[\s\S]*?\[\/КАРТОЧКИ_ДЗ\]/, '').trim();

    document.getElementById('ls-homework').value = displayHomework;
    const scenEl = document.getElementById('ls-scenario');
    if (scenEl) scenEl.value = scenario;
    document.getElementById('ls-materials').value = materials;

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
    document.getElementById('ls-paid').checked = ls ? ls.paid : false;

    const delBtn = document.getElementById('lesson-modal-delete');
    delBtn.style.display = ls ? '' : 'none';

    // AI Generation click
    // Extract attached cards
    this.attachedCards = this.parseCardsFromHomework(ls?.homework || '');
    this.renderCardsPreview();
    this.bindLessonModalMediaAndDebrief(ls, sSelect.value);

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
    if (id) {
      const prevLsObj = this.lessons.find(l => l.id === id);
      if (prevLsObj && prevLsObj.status === 'Запланирован' && new Date(prevLsObj.date).getTime() !== new Date(dStr).getTime() && !homework.includes('[ПЕРЕНЕСЕН_В_ТГ]')) {
        homework = (homework ? homework + '\n' : '') + '[ПЕРЕНЕСЕН_В_ТГ]';
      }
    }
    // Clean old cards & scenario, then serialize both
    homework = homework.replace(/\\n\[КАРТОЧКИ_ДЗ\]:[\s\S]*?\[\/КАРТОЧКИ_ДЗ\]/, '').trim();
    if (this.attachedCards && this.attachedCards.length > 0) {
      homework += '\\n[КАРТОЧКИ_ДЗ]:\\n' + this.attachedCards.join('||') + '\\n[/КАРТОЧКИ_ДЗ]';
    }

    const scenarioVal = document.getElementById('ls-scenario')?.value?.trim() || '';
    homework = homework.replace(/\\n\[СЦЕНАРИЙ_УРОКА\]:[\s\S]*?\[\/СЦЕНАРИЙ_УРОКА\]/, '').trim();
    if (scenarioVal) {
      homework += '\\n[СЦЕНАРИЙ_УРОКА]:\\n' + scenarioVal + '\\n[/СЦЕНАРИЙ_УРОКА]';
    }

    const materials = document.getElementById('ls-materials').value.trim();
    if (materials) {
      homework += '\\n[МАТЕРИАЛЫ]:\\n' + materials;
    }
    if (id) {
      const oldLs = this.lessons.find(l => l.id === id);
      if (false && oldLs) {
        homework = (homework ? homework + '\n' : '') + '[ПЕРЕНЕСЕН_В_ТГ]';
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
    const wasConducted = ls ? ls.status === 'Проведен' : false;
    if (isConductedNow && !wasConducted) {
      const stObj = this.students.find(s => s.id === student_id);
      const dossObj = stObj ? this.parseStudentDossier(stObj) : {};
      if (dossObj.tgId && data.homework && !data.homework.includes('[ОТПРАВИТЬ_В_ТГ]')) {
        data.homework = `[ОТПРАВИТЬ_В_ТГ] ${data.homework}`;
      }
      if (dossObj.parentTgId && !data.homework.includes('[ОТПРАВИТЬ_РОДИТЕЛЮ_В_ТГ]')) {
        data.homework = `${data.homework || ''} [ОТПРАВИТЬ_РОДИТЕЛЮ_В_ТГ]`.trim();
      }
    }
    
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
      const nextIdx = rest.search(/\\n\[(ЗАМЕТКИ|ИНТЕРЕСЫ|ОШИБКИ|СЛОВАРЬ|PERPLEXITY|УЧЕБНИК|TG_ID|TG_USER|PARENT_TG_ID|PARENT_TG_USER|СТРИК)\]:|\n\[(ЗАМЕТКИ|ИНТЕРЕСЫ|ОШИБКИ|СЛОВАРЬ|PERPLEXITY|УЧЕБНИК|TG_ID|TG_USER|PARENT_TG_ID|PARENT_TG_USER|СТРИК)\]:/);
      return (nextIdx === -1 ? rest : rest.slice(0, nextIdx)).replace(/^\\n|^\n/, '').trim();
    };
    const firstTagIdx = raw.search(/\\n\[(ЗАМЕТКИ|ИНТЕРЕСЫ|ОШИБКИ|СЛОВАРЬ|PERPLEXITY|УЧЕБНИК|TG_ID|TG_USER|PARENT_TG_ID|PARENT_TG_USER|СТРИК)\]:|\n\[(ЗАМЕТКИ|ИНТЕРЕСЫ|ОШИБКИ|СЛОВАРЬ|PERPLEXITY|УЧЕБНИК|TG_ID|TG_USER|PARENT_TG_ID|PARENT_TG_USER|СТРИК)\]:/);
    const schedule = (firstTagIdx === -1 ? raw : raw.slice(0, firstTagIdx)).trim();
    return {
      schedule,
      tgId: getSec('[TG_ID]:'),
      tgUser: getSec('[TG_USER]:'),
      parentTgId: getSec('[PARENT_TG_ID]:'),
      parentTgUser: getSec('[PARENT_TG_USER]:'),
      streak: parseInt(getSec('[СТРИК]:') || '0', 10) || 0,
      perplexity: getSec('[PERPLEXITY]:'),
      unit: getSec('[УЧЕБНИК]:'),
      interests: getSec('[ИНТЕРЕСЫ]:'),
      errors: getSec('[ОШИБКИ]:'),
      vocab: getSec('[СЛОВАРЬ]:'),
      notes: getSec('[ЗАМЕТКИ]:')
    };
  },

  serializeStudentDossier(schedule, interests, errors, vocab, notes, perplexity = '', unit = '', tgId = '', tgUser = '', streak = 0, parentTgId = '', parentTgUser = '') {
    let out = schedule || '';
    if (tgId) out += `\\n[TG_ID]:\\n${tgId}`;
    if (tgUser) out += `\\n[TG_USER]:\\n${tgUser}`;
    if (parentTgId) out += `\\n[PARENT_TG_ID]:\\n${parentTgId}`;
    if (parentTgUser) out += `\\n[PARENT_TG_USER]:\\n${parentTgUser}`;
    if (streak) out += `\\n[СТРИК]:\\n${streak}`;
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
    const isSubmitted = prevHwRaw.includes('[ДЗ_СДАНО]');
    const cleanHw = prevHwRaw.replace('[ДЗ_ПРОВЕРЕНО]', '').replace('[ДЗ_СДАНО]', '').replace('[ОТПРАВИТЬ_В_ТГ]', '').trim();

    banner.innerHTML = `
      <div style="padding:10px 12px;border-radius:10px;background:var(--bg-primary);border:1px solid var(--border-light);font-size:12px;display:flex;flex-direction:column;gap:4px;">
        <div style="font-weight:700;color:var(--accent);display:flex;justify-content:space-between;align-items:center;">
          <span>🧠 Память по ученику: ${this.escapeHtml(st.name)}</span>
          ${prev ? `<span style="font-size:11px;color:var(--text-muted);">Прошлый урок: ${new Date(prev.date).toLocaleDateString('ru-RU')}</span>` : ''}
        </div>
        ${prev ? `<div>⏪ <b>Прошлая тема:</b> ${this.escapeHtml(prev.topic || 'Не указана')}</div>` : '<div style="color:var(--text-muted);">Проведённых уроков пока нет</div>'}
        ${cleanHw ? `<div style="color:${isChecked ? 'var(--success)' : 'var(--warning)'};">📌 <b>Заданное ДЗ:</b> ${this.escapeHtml(cleanHw)} ${isSubmitted && !isChecked ? '<span style="color:var(--accent);font-weight:700;">📬 (Сдано учеником в ТГ!)</span>' : ''} ${isChecked ? '✅ (Проверено)' : `<button type="button" class="btn btn-secondary btn-xs" style="font-size:10px;padding:1px 6px;margin-left:6px;" onclick="TutoringPage.markPrevHwChecked('${prev.id}').then(()=>TutoringPage.renderLessonMemoryBanner('${studentId}'))">✅ Отметить проверенным</button>`}</div>` : ''}
        ${ebb ? `<div style="color:#0d9488;font-weight:600;">🔄 <b>Кривая Эббингауза (повторить тему ~2 нед. назад, ${new Date(ebb.date).toLocaleDateString('ru-RU')}):</b> ${this.escapeHtml(ebb.topic)}</div>` : ''}
        ${dossier.unit ? `<div>📖 <b>Учебник / Unit:</b> ${this.escapeHtml(dossier.unit)}</div>` : ''}
        ${dossier.errors ? `<div>⚠️ <b>Слабые места:</b> ${this.escapeHtml(dossier.errors)}</div>` : ''}
        ${dossier.interests ? `<div>🎯 <b>Интересы:</b> ${this.escapeHtml(dossier.interests)}</div>` : ''}
      </div>
    `;
  },

  async generateMonthlyReport(studentId) {
    UI.toast('Сверяю данные и формирую ИИ-отчёт...', 'info');
    await this.load();
    const st = this.students.find(s => s.id === studentId);
    if (!st) return;
    const dossier = this.parseStudentDossier(st);
    const stLessons = this.lessons.filter(l => l.student_id === studentId && l.status === 'Проведен');
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
      const scenEl = document.getElementById('ls-scenario');
      if (scenEl) scenEl.value = rawText.trim();
      if (parsed.new_vocab) {
        const dossier = this.parseStudentDossier(st);
        const existingVocab = dossier.vocab ? `${dossier.vocab}, ${parsed.new_vocab}` : parsed.new_vocab;
        const newSchedule = this.serializeStudentDossier(dossier.schedule, dossier.interests, dossier.errors, existingVocab, dossier.notes, dossier.perplexity, dossier.unit, dossier.tgId, dossier.tgUser, dossier.streak, dossier.parentTgId, dossier.parentTgUser);
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
    const cardsMatch = rawHw.match(/\[КАРТОЧКИ_ДЗ\]:([\s\S]*?)\[\/КАРТОЧКИ_ДЗ\]/);
    this.dispatcherCards = cardsMatch ? cardsMatch[1].trim().split('||').map(s=>s.trim()).filter(Boolean) : [];
    
    const scenMatch = rawHw.match(/\[СЦЕНАРИЙ_УРОКА\]:([\s\S]*?)\[\/СЦЕНАРИЙ_УРОКА\]/);
    const existingScenario = scenMatch ? scenMatch[1].trim() : '';

    const cleanHwText = rawHw
      .replace(/\[КАРТОЧКИ_ДЗ\]:[\s\S]*?\[\/КАРТОЧКИ_ДЗ\]/, '')
      .replace(/\[СЦЕНАРИЙ_УРОКА\]:[\s\S]*?\[\/СЦЕНАРИЙ_УРОКА\]/, '')
      .replace(/\[МАТЕРИАЛЫ\]:[\s\S]*/, '')
      .replace('[ДЗ_ПРОВЕРЕНО]', '')
      .replace('[ДЗ_СДАНО]', '')
      .replace('[ОТПРАВИТЬ_В_ТГ]', '')
      .replace('[ОТПРАВИТЬ_РОДИТЕЛЮ_В_ТГ]', '')
      .trim();

    document.getElementById('hw-disp-topic').value = ls?.topic || '';
    document.getElementById('hw-disp-text').value = cleanHwText || '';
    document.getElementById('hw-disp-scenario').value = existingScenario || '';
    document.getElementById('hw-disp-send-parent').checked = !!dossier.parentTgId;

    this.renderDispatcherCardsPreview();
    this.bindDispatcherModalEvents(st, ls);

    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
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
  },

  addDispatcherCard(dataUrl) {
    if (!this.dispatcherCards) this.dispatcherCards = [];
    if (this.dispatcherCards.length >= 10) return UI.toast('Максимум 10 карточек на урок', 'warning');
    this.dispatcherCards.push(dataUrl);
    this.renderDispatcherCardsPreview();
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
          UI.toast('Конспект из Perplexity вставлен в материалы урока!', 'success');
        } catch(e) {
          document.getElementById('hw-disp-scenario').value = rawText.trim();
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
          const hw = await Gemini.generateTutoringAI('homework', { name: st.name, grade: st.grade, ...dossier }, { topic }, ls);
          document.getElementById('hw-disp-text').value = hw;
          UI.toast('ДЗ сгенерировано!', 'success');
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
      const scenarioText = document.getElementById('hw-disp-scenario').value.trim();
      const sendToParent = document.getElementById('hw-disp-send-parent').checked;

      if (!hwText && this.dispatcherCards.length === 0) {
        return UI.toast('Напишите текст ДЗ или прикрепите карточки!', 'warning');
      }

      sendBtn.disabled = true;
      sendBtn.textContent = '⏳ Отправляю...';

      try {
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

        // Build composite homework string
        let compositeHw = hwText;
        if (this.dispatcherCards.length > 0) {
          compositeHw += `\n[КАРТОЧКИ_ДЗ]:\n${this.dispatcherCards.join('||')}\n[/КАРТОЧКИ_ДЗ]`;
        }
        if (scenarioText) {
          compositeHw += `\n[СЦЕНАРИЙ_УРОКА]:\n${scenarioText}\n[/СЦЕНАРИЙ_УРОКА]`;
        }

        compositeHw = `[ОТПРАВИТЬ_В_ТГ] ${compositeHw}`;
        if (sendToParent) {
          compositeHw += ' [ОТПРАВИТЬ_РОДИТЕЛЮ_В_ТГ]';
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
              const newSched = this.serializeStudentDossier(dossier.schedule, dossier.interests, dossier.errors, updatedVocab, dossier.notes, dossier.perplexity, dossier.unit, dossier.tgId, dossier.tgUser, dossier.streak, dossier.parentTgId, dossier.parentTgUser);
              await DB.updateStudent(st.id, { schedule: newSched });
            }
          } catch(e) {}
        }

        modal.classList.add('hidden');
        UI.toast(`🚀 Домашнее задание и материалы отправлены ${st.name} в Telegram!`, 'success');
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

    if (!dossier.parentTgId) {
      if (dossier.parentTgUser) {
        const reportText = customReportText || await Gemini.generateTutoringAI('parent_msg', { name: st.name, grade: st.grade, ...dossier }, { topic: currentTopicText || ls?.topic || 'Английский язык', homework: currentHwText || ls?.homework || '' }, ls);
        try { await navigator.clipboard.writeText(reportText); } catch (e) {}
        const cleanUser = dossier.parentTgUser.replace('@', '').trim();
        window.open(`https://t.me/${cleanUser}?text=${encodeURIComponent(reportText)}`, '_blank');
        return;
      }
      UI.toast(`Родитель (${st.name}) ещё не подключён к ТГ-боту — копирую ссылку-приглашение!`, 'warning');
      await this.copyParentBotInvite(studentId);
      return;
    }

    // Если родитель подключен к боту (есть parentTgId):
    if (!ls && modalOpen && (currentTopicText || currentHwText)) {
      const dt = document.getElementById('ls-date')?.value || new Date().toISOString();
      ls = await DB.createLesson({
        student_id: studentId,
        date: dt,
        topic: currentTopicText || 'Английский язык',
        homework: currentHwText || '',
        status: 'Проведен',
        paid: false
      });
      this.lessons.unshift(ls);
    }

    if (ls) {
      const baseHw = (modalOpen && currentHwText) ? currentHwText : (ls.homework || '');
      const clean = baseHw.replace('[ОТПРАВИТЬ_РОДИТЕЛЮ_В_ТГ]', '').trim();
      await DB.updateLesson(ls.id, {
        topic: (modalOpen && currentTopicText) ? currentTopicText : ls.topic,
        homework: `${clean} [ОТПРАВИТЬ_РОДИТЕЛЮ_В_ТГ]`.trim()
      });
      UI.toast(`👨‍👩‍👧 Команда передана боту! В течение 5 секунд ИИ-отчёт об уроке уйдёт родителю (${st.name}) в Telegram.`, 'success');
      return;
    }

    // Если проведенных уроков пока нет, формируем сводный отчёт о прогрессе через модалку
    return this.generateMonthlyReport(studentId);
  },

  attachedCards: [],
  _voiceRec: null,

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

  addCardDataUrl(dataUrl) {
    if (!this.attachedCards) this.attachedCards = [];
    if (this.attachedCards.length >= 10) return UI.toast('Максимум 10 карточек на урок', 'warning');
    this.attachedCards.push(dataUrl);
    this.renderCardsPreview();
    UI.toast('Карточка прикреплена к ДЗ!', 'success');
  },

  bindLessonModalMediaAndDebrief(ls, studentId) {
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
        files.forEach(file => {
          if (!file.type.startsWith('image/')) return;
          const reader = new FileReader();
          reader.onload = (ev) => this.addCardDataUrl(ev.target.result);
          reader.readAsDataURL(file);
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
        files.forEach(file => {
          if (!file.type.startsWith('image/')) return;
          const reader = new FileReader();
          reader.onload = (ev) => this.addCardDataUrl(ev.target.result);
          reader.readAsDataURL(file);
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
            const reader = new FileReader();
            reader.onload = (ev) => this.addCardDataUrl(ev.target.result);
            reader.readAsDataURL(blob);
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

  escapeHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
