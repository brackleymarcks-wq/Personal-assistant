// ============================================
// GLOBAL FLOATING CHAT WIDGET
// ============================================

window.ChatWidget = {
  isOpen: false,
  isTyping: false,
  messages: [],
  historyLoaded: false,

  init() {
    this.bindEvents();
    
    // Auto-load history in background
    setTimeout(() => {
      this.loadHistory();
    }, 2000);
  },

  bindEvents() {
    const fab = document.getElementById('global-chat-fab');
    const panel = document.getElementById('global-chat-panel');
    const closeBtn = document.getElementById('global-chat-close');
    const input = document.getElementById('global-chat-input');
    const sendBtn = document.getElementById('global-chat-send');

    if (!fab || !panel) return;

    fab.addEventListener('click', () => this.toggle());
    closeBtn.addEventListener('click', () => this.close());

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
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
  },

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  },

  open() {
    const panel = document.getElementById('global-chat-panel');
    const fab = document.getElementById('global-chat-fab');
    if (!panel || !fab) return;
    
    panel.classList.add('open');
    fab.classList.add('active');
    this.isOpen = true;
    
    setTimeout(() => {
      document.getElementById('global-chat-input').focus();
    }, 300);

    if (!this.historyLoaded) {
      this.loadHistory();
    }
  },

  close() {
    const panel = document.getElementById('global-chat-panel');
    const fab = document.getElementById('global-chat-fab');
    if (!panel || !fab) return;

    panel.classList.remove('open');
    fab.classList.remove('active');
    this.isOpen = false;
  },

  async loadHistory() {
    if (this.historyLoaded) return;
    this.historyLoaded = true;

    try {
      this.messages = await DB.getMessages(30);
      const container = document.getElementById('global-chat-messages');
      container.innerHTML = '';
      
      if (this.messages.length === 0) {
        container.innerHTML = `
          <div style="text-align:center; padding: 20px; color: var(--text-muted); font-size: 13px;">
            <i data-lucide="bot" style="width: 32px; height: 32px; color: var(--accent); margin-bottom: 8px;"></i>
            <div>Привет! Я твой ИИ-ассистент. Я могу помочь с задачами, проектами и вижу, что у тебя сейчас открыто.</div>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
      } else {
        this.messages.forEach(msg => {
          if (msg.role === 'user' || msg.role === 'assistant') {
            this.appendMessage(msg.role, msg.content, new Date(msg.created_at), false);
          }
        });
        this.scrollToBottom();
      }
    } catch (e) {
      console.error('Chat history error:', e);
    }
  },

  getContext() {
    let contextStr = '';
    
    // 1. Check if PeekView is open (topmost modal)
    if (typeof window.PeekView !== 'undefined' && window.PeekView.isOpen) {
      // Find title and text inside peek modal
      const body = document.getElementById('peek-modal-body');
      const text = body ? body.innerText : '';
      if (text) {
        contextStr += `[КОНТЕКСТ: Пользователь сейчас читает карточку во всплывающем окне.\nТекст карточки:\n${text.substring(0, 4000)}\n]\n\n`;
      }
    }
    // 2. Check if NotesPage is open and a note is being edited
    else if (typeof window.NotesPage !== 'undefined' && window.NotesPage.activeNoteId && window.NotesPage.toastEditor) {
      const title = document.getElementById('editor-title')?.value || 'Без названия';
      const content = window.NotesPage.toastEditor.getMarkdown().trim();
      if (content) {
        contextStr += `[КОНТЕКСТ: Пользователь сейчас редактирует Заметку "${title}". Текст заметки:\n${content.substring(0, 4000)}\n]\n\n`;
      }
    }
    // 3. Fallback to old KnowledgePage logic just in case
    else if (typeof App !== 'undefined' && App.currentModule && typeof KnowledgePage !== 'undefined' && App.currentModule === KnowledgePage) {
      if (KnowledgePage.activeItemId && KnowledgePage.editorInstance) {
        const title = document.getElementById('kb-editor-title')?.value || 'Без названия';
        const content = KnowledgePage.editorInstance.getMarkdown().trim();
        if (content) {
          contextStr += `[КОНТЕКСТ: Пользователь читает Базу Знаний "${title}". Текст:\n${content.substring(0, 4000)}\n]\n\n`;
        }
      }
    }
    
    // You can add more context rules here (e.g., active task, etc.)
    return contextStr;
  },

  async sendMessage() {
    const input = document.getElementById('global-chat-input');
    const text = input.value.trim();
    if (!text || this.isTyping) return;

    input.value = '';
    input.style.height = 'auto';
    document.getElementById('global-chat-send').disabled = true;

    // Clear welcome message if it's the first message
    if (this.messages.length === 0) {
      document.getElementById('global-chat-messages').innerHTML = '';
    }

    this.appendMessage('user', text);
    await DB.addMessage('user', text);
    this.messages.push({ role: 'user', content: text });

    this.showTyping();
    this.isTyping = true;

    try {
      const context = this.getContext();
      let promptToSend = text;
      
      // Inject context secretly into the latest message sent to LLM
      if (context) {
        promptToSend = `${context}Пользователь пишет: ${text}`;
      }

      // Create a temporary messages array to send to Gemini
      const messagesToSend = this.messages.map(m => ({ ...m }));
      messagesToSend[messagesToSend.length - 1].content = promptToSend; // overwrite the last user message with the context-injected one

      const reply = await Gemini.chat(text, messagesToSend.filter(m => m.role !== 'system'));

      this.hideTyping();
      this.appendMessage('assistant', reply);
      await DB.addMessage('assistant', reply);
      this.messages.push({ role: 'assistant', content: reply });

    } catch (e) {
      this.hideTyping();
      console.error('Chat error:', e);
      const errMsg = `Ошибка: ${e.message}.`;
      this.appendMessage('assistant', errMsg);
    } finally {
      this.isTyping = false;
    }
  },

  appendMessage(role, content, time = new Date(), animate = true) {
    const container = document.getElementById('global-chat-messages');
    const isUser = role === 'user';
    const timeStr = time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    let parsedContent = isUser ? this.escapeHtml(content) : this.renderMarkdown(content);

    const html = `
      <div class="chat-widget-msg ${isUser ? 'user' : 'assistant'}" ${animate ? '' : 'style="animation:none"'}>
        <div class="chat-widget-bubble">${parsedContent}</div>
        <div class="chat-widget-time">${timeStr}</div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', html);
    this.scrollToBottom();
  },

  showTyping() {
    const container = document.getElementById('global-chat-messages');
    container.insertAdjacentHTML('beforeend', `
      <div class="chat-widget-msg assistant typing-indicator" id="global-chat-typing">
        <div class="chat-widget-bubble">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `);
    this.scrollToBottom();
  },

  hideTyping() {
    document.getElementById('global-chat-typing')?.remove();
  },

  scrollToBottom() {
    const container = document.getElementById('global-chat-messages');
    if (container) container.scrollTop = container.scrollHeight;
  },

  renderMarkdown(text) {
    try {
      return marked.parse(text, { breaks: true, gfm: true });
    } catch {
      return this.escapeHtml(text).replace(/\\n/g, '<br>');
    }
  },

  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\\n/g, '<br>');
  }
};
