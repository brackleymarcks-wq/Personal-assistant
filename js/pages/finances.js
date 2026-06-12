// ============================================
// FINANCES PAGE
// ============================================

const FinancesPage = {
  transactions: [],
  categories: {
    income: ['Зарплата', 'Фриланс', 'Инвестиции', 'Подарки', 'Другое'],
    expense: ['Продукты', 'Кафе', 'Транспорт', 'Жилье', 'Развлечения', 'Здоровье', 'Одежда', 'Обучение', 'Подписки', 'Другое']
  },

  render() {
    return `
      <div class="finances-page">
        <div class="page-header">
          <div>
            <div class="page-title">Финансы</div>
            <div class="page-subtitle" id="finance-subtitle">Учет доходов и расходов</div>
          </div>
          <div class="page-actions">
            <button class="btn btn-secondary" onclick="FinancesPage.openModal('income')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
              Доход
            </button>
            <button class="btn btn-primary" onclick="FinancesPage.openModal('expense')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>
              Расход
            </button>
          </div>
        </div>

        <div class="finance-summary" id="finance-summary">
          <!-- Populated by JS -->
        </div>

        <div class="transaction-list" id="transaction-list">
          <div style="text-align:center;padding:var(--space-2xl);color:var(--text-muted)">Загрузка…</div>
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
      this.renderData();
    } catch (e) {
      console.error('Finances load error:', e);
    }
  },

  renderData() {
    // Current month filter
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
      <div class="finance-summary-card">
        <div class="finance-amount income">+${income.toLocaleString('ru-RU')} ₴</div>
        <div class="finance-label">Доходы (этот месяц)</div>
      </div>
      <div class="finance-summary-card">
        <div class="finance-amount expense">-${expense.toLocaleString('ru-RU')} ₴</div>
        <div class="finance-label">Расходы (этот месяц)</div>
      </div>
      <div class="finance-summary-card">
        <div class="finance-amount balance">${balance > 0 ? '+' : ''}${balance.toLocaleString('ru-RU')} ₴</div>
        <div class="finance-label">Остаток</div>
      </div>
    `;

    const subtitle = document.getElementById('finance-subtitle');
    if (subtitle) subtitle.textContent = now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

    // Render List
    const list = document.getElementById('transaction-list');
    if (this.transactions.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💸</div>
          <div class="empty-text">Нет транзакций</div>
          <div class="empty-subtext">Добавь свои первые доходы или расходы</div>
        </div>
      `;
      return;
    }

    // Group by date
    const grouped = {};
    this.transactions.forEach(t => {
      const d = new Date(t.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(t);
    });

    let html = '';
    for (const [date, txs] of Object.entries(grouped)) {
      html += `<div style="font-size:12px;font-weight:600;color:var(--text-muted);margin:var(--space-md) 0 var(--space-xs);padding-left:4px">${date}</div>`;
      html += txs.map(t => {
        const isIncome = t.type === 'income';
        const icon = isIncome ? '📈' : '📉';
        return `
          <div class="transaction-item" onclick="FinancesPage.editModal('${t.id}')">
            <div style="display:flex;align-items:center;gap:var(--space-sm)">
              <div class="transaction-category-icon">${icon}</div>
              <div>
                <div style="font-size:14px;font-weight:500;color:var(--text-primary)">${this.esc(t.category)}</div>
                ${t.description ? `<div style="font-size:12px;color:var(--text-secondary)">${this.esc(t.description)}</div>` : ''}
              </div>
            </div>
            <div style="font-size:15px;font-weight:600;color:${isIncome ? 'var(--success)' : 'var(--text-primary)'}">
              ${isIncome ? '+' : '-'}${Number(t.amount).toLocaleString('ru-RU')} ₴
            </div>
          </div>
        `;
      }).join('');
    }

    list.innerHTML = html;
  },

  openModal(type, id = null) {
    const tx = id ? this.transactions.find(t => t.id === id) : null;
    const txType = tx ? tx.type : type;
    const isNew = !tx;
    
    const cats = this.categories[txType];
    const catOptions = cats.map(c => `<option value="${c}" ${tx?.category === c ? 'selected' : ''}>${c}</option>`).join('');

    const todayStr = new Date().toISOString().split('T')[0];

    const content = `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Сумма (₴)</label>
          <input type="number" id="tx-amount" class="form-input" placeholder="0" min="0" step="0.01" value="${tx ? tx.amount : ''}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Дата</label>
          <input type="date" id="tx-date" class="form-input" value="${tx ? tx.date : todayStr}" required>
        </div>
      </div>
      <div class="form-group" style="margin-top:var(--space-md)">
        <label class="form-label">Категория</label>
        <select id="tx-category" class="form-input">
          ${catOptions}
        </select>
      </div>
      <div class="form-group" style="margin-top:var(--space-md)">
        <label class="form-label">Описание (необязательно)</label>
        <input type="text" id="tx-desc" class="form-input" placeholder="Например: Супермаркет" value="${tx ? this.esc(tx.description) : ''}">
      </div>
      <input type="hidden" id="tx-type" value="${txType}">
    `;

    const footer = `
      ${!isNew ? `<button class="btn btn-danger" onclick="FinancesPage.deleteTransaction('${id}')">Удалить</button>` : '<div></div>'}
      <div style="display:flex;gap:var(--space-sm);margin-left:auto">
        <button class="btn btn-secondary" onclick="UI.closeModal()">Отмена</button>
        <button class="btn btn-primary" onclick="FinancesPage.saveTransaction('${id || ''}')">Сохранить</button>
      </div>
    `;

    UI.openModal(isNew ? (txType === 'income' ? 'Новый доход' : 'Новый расход') : 'Редактировать', content, footer);
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
      UI.toast('Заполните обязательные поля', 'error');
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
    if (!confirm('Точно удалить запись?')) return;
    try {
      await DB.deleteTransaction(id);
      UI.closeModal();
      UI.toast('Запись удалена', 'success');
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
