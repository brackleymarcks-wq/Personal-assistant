// ============================================
// FINANCES PAGE
// ============================================

const FinancesPage = {
  transactions: [],
  categories: {
    income: ['Зарплата', 'Фриланс', 'Бизнес', 'Инвестиции', 'Подарки', 'Крипта', 'Кэшбэк', 'Другое'],
    expense: ['Продукты', 'Кафе и Рестораны', 'Транспорт', 'Авто', 'Жилье', 'Ипотека/Аренда', 'Развлечения', 'Здоровье', 'Одежда', 'Обучение', 'Подписки', 'Семья', 'Хобби', 'Техника', 'Путешествия', 'Другое']
  },

  // Map category names to lucide icons
  ICONS: {
    'Зарплата': 'briefcase', 'Фриланс': 'laptop', 'Бизнес': 'building', 'Инвестиции': 'trending-up',
    'Подарки': 'gift', 'Крипта': 'bitcoin', 'Кэшбэк': 'percent', 'Продукты': 'shopping-cart',
    'Кафе и Рестораны': 'coffee', 'Транспорт': 'bus', 'Авто': 'car', 'Жилье': 'home',
    'Ипотека/Аренда': 'key', 'Развлечения': 'film', 'Здоровье': 'heart', 'Одежда': 'shirt',
    'Обучение': 'book-open', 'Подписки': 'credit-card', 'Семья': 'users', 'Хобби': 'gamepad-2',
    'Техника': 'smartphone', 'Путешествия': 'plane', 'Другое': 'more-horizontal'
  },

  render() {
    return `
      <div class="finances-page" style="display:flex;flex-direction:column;height:100%;background:var(--bg-primary);overflow-y:auto;">
        <div class="page-header" style="background:var(--bg-surface);padding:var(--space-lg) var(--space-xl);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
          <div>
            <div class="page-title" style="font-size:20px;font-weight:700;">Финансы</div>
            <div class="page-subtitle" id="finance-subtitle" style="font-size:13px;color:var(--text-secondary);margin-top:2px;">Учет доходов и расходов</div>
          </div>
          <div class="page-actions" style="display:flex;gap:var(--space-sm);">
            <button class="btn btn-secondary" onclick="FinancesPage.openModal('income')" style="display:flex;align-items:center;gap:6px;color:var(--success);border-color:rgba(16, 185, 129, 0.3);background:rgba(16, 185, 129, 0.05);">
              <i data-lucide="arrow-down-left" style="width:16px;height:16px;"></i> Доход
            </button>
            <button class="btn btn-primary" onclick="FinancesPage.openModal('expense')" style="display:flex;align-items:center;gap:6px;background:var(--danger);border-color:var(--danger);">
              <i data-lucide="arrow-up-right" style="width:16px;height:16px;"></i> Расход
            </button>
          </div>
        </div>

        <div class="finance-dashboard" id="finance-summary">
          <!-- Populated by JS -->
        </div>

        <div class="finance-middle-section" style="display:grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg); padding: 0 var(--space-xl); margin-bottom: var(--space-lg);">
          <!-- Analytics -->
          <div class="glass-panel" style="padding: var(--space-lg); border-radius: var(--radius-lg);">
            <h3 style="font-size: 15px; margin-bottom: var(--space-lg); display: flex; align-items: center; gap: 8px; font-weight: 600;">
              <i data-lucide="pie-chart" style="color: var(--accent); width: 18px; height: 18px;"></i> Расходы по категориям
            </h3>
            <div id="finance-analytics" style="display: flex; flex-direction: column; gap: 14px; max-height: 250px; overflow-y: auto; padding-right: 8px;"></div>
          </div>

          <!-- AI Assistant -->
          <div class="glass-panel" style="padding: var(--space-lg); border-radius: var(--radius-lg); display: flex; flex-direction: column;">
            <h3 style="font-size: 15px; margin-bottom: var(--space-md); display: flex; align-items: center; gap: 8px; font-weight: 600;">
              <i data-lucide="sparkles" style="color: var(--accent-vibrant); width: 18px; height: 18px;"></i> Умная аналитика
            </h3>
            <div id="finance-ai-content" style="flex: 1; overflow-y: auto; font-size: 13.5px; line-height: 1.6; color: var(--text-secondary); margin-bottom: var(--space-md);">
              <p>Нажми кнопку, чтобы ИИ проанализировал твои траты в этом месяце, нашел скрытые закономерности и дал персональный совет.</p>
            </div>
            <button class="btn btn-primary btn-full" onclick="FinancesPage.runAIAnalysis()" id="finance-ai-btn">
              <i data-lucide="brain" style="width:16px; height:16px;"></i> Проанализировать месяц
            </button>
          </div>
        </div>

        <div style="padding: 0 var(--space-xl); font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 8px;">ИСТОРИЯ ОПЕРАЦИЙ</div>
        <div class="finance-list-container" id="transaction-list" style="margin-top: 0; padding-top: 0;">
          <div style="text-align:center;padding:var(--space-3xl);color:var(--text-muted);display:flex;flex-direction:column;align-items:center;gap:var(--space-md);">
            <i data-lucide="loader-2" class="spin" style="width:32px;height:32px;"></i>
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
      this.transactions = await DB.getTransactions();
      // Sort by date descending
      this.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      this.renderData();
    } catch (e) {
      console.error('Finances load error:', e);
    }
  },

  renderData() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthTx = this.transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    let income = 0;
    let expense = 0;

    monthTx.forEach(t => {
      if (t.type === 'income') income += Number(t.amount);
      if (t.type === 'expense') expense += Number(t.amount);
    });

    const balance = income - expense;

    // Render Summary
    document.getElementById('finance-summary').innerHTML = `
      <div class="finance-summary-card glass-panel" style="box-shadow: var(--shadow-sm);">
        <div class="finance-label">
          <i data-lucide="trending-up" style="width:14px;height:14px;color:var(--success);"></i>
          Доходы (Этот месяц)
        </div>
        <div class="finance-amount income">+${income.toLocaleString('ru-RU')} ₴</div>
      </div>
      <div class="finance-summary-card glass-panel" style="box-shadow: var(--shadow-sm);">
        <div class="finance-label">
          <i data-lucide="trending-down" style="width:14px;height:14px;color:var(--danger);"></i>
          Расходы (Этот месяц)
        </div>
        <div class="finance-amount expense">-${expense.toLocaleString('ru-RU')} ₴</div>
      </div>
      <div class="finance-summary-card card-balance glass-panel" style="box-shadow: 0 0 24px var(--shadow-glow);">
        <div class="finance-label" style="color:var(--accent);">
          <i data-lucide="wallet" style="width:14px;height:14px;"></i>
          Остаток
        </div>
        <div class="finance-amount" style="color:${balance < 0 ? 'var(--danger)' : 'var(--text-primary)'}">
          ${balance > 0 ? '+' : ''}${balance.toLocaleString('ru-RU')} ₴
        </div>
      </div>
    `;

    const subtitle = document.getElementById('finance-subtitle');
    if (subtitle) {
      const monthName = now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
      subtitle.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    }

    // Render Analytics (Expenses by category)
    const expensesByCategory = {};
    monthTx.forEach(t => {
      if (t.type === 'expense') {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + Number(t.amount);
      }
    });

    const analyticsEl = document.getElementById('finance-analytics');
    if (expense === 0) {
      analyticsEl.innerHTML = '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px 0;">Нет расходов в этом месяце</div>';
    } else {
      const sortedCategories = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]);
      analyticsEl.innerHTML = sortedCategories.map(([cat, amount]) => {
        const percent = Math.round((amount / expense) * 100);
        return `
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
              <span style="color: var(--text-primary); font-weight: 500;">${this.esc(cat)}</span>
              <span style="color: var(--text-secondary);">${amount.toLocaleString('ru-RU')} ₴ <span style="opacity:0.5;font-size:11px;margin-left:4px;">${percent}%</span></span>
            </div>
            <div style="width: 100%; height: 6px; background: var(--bg-hover); border-radius: 4px; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.2);">
              <div style="width: ${percent}%; height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-vibrant)); border-radius: 4px;"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Render List
    const list = document.getElementById('transaction-list');
    if (this.transactions.length === 0) {
      list.innerHTML = `
        <div class="empty-state" style="text-align:center;padding:var(--space-3xl) 0;display:flex;flex-direction:column;align-items:center;gap:var(--space-md);">
          <div style="width:64px;height:64px;border-radius:50%;background:var(--bg-surface);display:flex;align-items:center;justify-content:center;border:1px solid var(--border-light);">
            <i data-lucide="credit-card" style="width:32px;height:32px;color:var(--text-muted);"></i>
          </div>
          <div style="font-size:18px;font-weight:600;color:var(--text-primary)">Нет транзакций</div>
          <div style="font-size:14px;color:var(--text-secondary);">Добавьте свои первые доходы или расходы сверху</div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // Group by date
    const grouped = {};
    this.transactions.forEach(t => {
      // Calculate friendly date label
      const d = new Date(t.date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let dateLabel = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
      if (d.toDateString() === today.toDateString()) dateLabel = 'Сегодня';
      else if (d.toDateString() === yesterday.toDateString()) dateLabel = 'Вчера';

      if (!grouped[dateLabel]) grouped[dateLabel] = [];
      grouped[dateLabel].push(t);
    });

    let html = '';
    for (const [dateLabel, txs] of Object.entries(grouped)) {
      html += `<div class="transaction-date-group">${dateLabel}</div>`;
      html += txs.map(t => {
        const isIncome = t.type === 'income';
        const iconName = this.ICONS[t.category] || 'circle-dollar-sign';
        const wrapperClass = isIncome ? 'icon-income' : 'icon-expense';
        
        return `
          <div class="transaction-item" onclick="FinancesPage.editModal('${t.id}')">
            <div class="transaction-left">
              <div class="transaction-icon-wrapper ${wrapperClass}">
                <i data-lucide="${iconName}" style="width:20px;height:20px;"></i>
              </div>
              <div class="transaction-details">
                <div class="transaction-title">${this.esc(t.category)}</div>
                ${t.description ? `<div class="transaction-desc">${this.esc(t.description)}</div>` : ''}
              </div>
            </div>
            <div class="transaction-right">
              <div class="transaction-sum ${isIncome ? 'income' : 'expense'}">
                ${isIncome ? '+' : '-'}${Number(t.amount).toLocaleString('ru-RU')} ₴
              </div>
              <div class="transaction-time">
                ${new Date(t.date).toLocaleDateString('ru-RU', {day:'numeric', month:'short'})}
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    list.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  },

  async runAIAnalysis() {
    const btn = document.getElementById('finance-ai-btn');
    const content = document.getElementById('finance-ai-content');
    
    if (!btn || !content) return;
    
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="spin" style="width:16px;height:16px;"></i> Анализирую...';
    if (window.lucide) window.lucide.createIcons();

    try {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const monthTx = this.transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      let income = 0;
      let expense = 0;
      const categories = {};

      monthTx.forEach(t => {
        const amt = Number(t.amount);
        if (t.type === 'income') income += amt;
        if (t.type === 'expense') {
          expense += amt;
          categories[t.category] = (categories[t.category] || 0) + amt;
        }
      });

      const prompt = `Проанализируй мои финансы за текущий месяц. 
Доход: ${income} ₴. 
Расход: ${expense} ₴. 
Траты по категориям: ${JSON.stringify(categories)}. 

Сделай 2-3 коротких и емких вывода (например, почему ушло много денег, где норма, что можно оптимизировать) и дай 1 конкретный финансовый совет. 
Будь краток, используй markdown (жирный текст, списки), общайся со мной напрямую как персональный финансовый ассистент. Никаких общих фраз, только суть.`;

      const response = await Gemini.chat(prompt);
      content.innerHTML = window.marked ? marked.parse(response) : response;
      
    } catch (e) {
      console.error('AI Finance Error:', e);
      content.innerHTML = '<span style="color:var(--danger)">Ошибка при обращении к ИИ. Попробуйте позже.</span>';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="brain" style="width:16px;height:16px;"></i> Обновить анализ';
      if (window.lucide) window.lucide.createIcons();
    }
  },

  openModal(type, id = null) {
    const tx = id ? this.transactions.find(t => t.id === id) : null;
    const txType = tx ? tx.type : type;
    const isNew = !tx;
    
    const cats = this.categories[txType];
    const catOptions = cats.map(c => `<option value="${c}" ${tx?.category === c ? 'selected' : ''}>${c}</option>`).join('');

    const todayStr = new Date().toISOString().split('T')[0];
    const modalTitle = isNew 
      ? (txType === 'income' ? '<i data-lucide="arrow-down-left" style="color:var(--success);"></i> Новый доход' : '<i data-lucide="arrow-up-right" style="color:var(--danger);"></i> Новый расход') 
      : '<i data-lucide="edit-2"></i> Редактировать';

    const content = `
      <div class="form-group" style="text-align:center;margin-bottom:var(--space-xl);">
        <label class="form-label" style="text-align:center;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Сумма (₴)</label>
        <input type="number" id="tx-amount" style="font-size:48px;font-weight:800;text-align:center;border:none;background:transparent;outline:none;width:100%;color:${txType === 'income' ? 'var(--success)' : 'var(--text-primary)'};padding:0;" placeholder="0" min="0" step="1" value="${tx ? tx.amount : ''}" autofocus required>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Дата</label>
          <input type="date" id="tx-date" class="form-input" value="${tx ? tx.date : todayStr}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Категория</label>
          <select id="tx-category" class="form-input">
            ${catOptions}
          </select>
        </div>
      </div>
      
      <div class="form-group" style="margin-top:var(--space-md)">
        <label class="form-label">Описание / Комментарий</label>
        <input type="text" id="tx-desc" class="form-input" placeholder="Например: Супермаркет Сильпо" value="${tx ? this.esc(tx.description) : ''}">
      </div>
      <input type="hidden" id="tx-type" value="${txType}">
    `;

    const footer = `
      ${!isNew ? `<button class="btn btn-danger" onclick="FinancesPage.deleteTransaction('${id}')" style="display:flex;align-items:center;gap:6px;"><i data-lucide="trash-2"></i> Удалить</button>` : '<div></div>'}
      <div style="display:flex;gap:var(--space-sm);margin-left:auto">
        <button class="btn btn-secondary" onclick="UI.closeModal()">Отмена</button>
        <button class="btn btn-primary" onclick="FinancesPage.saveTransaction('${id || ''}')" style="display:flex;align-items:center;gap:6px;"><i data-lucide="save"></i> Сохранить</button>
      </div>
    `;

    // Removed problematic line without semicolon
    UI.openModal(modalTitle, content, footer);
    
    // Quick hack to parse HTML in title since openModal creates textContent by default
    const titleEl = document.querySelector('.modal-title');
    if (titleEl) {
      titleEl.innerHTML = modalTitle;
      titleEl.style.display = 'flex';
      titleEl.style.alignItems = 'center';
      titleEl.style.gap = '8px';
    }
    
    if (window.lucide) window.lucide.createIcons();
    
    // Focus amount input and put cursor at end
    setTimeout(() => {
      const amtInput = document.getElementById('tx-amount');
      if (amtInput) amtInput.focus();
    }, 100);
  },

  editModal(id) {
    this.openModal(null, id);
  },

  async saveTransaction(id) {
    const amount = document.getElementById('tx-amount').value;
    const date = document.getElementById('tx-date').value;
    const category = document.getElementById('tx-category').value;
    const description = document.getElementById('tx-desc').value.trim();
    const type = document.getElementById('tx-type').value;

    if (!amount || amount <= 0 || !date) {
      UI.toast('Укажите корректную сумму', 'error');
      return;
    }

    try {
      if (id) {
        await DB.updateTransaction(id, { amount, date, category, description, type });
        UI.toast('Транзакция обновлена', 'success');
      } else {
        await DB.createTransaction({ amount, date, category, description, type });
        UI.toast('Транзакция добавлена', 'success');
      }
      UI.closeModal();
      this.load();
    } catch (e) {
      console.error(e);
      UI.toast('Ошибка сохранения', 'error');
    }
  },

  async deleteTransaction(id) {
    if (!confirm('Точно удалить эту операцию?')) return;
    try {
      await DB.deleteTransaction(id);
      UI.closeModal();
      UI.toast('Операция удалена', 'info');
      this.load();
    } catch (e) {
      console.error(e);
      UI.toast('Ошибка удаления', 'error');
    }
  },

  esc(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
