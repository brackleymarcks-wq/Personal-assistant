// ============================================
// CHAT PAGE
// ============================================

const ChatPage = {
  messages: [],
  isTyping: false,
  historyLoaded: false,

  render() {
    return `
      <div class="chat-page" id="chat-page">
        <div class="chat-header">
          <div class="chat-header-info">
            <div class="assistant-avatar">🤖</div>
            <div>
              <div class="assistant-name">Ассистент</div>
              <div class="assistant-status">Готов к работе</div>
            </div>
          </div>
          <div class="chat-time">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <span id="chat-clock"></span>
            <button class="btn btn-sm btn-secondary" id="clear-chat-btn" title="Очистить историю">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
          </div>
        </div>

        <div id="chat-messages" class="chat-messages">
          <div id="chat-welcome" class="chat-welcome">
            <div class="welcome-icon">👋</div>
            <div class="welcome-title">Привет, ${Config.userName}!</div>
            <div class="welcome-subtitle">Я твой персональный ассистент. Помогу спланировать день, разобраться с задачами и не упустить важное.</div>
            <div class="welcome-shortcuts">
              <button class="welcome-shortcut" data-prompt="Сделай утренний брифинг — что у меня на сегодня?">
                <div class="shortcut-icon">☀️</div>
                <div class="shortcut-label">Утренний брифинг</div>
              </button>
              <button class="welcome-shortcut" data-prompt="Покажи все мои активные задачи и что сейчас в приоритете">
                <div class="shortcut-icon">✅</div>
                <div class="shortcut-label">Активные задачи</div>
              </button>
              <button class="welcome-shortcut" data-prompt="Помоги спланировать неделю. Что важного нужно сделать?">
                <div class="shortcut-icon">📅</div>
                <div class="shortcut-label">Планирование недели</div>
              </button>
              <button class="welcome-shortcut" data-prompt="Сделай вечерний разбор — что сделано сегодня, что переносим?">
                <div class="shortcut-icon">🌙</div>
                <div class="shortcut-label">Вечерний разбор</div>
              </button>
            </div>
          </div>
        </div>

        <div class="chat-input-area">
          <div class="chat-input-wrapper">
            <button id="chat-file-btn" class="chat-input-icon-btn" title="Прикрепить файл">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <input type="file" id="chat-file-input" style="display:none" accept=".txt,.md,.json,.js,.css,.html" />

            <button id="chat-voice-btn" class="chat-input-icon-btn" title="Голосовой ввод">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>
            </button>

            <textarea
              id="chat-input"
              placeholder="Напиши сообщение или надиктуй голосом..."
              rows="1"
            ></textarea>
            <button id="chat-send-btn" class="chat-send-btn" disabled>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></svg>
            </button>
          </div>
          <div class="chat-hints">
            <button class="chat-hint" data-prompt="Что мне сейчас сделать?">Что сейчас делать?</button>
            <button class="chat-hint" data-prompt="Есть ли просроченные задачи?">Просроченные задачи</button>
            <button class="chat-hint" data-prompt="Напомни что такое Deep Work и как правильно его использовать">Deep Work</button>
            <button class="chat-hint" data-prompt="Я немного устал. Что посоветуешь?">Я устал</button>
          </div>
        </div>
      </div>
    `;
  },

  async init() {
    this.bindEvents();
    this.startClock();
    await this.loadHistory();
  },

  bindEvents() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 160) + 'px';
      sendBtn.disabled = !input.value.trim();
    });

    // Send on Enter (Shift+Enter = newline)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) this.sendMessage();
      }
    });

    sendBtn.addEventListener('click', () => this.sendMessage());

    // Welcome shortcuts
    document.querySelectorAll('.welcome-shortcut').forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = btn.dataset.prompt;
        input.value = prompt;
        input.dispatchEvent(new Event('input'));
        this.sendMessage();
      });
    });

    // Chat hints
    document.querySelectorAll('.chat-hint').forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = btn.dataset.prompt;
        input.value = prompt;
        input.dispatchEvent(new Event('input'));
        this.sendMessage();
      });
    });

    // Clear chat
    document.getElementById('clear-chat-btn').addEventListener('click', async () => {
      if (!confirm('Очистить всю историю чата?')) return;
      await DB.clearMessages();
      this.messages = [];
      const container = document.getElementById('chat-messages');
      container.innerHTML = '';
      document.getElementById('chat-welcome').classList.remove('hidden');
      UI.toast('История очищена', 'info');
    });

    // Voice Input (SpeechRecognition)
    const voiceBtn = document.getElementById('chat-voice-btn');
    let recognition = null;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'ru-RU';
      recognition.interimResults = false;

      recognition.onstart = () => {
        voiceBtn.classList.add('active');
        UI.toast('Слушаю...', 'info', 1500);
      };

      recognition.onend = () => {
        voiceBtn.classList.remove('active');
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        voiceBtn.classList.remove('active');
        UI.toast('Ошибка распознавания: ' + event.error, 'error');
      };

      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        if (text) {
          const currentText = input.value.trim();
          input.value = currentText ? `${currentText} ${text}` : text;
          input.dispatchEvent(new Event('input'));
        }
      };

      voiceBtn.addEventListener('click', () => {
        if (voiceBtn.classList.contains('active')) {
          recognition.stop();
        } else {
          recognition.start();
        }
      });
    } else {
      voiceBtn.style.display = 'none';
    }

    // File Upload
    const fileBtn = document.getElementById('chat-file-btn');
    const fileInput = document.getElementById('chat-file-input');

    fileBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (evt) => {
        const content = evt.target.result;
        try {
          UI.toast(`Загрузка файла: ${file.name}...`, 'info');
          
          // Add to DB
          await DB.addUploadedFile(file.name, file.type || 'text/plain', content);
          
          // Also save to Knowledge base so it is retrievable
          await DB.createKnowledge({
            title: `Файл: ${file.name}`,
            type: 'Заметка',
            content: `Содержимое загруженного файла "${file.name}":\n\n\`\`\`\n${content}\n\`\`\``,
            tags: ['файл', file.name.split('.').pop()]
          });

          UI.toast(`Файл "${file.name}" загружен`, 'success');
          
          // Notify in chat
          this.appendMessage('assistant', `📎 Я загрузил файл **${file.name}** в базу знаний и запомнил его содержимое. Ты можешь спрашивать меня о нём!`);
          await DB.addMessage('assistant', `📎 Я загрузил файл **${file.name}** в базу знаний и запомнил его содержимое. Ты можешь спрашивать меня о нём!`);

        } catch (err) {
          console.error(err);
          UI.toast('Ошибка загрузки: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
      fileInput.value = ''; // Reset input
    });
  },

  startClock() {
    const update = () => {
      const el = document.getElementById('chat-clock');
      if (el) {
        el.textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      }
    };
    update();
    setInterval(update, 60000);
  },

  async loadHistory() {
    this.historyLoaded = true;

    try {
      this.messages = await DB.getMessages(50);
      if (this.messages.length > 0) {
        document.getElementById('chat-welcome').style.display = 'none';
        this.messages.forEach(msg => {
          if (msg.role === 'user' || msg.role === 'assistant') {
            this.appendMessage(msg.role, msg.content, new Date(msg.created_at), false);
          }
        });
        this.scrollToBottom();
      }
    } catch (e) {
      console.error('loadHistory error:', e);
    }
  },

  async sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || this.isTyping) return;

    // Hide welcome
    const welcome = document.getElementById('chat-welcome');
    if (welcome) welcome.style.display = 'none';

    // Clear input
    input.value = '';
    input.style.height = 'auto';
    document.getElementById('chat-send-btn').disabled = true;

    // Show user message
    this.appendMessage('user', text);
    await DB.addMessage('user', text);
    this.messages.push({ role: 'user', content: text });

    // Show typing
    this.showTyping();
    this.isTyping = true;

    try {
      const reply = await Gemini.chat(text, this.messages.filter(m => m.role !== 'system'));

      this.hideTyping();
      this.appendMessage('assistant', reply);
      await DB.addMessage('assistant', reply);
      this.messages.push({ role: 'assistant', content: reply });

    } catch (e) {
      this.hideTyping();
      console.error('Chat error:', e);
      const errMsg = `Ошибка: ${e.message}. Проверь API ключ в настройках.`;
      this.appendMessage('assistant', errMsg);
    } finally {
      this.isTyping = false;
    }
  },

  appendMessage(role, content, time = new Date(), animate = true) {
    const container = document.getElementById('chat-messages');
    const isUser = role === 'user';
    const timeStr = time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const initial = Config.userName.charAt(0).toUpperCase();

    const html = `
      <div class="message ${isUser ? 'user-message' : 'assistant-message'}" ${animate ? '' : 'style="animation:none"'}>
        <div class="message-avatar">${isUser ? initial : '🤖'}</div>
        <div class="message-content">
          <div class="message-bubble">${isUser ? this.escapeHtml(content) : this.renderMarkdown(content)}</div>
          <div style="display:flex;align-items:center;gap:4px">
            <span class="message-time">${timeStr}</span>
            ${!isUser ? `
              <div class="message-actions">
                <button class="message-action-btn" title="Скопировать" onclick="ChatPage.copyMessage(this)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
                <button class="message-action-btn" title="В базу знаний" onclick="ChatPage.saveToKnowledge(this)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', html);
    this.scrollToBottom();
  },

  showTyping() {
    const container = document.getElementById('chat-messages');
    container.insertAdjacentHTML('beforeend', `
      <div class="typing-indicator" id="typing-indicator">
        <div class="message-avatar" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;margin-top:4px;">🤖</div>
        <div class="typing-bubble">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `);
    this.scrollToBottom();
  },

  hideTyping() {
    document.getElementById('typing-indicator')?.remove();
  },

  scrollToBottom() {
    const container = document.getElementById('chat-messages');
    if (container) container.scrollTop = container.scrollHeight;
  },

  renderMarkdown(text) {
    try {
      return marked.parse(text, { breaks: true, gfm: true });
    } catch {
      return this.escapeHtml(text).replace(/\n/g, '<br>');
    }
  },

  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>');
  },

  copyMessage(btn) {
    const bubble = btn.closest('.message-content').querySelector('.message-bubble');
    navigator.clipboard.writeText(bubble.innerText).then(() => UI.toast('Скопировано!', 'success'));
  },

  async saveToKnowledge(btn) {
    const bubble = btn.closest('.message-content').querySelector('.message-bubble');
    const content = bubble.innerText;
    try {
      await DB.createKnowledge({
        title: content.substring(0, 60) + (content.length > 60 ? '…' : ''),
        type: 'Заметка',
        content,
        tags: ['из-чата']
      });
      UI.toast('Сохранено в базу знаний', 'success');
    } catch (e) {
      UI.toast('Ошибка сохранения', 'error');
    }
  }
};
