// ============================================
// FINANCES PAGE
// ============================================

const FinancesPage = {
  transactions: [],
  categories: {
    income: ['Зарплата', 'Фриланс', 'Бизнес', 'Инвестиции', 'Подарки', 'Крипта', 'Кэшбэк', 'Другое'],
    expense: ['Продукты', 'Кафе и Рестораны', 'Транспорт', 'Авто', 'Жилье', 'Ипотека/Аренда', 'Развлечения', 'Здоровье', 'Одежда', 'Обучение', 'Подписки', 'Семья', 'Хобби', 'Техника', 'Путешествия', 'Другое'],
    transfer: ['Перевод']
  },
  currentViewMonth: new Date().getMonth(),
  currentViewYear: new Date().getFullYear(),
  configNoteId: null,
  config: {
    accounts: [
      { id: 'cash', name: 'Наличные', icon: 'banknote', color: '#10ac84' },
      { id: 'card', name: 'Карта', icon: 'credit-card', color: '#5f27cd' }
    ],
    budgets: {}
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
      <div class="finances-page" style="display:flex;flex-direction:column;height:100%;overflow-y:auto;">
        <div class="page-header">
          <div>
            <div class="page-title" style="font-size:20px;font-weight:700;display:flex;align-items:center;gap:8px;">
              Финансы
              <div style="display:flex;align-items:center;background:var(--bg-primary);border-radius:var(--radius-full);padding:2px;margin-left:8px;border:1px solid var(--border-light);">
                <button onclick="FinancesPage.changeMonth(-1)" style="border:none;background:transparent;cursor:pointer;padding:4px;color:var(--text-secondary);border-radius:50%;display:flex;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'"><i data-lucide="chevron-left" style="width:16px;height:16px;"></i></button>
                <span id="finance-subtitle" style="font-size:13px;font-weight:600;color:var(--text-primary);padding:0 8px;min-width:110px;text-align:center;">Загрузка...</span>
                <button onclick="FinancesPage.changeMonth(1)" style="border:none;background:transparent;cursor:pointer;padding:4px;color:var(--text-secondary);border-radius:50%;display:flex;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'"><i data-lucide="chevron-right" style="width:16px;height:16px;"></i></button>
              </div>
            </div>
          </div>
          <div class="page-actions" style="display:flex;gap:var(--space-sm);">
            <button class="btn btn-secondary" onclick="FinancesPage.openModal('transfer')" style="display:flex;align-items:center;gap:6px;color:var(--text-primary);border-color:var(--border);">
              <i data-lucide="arrow-right-left" style="width:16px;height:16px;"></i> Перевод
            </button>
            <button class="btn btn-secondary" onclick="FinancesPage.openModal('income')" style="display:flex;align-items:center;gap:6px;color:var(--success);border-color:rgba(16, 185, 129, 0.3);background:rgba(16, 185, 129, 0.05);">
              <i data-lucide="arrow-down-left" style="width:16px;height:16px;"></i> Доход
            </button>
            <button class="btn btn-primary" onclick="FinancesPage.openModal('expense')" style="display:flex;align-items:center;gap:6px;background:var(--danger);border-color:var(--danger);">
              <i data-lucide="arrow-up-right" style="width:16px;height:16px;"></i> Расход
            </button>
          </div>
        </div>

        <div id="finance-accounts-carousel" style="display:flex; gap: var(--space-md); padding: var(--space-lg) var(--space-xl) 0; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 8px; flex-shrink: 0; min-height: 130px;">
          <!-- Populated by JS -->
        </div>

        <div class="finance-dashboard" id="finance-summary">
          <!-- Populated by JS -->
        </div>

        <div class="finance-middle-section" style="display:grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg); padding: 0 var(--space-xl); margin-bottom: var(--space-lg);">
          <!-- Analytics -->
          <div class="glass-panel" style="padding: var(--space-lg); border-radius: var(--radius-lg);">
            <h3 style="font-size: 15px; margin-bottom: var(--space-lg); display: flex; align-items: center; justify-content: space-between; font-weight: 600;">
              <div style="display:flex;align-items:center;gap:8px;">
                <i data-lucide="pie-chart" style="color: var(--accent); width: 18px; height: 18px;"></i> Бюджеты и расходы
              </div>
              <button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="FinancesPage.openBudgetModal()">
                <i data-lucide="settings" style="width:12px;height:12px;margin-right:4px;"></i> Настроить
              </button>
            </h3>
            <div style="display: flex; gap: var(--space-lg); align-items: center; justify-content: center; flex-wrap: wrap;">
              <div id="finance-donut-container" style="flex: 0 0 140px; width: 140px; height: 140px; display: flex; align-items: center; justify-content: center; position: relative;">
                <!-- SVG Donut Chart dynamically populated -->
              </div>
              <div id="finance-analytics" style="flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 14px; max-height: 250px; overflow-y: auto; padding-right: 8px;"></div>
            </div>
          </div>

          <!-- AI Assistant -->
          <div class="glass-panel" style="padding: var(--space-lg); border-radius: var(--radius-lg); display: flex; flex-direction: column;">
            <h3 style="font-size: 15px; margin-bottom: var(--space-md); display: flex; align-items: center; gap: 8px; font-weight: 600;">
              <i data-lucide="sparkles" style="color: var(--accent-vibrant); width: 18px; height: 18px;"></i> Умная аналитика
            </h3>
            <div id="finance-ai-content" style="flex: 1; overflow-y: auto; font-size: 13.5px; line-height: 1.6; color: var(--text-secondary); margin-bottom: var(--space-md);">
              <p>Нажми кнопку, чтобы ИИ проанализировал твои траты в этом месяце, нашел скрытые закономерности и дал персональный совет.</p>
            </div>
            <div style="display: flex; gap: var(--space-sm); flex-shrink: 0; flex-wrap: wrap;">
              <button class="btn btn-secondary" onclick="FinancesPage.runAIAnalysis()" id="finance-ai-btn" style="flex: 1; min-width: 140px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12.5px;">
                <i data-lucide="brain" style="width: 14px; height: 14px;"></i> Анализ месяца
              </button>
              <button class="btn btn-primary" onclick="FinancesPage.runAITrendAnalysis()" id="finance-ai-trend-btn" style="flex: 1; min-width: 140px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12.5px; background: var(--accent); border-color: var(--accent);">
                <i data-lucide="trending-up" style="width: 14px; height: 14px;"></i> Анализ трендов
              </button>
            </div>
          </div>
        </div>

        <!-- Monthly Archive Section -->
        <div style="padding: 0 var(--space-xl); margin-bottom: var(--space-lg);">
          <div class="glass-panel" style="padding: var(--space-lg); border-radius: var(--radius-lg);">
            <h3 style="font-size: 15px; margin-bottom: var(--space-md); display: flex; align-items: center; gap: 8px; font-weight: 600;">
              <i data-lucide="archive" style="color: var(--accent-soft); width: 18px; height: 18px;"></i>
              История накоплений по месяцам
            </h3>
            <div id="finance-monthly-archive" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-md);">
              <div style="color:var(--text-muted);font-size:13px;text-align:center;grid-column:1/-1;padding:20px 0;">Расчет накоплений...</div>
            </div>
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
    await this.loadConfig();
    await this.load();
  },

  async loadConfig() {
    try {
      const allNotes = await DB.getNotes();
      const configNote = allNotes.find(n => n.title === 'SYSTEM_CONFIG_FINANCES');
      if (configNote) {
        this.configNoteId = configNote.id;
        try {
          const parsed = JSON.parse(configNote.content);
          this.config = { ...this.config, ...parsed };
        } catch(e) {}
      } else {
        const newNote = await DB.createNote({
          title: 'SYSTEM_CONFIG_FINANCES',
          content: JSON.stringify(this.config),
          mood: '⚙️',
          tags: ['system']
        });
        this.configNoteId = newNote.id;
      }
    } catch(e) {
      console.error('Failed to load finance config', e);
    }
  },

  async saveConfig() {
    try {
      if (this.configNoteId) {
        await DB.updateNote(this.configNoteId, { content: JSON.stringify(this.config) });
      }
    } catch(e) {
      console.error('Failed to save finance config', e);
    }
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

  changeMonth(dir) {
    this.currentViewMonth += dir;
    if (this.currentViewMonth < 0) {
      this.currentViewMonth = 11;
      this.currentViewYear--;
    } else if (this.currentViewMonth > 11) {
      this.currentViewMonth = 0;
      this.currentViewYear++;
    }
    this.renderData();
  },

  renderData() {
    const currentMonth = this.currentViewMonth;
    const currentYear = this.currentViewYear;

    const monthTx = this.transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    let income = 0;
    let expense = 0;

    monthTx.forEach(t => {
      let isCorrection = false;
      try { if (JSON.parse(t.description || '{}').text === 'Ручная корректировка баланса') isCorrection = true; } catch(e){}
      
      if (!isCorrection) {
        if (t.type === 'income') income += Number(t.amount);
        if (t.type === 'expense') expense += Number(t.amount);
      }
    });

    const balance = income - expense;

    // Calculate Account Balances up to the end of selected month
    const accountBalances = {};
    this.config.accounts.forEach(a => accountBalances[a.id] = Number(a.initialBalance) || 0);
    
    // We want to calculate balance accurately up to the very last second of the selected month
    const endOfViewMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
    
    this.transactions.forEach(t => {
      const txDate = new Date(t.date);
      if (txDate > endOfViewMonth) return; // Do not count transactions from the future relative to the selected month

      try {
        const descData = JSON.parse(t.description || '{}');
        const amt = Number(t.amount);
        
        let accId = descData.account;
        if (!accId && this.config.accounts && this.config.accounts.length > 0) {
          const defaultAcc = this.config.accounts.find(a => a.name.toLowerCase().includes('карта')) || this.config.accounts[0];
          accId = defaultAcc.id;
        }

        if (t.type === 'income' && accId && accountBalances[accId] !== undefined) {
          accountBalances[accId] += amt;
        } else if (t.type === 'expense' && accId && accountBalances[accId] !== undefined) {
          accountBalances[accId] -= amt;
        } else if (t.type === 'transfer' && descData.fromAccount && descData.toAccount) {
          if (accountBalances[descData.fromAccount] !== undefined) accountBalances[descData.fromAccount] -= amt;
          if (accountBalances[descData.toAccount] !== undefined) accountBalances[descData.toAccount] += amt;
        }
      } catch(e) {}
    });

    // Render Carousel
    const carouselEl = document.getElementById('finance-accounts-carousel');
    if (carouselEl) {
      carouselEl.innerHTML = this.config.accounts.map(acc => `
        <div class="finance-account-card glass-panel interactive-card" onclick="FinancesPage.openAccountModal('${acc.id}')" style="min-width: 180px; padding: 16px; border-radius: 16px; flex-shrink: 0; scroll-snap-align: start; position: relative; cursor: pointer;">
          <div style="position: absolute; top: -10px; right: -10px; opacity: 0.1; color: ${acc.color || 'var(--text-primary)'};">
            <i data-lucide="${acc.icon || 'wallet'}" style="width: 80px; height: 80px;"></i>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; position: relative;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: ${acc.color}20; color: ${acc.color}; display: flex; align-items: center; justify-content: center;">
              <i data-lucide="${acc.icon || 'wallet'}" style="width: 16px; height: 16px;"></i>
            </div>
            <div style="font-weight: 600; font-size: 14px; color: var(--text-primary);">${this.esc(acc.name)}</div>
          </div>
          <div style="font-size: 20px; font-weight: 800; color: var(--text-primary); position: relative;">
            ${accountBalances[acc.id].toLocaleString('ru-RU')} BYN
          </div>
        </div>
      `).join('') + `
        <div class="finance-account-card glass-panel interactive-card" onclick="FinancesPage.openAccountModal()" style="min-width: 180px; padding: 16px; border-radius: 16px; flex-shrink: 0; scroll-snap-align: start; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; border: 1px dashed var(--border-light); background: transparent;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--bg-hover); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
            <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
          </div>
          <div style="font-weight: 500; font-size: 13px; color: var(--text-secondary);">Управление</div>
        </div>
      `;
    }

    // Render Summary
    let budgetHtml = '';
    if (this.config.monthlyLimit && this.config.monthlyLimit > 0) {
      const limit = Number(this.config.monthlyLimit);
      const percent = Math.min(100, Math.round((expense / limit) * 100));
      
      let ringColor = 'var(--accent)';
      let ringGlow = 'var(--accent-glow)';
      if (percent >= 100) {
        ringColor = 'var(--danger)';
        ringGlow = 'rgba(239, 68, 68, 0.4)';
      } else if (percent >= 80) {
        ringColor = 'var(--warning)';
        ringGlow = 'rgba(245, 158, 11, 0.4)';
      }

      budgetHtml = `
        <div class="finance-summary-card glass-panel" style="grid-column: 1 / -1; box-shadow: var(--shadow-sm); display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: var(--space-xl); padding: var(--space-xl); flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: var(--space-lg);">
            <!-- SVG Progress Ring -->
            <div style="position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <svg width="80" height="80" viewBox="0 0 80 80" style="transform: rotate(-90deg);">
                <!-- Track -->
                <circle cx="40" cy="40" r="32" stroke="var(--bg-hover)" stroke-width="6" fill="transparent" />
                <!-- Progress -->
                <circle cx="40" cy="40" r="32" 
                        stroke="${ringColor}" 
                        stroke-width="6" 
                        fill="transparent" 
                        stroke-dasharray="${2 * Math.PI * 32}" 
                        stroke-dashoffset="${(1 - percent / 100) * (2 * Math.PI * 32)}" 
                        stroke-linecap="round"
                        style="transition: stroke-dashoffset 0.5s ease, stroke 0.5s ease; filter: drop-shadow(0 0 6px ${ringGlow});" />
              </svg>
              <div style="position: absolute; font-size: 16px; font-weight: 700; color: var(--text-primary);">${percent}%</div>
            </div>
            
            <!-- Info -->
            <div>
              <div style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                <i data-lucide="target" style="width: 18px; height: 18px; color: var(--accent);"></i>
                Бюджет на месяц
              </div>
              <div style="font-size: 14px; color: var(--text-secondary);">
                Потрачено <span style="color: var(--text-primary); font-weight: 600;">${expense.toLocaleString('ru-RU')}</span> из <span style="font-weight: 600;">${limit.toLocaleString('ru-RU')} BYN</span>
              </div>
            </div>
          </div>
          
          <!-- Alert Message -->
          <div style="text-align: right; min-width: 150px;">
            ${percent >= 100 
              ? `<div style="font-size: 14px; font-weight: 600; color: var(--danger); display: flex; align-items: center; gap: 6px; justify-content: flex-end;">
                   <i data-lucide="alert-triangle" style="width:16px;height:16px;"></i> Лимит превышен!
                 </div>
                 <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Перерасход на ${(expense - limit).toLocaleString('ru-RU')} BYN</div>`
              : percent >= 80 
                ? `<div style="font-size: 14px; font-weight: 600; color: var(--warning); display: flex; align-items: center; gap: 6px; justify-content: flex-end;">
                     <i data-lucide="alert-circle" style="width:16px;height:16px;"></i> Бюджет на исходе
                   </div>
                   <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Осталось ${(limit - expense).toLocaleString('ru-RU')} BYN</div>`
                : `<div style="font-size: 14px; font-weight: 600; color: var(--success); display: flex; align-items: center; gap: 6px; justify-content: flex-end;">
                     <i data-lucide="check-circle" style="width:16px;height:16px;"></i> Всё под контролем
                   </div>
                   <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Свободно ${(limit - expense).toLocaleString('ru-RU')} BYN</div>`
            }
          </div>
        </div>
      `;
    }

    document.getElementById('finance-summary').innerHTML = budgetHtml + `
      <div class="finance-summary-card glass-panel" style="box-shadow: var(--shadow-sm);">
        <div class="finance-label">
          <i data-lucide="trending-up" style="width:14px;height:14px;color:var(--success);"></i>
          Доходы (Этот месяц)
        </div>
        <div class="finance-amount income">+${income.toLocaleString('ru-RU')} BYN</div>
      </div>
      <div class="finance-summary-card glass-panel" style="box-shadow: var(--shadow-sm);">
        <div class="finance-label">
          <i data-lucide="trending-down" style="width:14px;height:14px;color:var(--danger);"></i>
          Расходы (Этот месяц)
        </div>
        <div class="finance-amount expense">-${expense.toLocaleString('ru-RU')} BYN</div>
      </div>
      <div class="finance-summary-card card-balance glass-panel" style="box-shadow: 0 0 24px var(--shadow-glow);">
        <div class="finance-label" style="color:var(--accent);">
          <i data-lucide="wallet" style="width:14px;height:14px;"></i>
          Остаток
        </div>
        <div class="finance-amount" style="color:${balance < 0 ? 'var(--danger)' : 'var(--text-primary)'}">
          ${balance > 0 ? '+' : ''}${balance.toLocaleString('ru-RU')} BYN
        </div>
      </div>
    `;

    const subtitle = document.getElementById('finance-subtitle');
    if (subtitle) {
      const d = new Date(currentYear, currentMonth, 1);
      const monthName = d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
      subtitle.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    }

    // Render Analytics (Expenses by category)
    const expensesByCategory = {};
    monthTx.forEach(t => {
      let isCorrection = false;
      try { if (JSON.parse(t.description || '{}').text === 'Ручная корректировка баланса') isCorrection = true; } catch(e){}

      if (!isCorrection && t.type === 'expense') {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + Number(t.amount);
      }
    });

    const analyticsEl = document.getElementById('finance-analytics');
    const donutContainer = document.getElementById('finance-donut-container');
    if (expense === 0 && Object.keys(this.config.budgets).length === 0) {
      analyticsEl.innerHTML = '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px 0;">Нет данных в этом месяце</div>';
      if (donutContainer) {
        donutContainer.innerHTML = `
          <svg width="120" height="120" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="30" stroke="var(--bg-hover)" stroke-width="8" fill="transparent" />
          </svg>
          <div style="position: absolute; font-size: 11px; color: var(--text-muted); font-weight: 600; text-align: center;">Нет трат</div>
        `;
      }
    } else {
      const allCats = new Set([...Object.keys(expensesByCategory), ...Object.keys(this.config.budgets)]);
      
      const items = Array.from(allCats).map(cat => {
        const spent = expensesByCategory[cat] || 0;
        const limit = this.config.budgets[cat] || 0;
        return { cat, spent, limit };
      }).sort((a, b) => b.spent - a.spent);

      analyticsEl.innerHTML = items.map(({cat, spent, limit}) => {
        let percent = 0;
        if (limit > 0) percent = Math.min(100, Math.round((spent / limit) * 100));
        else if (expense > 0) percent = Math.round((spent / expense) * 100);

        let color = 'linear-gradient(90deg, var(--accent), var(--accent-vibrant))';
        if (limit > 0) {
           if (percent >= 100) color = 'var(--danger)';
           else if (percent > 80) color = 'var(--warning)';
        }

        return `
          <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 4px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px; align-items:flex-end;">
              <span style="color: var(--text-primary); font-weight: 500; display:flex; align-items:center; gap:6px;">
                 <i data-lucide="${this.ICONS[cat] || 'circle-dollar-sign'}" style="width:14px;height:14px;color:var(--text-muted)"></i>
                 ${this.esc(cat)}
              </span>
              <div style="text-align:right">
                 <span style="color: var(--text-primary); font-weight:600;">${spent.toLocaleString('ru-RU')} BYN</span>
                 ${limit > 0 ? `<span style="color: var(--text-muted); font-size:11px;"> из ${limit.toLocaleString('ru-RU')}</span>` : ''}
              </div>
            </div>
            <div style="width: 100%; height: 6px; background: var(--bg-hover); border-radius: 4px; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.2);">
              <div style="width: ${percent}%; height: 100%; background: ${color}; border-radius: 4px; transition: width 0.3s ease;"></div>
            </div>
          </div>
        `;
      }).join('');

      if (donutContainer) {
        if (expense === 0) {
          donutContainer.innerHTML = `
            <svg width="120" height="120" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="30" stroke="var(--bg-hover)" stroke-width="8" fill="transparent" />
            </svg>
            <div style="position: absolute; font-size: 11px; color: var(--text-muted); font-weight: 600; text-align: center;">Нет трат</div>
          `;
        } else {
          const chartItems = items.filter(item => item.spent > 0);
          let currentOffset = 0;
          const radius = 30;
          const circumference = 2 * Math.PI * radius;
          
          const CATEGORY_COLORS = {
            'Продукты': '#34D399',      // Emerald green
            'Транспорт': '#60A5FA',     // Blue
            'Дом': '#F59E0B',           // Amber
            'Развлечения': '#EC4899',   // Pink
            'Здоровье': '#EF4444',      // Red
            'Техника': '#8B5CF6',       // Purple
            'Путешествия': '#14B8A6',   // Teal
            'Другое': '#6B7280'         // Gray
          };
          const fallbackColors = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#14B8A6', '#F43F5E', '#06B6D4', '#84CC16', '#A855F7'];
          
          let svgContent = `<svg width="120" height="120" viewBox="0 0 80 80" style="transform: rotate(-90deg); overflow: visible;">`;
          
          chartItems.forEach((item, index) => {
            const percent = item.spent / expense;
            const dashLength = percent * circumference;
            const color = CATEGORY_COLORS[item.cat] || fallbackColors[index % fallbackColors.length];
            
            svgContent += `
              <circle class="donut-segment" cx="40" cy="40" r="${radius}"
                      stroke="${color}"
                      stroke-width="8"
                      fill="transparent"
                      stroke-dasharray="${dashLength} ${circumference}"
                      stroke-dashoffset="${-currentOffset}"
                      style="transition: stroke-width 0.2s ease, filter 0.2s ease; cursor: pointer;"
                      title="${this.esc(item.cat)}: ${item.spent.toLocaleString('ru-RU')} BYN" />
            `;
            currentOffset += dashLength;
          });
          
          svgContent += `</svg>`;
          svgContent += `
            <div style="position: absolute; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none; width: 80px;">
              <span style="font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Всего</span>
              <span style="font-size: 13px; font-weight: 800; color: var(--text-primary); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 76px;" title="${expense.toLocaleString('ru-RU')} BYN">${Math.round(expense).toLocaleString('ru-RU')}</span>
            </div>
          `;
          
          donutContainer.innerHTML = svgContent;
        }
      }
    }

    // Render List
    const list = document.getElementById('transaction-list');
    if (monthTx.length === 0) {
      list.innerHTML = `
        <div class="empty-state" style="text-align:center;padding:var(--space-3xl) 0;display:flex;flex-direction:column;align-items:center;gap:var(--space-md);">
          <div style="width:64px;height:64px;border-radius:50%;background:var(--bg-surface);display:flex;align-items:center;justify-content:center;border:1px solid var(--border-light);">
            <i data-lucide="credit-card" style="width:32px;height:32px;color:var(--text-muted);"></i>
          </div>
          <div style="font-size:18px;font-weight:600;color:var(--text-primary)">Нет транзакций</div>
          <div style="font-size:14px;color:var(--text-secondary);">В этом месяце нет операций.</div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // Group by date
    const grouped = {};
    monthTx.forEach(t => {
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
        const isTransfer = t.type === 'transfer';
        const iconName = isTransfer ? 'arrow-right-left' : (this.ICONS[t.category] || 'circle-dollar-sign');
        const wrapperClass = isTransfer ? 'icon-transfer' : (isIncome ? 'icon-income' : 'icon-expense');
        
        let displayDesc = t.description;
        try {
          const parsed = JSON.parse(t.description);
          displayDesc = parsed.text || '';
        } catch(e) {}
        
        let sign = isIncome ? '+' : '-';
        if (isTransfer) sign = '';
        let amountClass = isTransfer ? 'transfer' : (isIncome ? 'income' : 'expense');
        if (isTransfer) amountClass = 'text-primary'; // override color

        return `
          <div class="transaction-item" onclick="FinancesPage.editModal('${t.id}')">
            <div class="transaction-left">
              <div class="transaction-icon-wrapper ${wrapperClass}" style="${isTransfer ? 'background:var(--bg-hover);color:var(--text-secondary);' : ''}">
                <i data-lucide="${iconName}" style="width:20px;height:20px;"></i>
              </div>
              <div class="transaction-details">
                <div class="transaction-title">${this.esc(t.category)}</div>
                ${displayDesc ? `<div class="transaction-desc">${this.esc(displayDesc)}</div>` : ''}
              </div>
            </div>
            <div class="transaction-right">
              <div class="transaction-sum ${amountClass}" style="${isTransfer ? 'color:var(--text-primary)' : ''}">
                ${sign}${Number(t.amount).toLocaleString('ru-RU')} BYN
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

    // Render Monthly Archive
    const archiveEl = document.getElementById('finance-monthly-archive');
    if (archiveEl) {
      const monthlyTotals = {};
      this.transactions.forEach(t => {
        const d = new Date(t.date);
        const year = d.getFullYear();
        const month = d.getMonth();
        const key = `${year}-${month}`;
        
        if (!monthlyTotals[key]) {
          monthlyTotals[key] = {
            year,
            month,
            income: 0,
            expense: 0
          };
        }
        
        const amt = Number(t.amount);
        if (t.type === 'income') monthlyTotals[key].income += amt;
        if (t.type === 'expense') monthlyTotals[key].expense += amt;
      });
      
      const sortedKeys = Object.keys(monthlyTotals).sort((a, b) => {
        const [yA, mA] = a.split('-').map(Number);
        const [yB, mB] = b.split('-').map(Number);
        return new Date(yB, mB, 1) - new Date(yA, mA, 1);
      });
      
      if (sortedKeys.length === 0) {
        archiveEl.innerHTML = '<div style="color:var(--text-muted);font-size:13px;text-align:center;grid-column:1/-1;padding:20px 0;">Нет данных для отображения архива</div>';
      } else {
        archiveEl.innerHTML = sortedKeys.map(key => {
          const item = monthlyTotals[key];
          const dateObj = new Date(item.year, item.month, 1);
          const monthName = dateObj.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
          const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
          
          const delta = item.income - item.expense;
          const savingsRate = item.income > 0 ? Math.max(0, Math.round((delta / item.income) * 100)) : 0;
          
          const isActive = this.currentViewYear === item.year && this.currentViewMonth === item.month;
          const activeStyle = isActive 
            ? 'border: 1.5px solid var(--accent); box-shadow: 0 0 16px var(--accent-glow); background: var(--bg-hover);' 
            : 'border: 1px solid var(--border-light);';
            
          return `
            <div class="glass-panel interactive-card" onclick="FinancesPage.selectMonth(${item.year}, ${item.month})" style="padding: 16px; border-radius: var(--radius-md); cursor: pointer; display: flex; flex-direction: column; justify-content: space-between; background: var(--bg-surface); min-height: 120px; ${activeStyle}">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: var(--space-xs);">
                <div style="font-weight: 600; font-size: 13.5px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${capitalizedMonth}</div>
                <div style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: ${delta >= 0 && savingsRate > 0 ? 'var(--success-dim)' : 'var(--bg-hover)'}; color: ${delta >= 0 && savingsRate > 0 ? 'var(--success)' : 'var(--text-secondary)'}; font-weight: 700; white-space: nowrap;">
                  ${savingsRate}% сбер.
                </div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: var(--text-secondary);">
                  <span>Доходы:</span>
                  <span style="color: var(--success); font-weight: 600;">+${item.income.toLocaleString('ru-RU')} BYN</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: var(--text-secondary);">
                  <span>Расходы:</span>
                  <span style="color: var(--danger); font-weight: 600;">-${item.expense.toLocaleString('ru-RU')} BYN</span>
                </div>
              </div>
              <div style="border-top: 1px solid var(--border-light); padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                <span style="color: var(--text-muted); font-size: 11px;">Копится:</span>
                <span style="font-weight: 700; color: ${delta >= 0 ? 'var(--success)' : 'var(--danger)'};">
                  ${delta >= 0 ? '+' : ''}${delta.toLocaleString('ru-RU')} BYN
                </span>
              </div>
            </div>
          `;
        }).join('');
      }
    }

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
      const currentMonth = this.currentViewMonth;
      const currentYear = this.currentViewYear;
      
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
Доход: ${income} BYN. 
Расход: ${expense} BYN. 
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
      btn.innerHTML = '<i data-lucide="brain" style="width:14px;height:14px;"></i> Анализ месяца';
      if (window.lucide) window.lucide.createIcons();
    }
  },

  selectMonth(year, month) {
    this.currentViewMonth = month;
    this.currentViewYear = year;
    this.renderData();
    const container = document.querySelector('.finances-page');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  async runAITrendAnalysis() {
    const btn = document.getElementById('finance-ai-trend-btn');
    const content = document.getElementById('finance-ai-content');
    
    if (!btn || !content) return;
    
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="spin" style="width:14px;height:14px;"></i> Анализирую...';
    if (window.lucide) window.lucide.createIcons();

    try {
      const monthlyData = {};
      
      this.transactions.forEach(t => {
        const d = new Date(t.date);
        const year = d.getFullYear();
        const month = d.getMonth();
        const key = `${year}-${month}`;
        
        if (!monthlyData[key]) {
          monthlyData[key] = {
            year,
            month,
            income: 0,
            expense: 0,
            categories: {}
          };
        }
        
        const amt = Number(t.amount);
        if (t.type === 'income') {
          monthlyData[key].income += amt;
        } else if (t.type === 'expense') {
          monthlyData[key].expense += amt;
          monthlyData[key].categories[t.category] = (monthlyData[key].categories[t.category] || 0) + amt;
        }
      });
      
      const sortedKeys = Object.keys(monthlyData).sort((a, b) => {
        const [yA, mA] = a.split('-').map(Number);
        const [yB, mB] = b.split('-').map(Number);
        return new Date(yA, mA, 1) - new Date(yB, mB, 1);
      });
      
      const lastMonthsKeys = sortedKeys.slice(-6);
      if (lastMonthsKeys.length === 0) {
        content.innerHTML = '<span style="color:var(--text-secondary)">Недостаточно данных для анализа трендов. Добавьте транзакции за несколько месяцев.</span>';
        return;
      }
      
      const historySummary = lastMonthsKeys.map(key => {
        const m = monthlyData[key];
        const dateObj = new Date(m.year, m.month, 1);
        const monthName = dateObj.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
        
        let topCat = 'Нет трат';
        let topAmt = 0;
        Object.entries(m.categories).forEach(([cat, val]) => {
          if (val > topAmt) {
            topAmt = val;
            topCat = cat;
          }
        });
        
        return {
          month: monthName,
          income: m.income,
          expense: m.expense,
          savings: m.income - m.expense,
          savingsRate: m.income > 0 ? Math.round(((m.income - m.expense) / m.income) * 100) : 0,
          topCategory: topCat === 'Нет трат' ? 'Нет трат' : `${topCat} (${topAmt} BYN)`
        };
      });
      
      const prompt = `Проанализируй финансовые тренды моих доходов, расходов и сбережений за последние несколько месяцев:
${JSON.stringify(historySummary, null, 2)}

Как профессиональный финансовый ассистент, проведи глубокий анализ:
1. **Динамика сбережений**: увеличивается ли сумма, которую я откладываю (накапливаю), стабилен ли процент сбережений?
2. **Анализ трат**: обрати внимание на то, как ведут себя расходы по сравнению с доходами и какие топ-категории трат преобладают.
3. **Рекомендации**: дай 1-2 конкретных, не банальных совета по улучшению финансовой дисциплины и росту накоплений на основе этих трендов.

Будь краток, пиши ёмко, используй форматирование Markdown (жирный шрифт, списки, цитаты). Обращайся на "ты". Никакой лишней "воды".`;
      
      const response = await Gemini.chat(prompt);
      content.innerHTML = window.marked ? marked.parse(response) : response;
      
    } catch (e) {
      console.error('AI Trend Finance Error:', e);
      content.innerHTML = '<span style="color:var(--danger)">Ошибка при обращении к ИИ. Попробуйте позже.</span>';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="trending-up" style="width:14px;height:14px;"></i> Анализ трендов';
      if (window.lucide) window.lucide.createIcons();
    }
  },

  openModal(type, id = null) {
    const tx = id ? this.transactions.find(t => t.id === id) : null;
    const txType = tx ? tx.type : type;
    const isNew = !tx;

    let displayDesc = '';
    let accountId = '';
    let fromAccountId = '';
    let toAccountId = '';

    if (tx) {
      displayDesc = tx.description;
      try {
        const parsed = JSON.parse(tx.description);
        displayDesc = parsed.text || '';
        accountId = parsed.account || '';
        fromAccountId = parsed.fromAccount || '';
        toAccountId = parsed.toAccount || '';
      } catch(e) {}
    }

    const cats = this.categories[txType] || [];
    const catOptions = cats.map(c => `<option value="${c}" ${tx?.category === c ? 'selected' : ''}>${c}</option>`).join('');

    const accountOptions = this.config.accounts.map(a => `<option value="${a.id}" ${accountId === a.id ? 'selected' : ''}>${a.name}</option>`).join('');
    const fromAccountOptions = this.config.accounts.map(a => `<option value="${a.id}" ${fromAccountId === a.id ? 'selected' : ''}>${a.name}</option>`).join('');
    const toAccountOptions = this.config.accounts.map(a => `<option value="${a.id}" ${toAccountId === a.id ? 'selected' : ''}>${a.name}</option>`).join('');

    const todayStr = new Date().toISOString().split('T')[0];
    
    let modalTitle = '<i data-lucide="edit-2"></i> Редактировать';
    if (isNew) {
      if (txType === 'income') modalTitle = '<i data-lucide="arrow-down-left" style="color:var(--success);"></i> Новый доход';
      else if (txType === 'expense') modalTitle = '<i data-lucide="arrow-up-right" style="color:var(--danger);"></i> Новый расход';
      else if (txType === 'transfer') modalTitle = '<i data-lucide="arrow-right-left" style="color:var(--text-primary);"></i> Новый перевод';
    }

    let accountFields = '';
    if (txType === 'transfer') {
      accountFields = `
        <div class="form-row" style="margin-top:var(--space-md)">
          <div class="form-group">
            <label class="form-label">Со счета</label>
            <select id="tx-from-account" class="form-input">${fromAccountOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label">На счет</label>
            <select id="tx-to-account" class="form-input">${toAccountOptions}</select>
          </div>
        </div>
      `;
    } else {
      accountFields = `
        <div class="form-group" style="margin-top:var(--space-md)">
          <label class="form-label">Счет</label>
          <select id="tx-account" class="form-input">${accountOptions}</select>
        </div>
      `;
    }

    const content = `
      <div class="form-group" style="text-align:center;margin-bottom:var(--space-xl);">
        <label class="form-label" style="text-align:center;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Сумма (BYN)</label>
        <input type="number" id="tx-amount" style="font-size:48px;font-weight:800;text-align:center;border:none;background:transparent;outline:none;width:100%;color:${txType === 'income' ? 'var(--success)' : (txType === 'transfer' ? 'var(--text-primary)' : 'var(--danger)')};padding:0;" placeholder="0" min="0" step="1" value="${tx ? tx.amount : ''}" autofocus required>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Дата</label>
          <input type="date" id="tx-date" class="form-input" value="${tx ? tx.date : todayStr}" required>
        </div>
        ${txType === 'transfer' ? `
          <input type="hidden" id="tx-category" value="Перевод">
        ` : `
        <div class="form-group">
          <label class="form-label">Категория</label>
          <select id="tx-category" class="form-input">
            ${catOptions}
          </select>
        </div>
        `}
      </div>

      ${accountFields}
      
      <div class="form-group" style="margin-top:var(--space-md)">
        <label class="form-label">Описание / Комментарий</label>
        <input type="text" id="tx-desc" class="form-input" placeholder="Например: Перевод за обед" value="${this.esc(displayDesc)}">
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

  openAccountModal(id = null) {
    const acc = id ? this.config.accounts.find(a => a.id === id) : null;
    const isNew = !acc;

    let currentBalance = acc ? (Number(acc.initialBalance) || 0) : 0;
    if (acc) {
      this.transactions.forEach(t => {
        try {
          const descData = JSON.parse(t.description || '{}');
          let accId = descData.account;
          if (!accId && this.config.accounts && this.config.accounts.length > 0) {
            const defaultAcc = this.config.accounts.find(a => a.name.toLowerCase().includes('карта')) || this.config.accounts[0];
            accId = defaultAcc.id;
          }
          const amt = Number(t.amount);
          if (t.type === 'income' && accId === acc.id) currentBalance += amt;
          else if (t.type === 'expense' && accId === acc.id) currentBalance -= amt;
          else if (t.type === 'transfer') {
            if (descData.fromAccount === acc.id) currentBalance -= amt;
            if (descData.toAccount === acc.id) currentBalance += amt;
          }
        } catch(e) {}
      });
    }

    const content = `
      <div class="form-group">
        <label class="form-label">Название счета</label>
        <input type="text" id="acc-name" class="form-input" placeholder="Например: Карта Tinkoff" value="${acc ? this.esc(acc.name) : ''}" required autofocus>
      </div>
      <div class="form-row" style="margin-top:var(--space-md)">
        <div class="form-group">
          <label class="form-label">Иконка</label>
          <select id="acc-icon" class="form-input">
            <option value="wallet" ${acc?.icon === 'wallet' ? 'selected' : ''}>Кошелек</option>
            <option value="credit-card" ${acc?.icon === 'credit-card' ? 'selected' : ''}>Карта</option>
            <option value="banknote" ${acc?.icon === 'banknote' ? 'selected' : ''}>Наличные</option>
            <option value="bitcoin" ${acc?.icon === 'bitcoin' ? 'selected' : ''}>Крипта</option>
            <option value="piggy-bank" ${acc?.icon === 'piggy-bank' ? 'selected' : ''}>Копилка</option>
            <option value="building-2" ${acc?.icon === 'building-2' ? 'selected' : ''}>Вклад / Банк</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Цвет</label>
          <input type="color" id="acc-color" class="form-input" value="${acc ? acc.color : '#5f27cd'}" style="height:42px;padding:4px;">
        </div>
      </div>
      <div class="form-group" style="margin-top:var(--space-md)">
        <label class="form-label">${acc ? 'Скорректировать текущий баланс (BYN)' : 'Начальный баланс (BYN)'}</label>
        <input type="number" step="0.01" id="acc-current-balance" class="form-input" value="${currentBalance.toFixed(2)}">
        ${acc ? '<div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Если изменить эту сумму, бот автоматически создаст операцию "Корректировка", чтобы подогнать баланс.</div>' : ''}
      </div>
    `;

    const footer = `
      ${!isNew ? `<button class="btn btn-danger" onclick="FinancesPage.deleteAccount('${id}')" style="display:flex;align-items:center;gap:6px;"><i data-lucide="trash-2"></i> Удалить</button>` : '<div></div>'}
      <div style="display:flex;gap:var(--space-sm);margin-left:auto">
        <button class="btn btn-secondary" onclick="UI.closeModal()">Отмена</button>
        <button class="btn btn-primary" onclick="FinancesPage.saveAccount('${id || ''}')" style="display:flex;align-items:center;gap:6px;"><i data-lucide="save"></i> Сохранить</button>
      </div>
    `;

    UI.openModal(isNew ? 'Новый счет' : 'Редактировать счет', content, footer);
    if (window.lucide) window.lucide.createIcons();
    
    setTimeout(() => {
      const nameInput = document.getElementById('acc-name');
      if (nameInput) nameInput.focus();
    }, 100);
  },

  async saveAccount(id) {
    const name = document.getElementById('acc-name').value.trim();
    const icon = document.getElementById('acc-icon').value;
    const color = document.getElementById('acc-color').value;
    const newBalance = parseFloat(document.getElementById('acc-current-balance').value) || 0;

    if (!name) { UI.toast('Введите название', 'error'); return; }

    if (id) {
      const acc = this.config.accounts.find(a => a.id === id);
      if (acc) {
        acc.name = name; acc.icon = icon; acc.color = color;
        
        // Calculate old balance
        let currentBalance = Number(acc.initialBalance) || 0;
        this.transactions.forEach(t => {
          try {
            const descData = JSON.parse(t.description || '{}');
            let accId = descData.account || (this.config.accounts.find(a => a.name.toLowerCase().includes('карта')) || this.config.accounts[0]).id;
            const amt = Number(t.amount);
            if (t.type === 'income' && accId === acc.id) currentBalance += amt;
            else if (t.type === 'expense' && accId === acc.id) currentBalance -= amt;
            else if (t.type === 'transfer') {
              if (descData.fromAccount === acc.id) currentBalance -= amt;
              if (descData.toAccount === acc.id) currentBalance += amt;
            }
          } catch(e) {}
        });

        const diff = newBalance - currentBalance;
        if (Math.abs(diff) > 0.001) {
          // Add correction transaction
          const txData = {
            amount: Math.abs(diff).toFixed(2),
            type: diff > 0 ? 'income' : 'expense',
            category: 'Другое',
            date: new Date().toISOString().split('T')[0],
            description: JSON.stringify({ account: acc.id, text: 'Ручная корректировка баланса' })
          };
          const created = await DB.createTransaction(txData);
          this.transactions.unshift(created);
        }
      }
    } else {
      const newId = 'acc_' + Date.now();
      this.config.accounts.push({ id: newId, name, icon, color, initialBalance: newBalance });
    }

    await this.saveConfig();
    UI.closeModal();
    this.renderData();
  },

  async deleteAccount(id) {
    if (!confirm('Удалить этот счет? Операции, привязанные к нему, останутся в истории, но потеряют привязку.')) return;
    this.config.accounts = this.config.accounts.filter(a => a.id !== id);
    await this.saveConfig();
    UI.closeModal();
    this.renderData();
  },

  openBudgetModal() {
    const globalLimit = this.config.monthlyLimit || '';

    let inputs = `
      <div style="background: rgba(var(--accent-rgb), 0.05); padding: 16px; border-radius: var(--radius-md); margin-bottom: 24px; border: 1px solid rgba(var(--accent-rgb), 0.2);">
        <div style="font-weight: 600; color: var(--accent); margin-bottom: 8px; display:flex; align-items:center; gap:6px;">
          <i data-lucide="target" style="width:16px;height:16px;"></i> Глобальный лимит на месяц
        </div>
        <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">Общая сумма всех трат, которую вы не хотите превысить. Бот предупредит при достижении 80% и жестко отреагирует при 100%.</div>
        <div style="display:flex; align-items:center; gap: 8px;">
          <input type="number" id="budget-global" value="${globalLimit}" placeholder="Без лимита" class="form-input" style="flex:1; max-width:200px; font-weight:600;">
          <span style="color:var(--text-muted); font-weight:500;">BYN</span>
        </div>
      </div>
      <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">Детальные лимиты по категориям:</div>
    `;

    inputs += this.categories.expense.map(cat => {
      const currentVal = this.config.budgets[cat] || '';
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 12px 0; border-bottom: 1px solid var(--border-light);">
          <div style="font-size:14px; font-weight:500; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
            <i data-lucide="${this.ICONS[cat] || 'circle-dollar-sign'}" style="width:18px;height:18px;color:var(--text-muted)"></i>
            ${this.esc(cat)}
          </div>
          <input type="number" id="budget-${btoa(unescape(encodeURIComponent(cat))).replace(/=/g, '')}" value="${currentVal}" placeholder="Без лимита" class="form-input" style="width:120px; text-align:right;">
        </div>
      `;
    }).join('');

    const content = `
      <div style="margin-bottom:var(--space-md); font-size:13px; color:var(--text-secondary); line-height:1.5;">Установите лимиты трат на месяц. Если оставить поле пустым, лимит не установлен. Приложение будет предупреждать о перерасходе.</div>
      <div style="max-height:55vh; overflow-y:auto; padding-right:8px;">
        ${inputs}
      </div>
    `;

    const footer = `
      <div style="display:flex;gap:var(--space-sm);margin-left:auto">
        <button class="btn btn-secondary" onclick="UI.closeModal()">Отмена</button>
        <button class="btn btn-primary" onclick="FinancesPage.saveBudgets()"><i data-lucide="save"></i> Сохранить</button>
      </div>
    `;
    
    UI.openModal('<i data-lucide="pie-chart"></i> Настройка бюджетов', content, footer);
    
    const titleEl = document.querySelector('.modal-title');
    if (titleEl) {
      titleEl.innerHTML = '<i data-lucide="pie-chart"></i> Настройка бюджетов';
      titleEl.style.display = 'flex';
      titleEl.style.alignItems = 'center';
      titleEl.style.gap = '8px';
    }
    
    if (window.lucide) window.lucide.createIcons();
  },

  async saveBudgets() {
    const globalInput = document.getElementById('budget-global');
    if (globalInput) {
      const globalVal = Number(globalInput.value);
      if (globalVal > 0) this.config.monthlyLimit = globalVal;
      else delete this.config.monthlyLimit;
    }

    this.categories.expense.forEach(cat => {
      const id = 'budget-' + btoa(unescape(encodeURIComponent(cat))).replace(/=/g, '');
      const input = document.getElementById(id);
      if (input) {
        const val = Number(input.value);
        if (val > 0) this.config.budgets[cat] = val;
        else delete this.config.budgets[cat];
      }
    });
    await this.saveConfig();
    UI.closeModal();
    this.renderData();
  },

  async saveTransaction(id) {
    const amount = document.getElementById('tx-amount').value;
    const date = document.getElementById('tx-date').value;
    const category = document.getElementById('tx-category').value;
    const textDesc = document.getElementById('tx-desc').value.trim();
    const type = document.getElementById('tx-type').value;
    
    let descriptionObj = { text: textDesc };
    
    if (type === 'transfer') {
      const fromAcc = document.getElementById('tx-from-account').value;
      const toAcc = document.getElementById('tx-to-account').value;
      if (fromAcc === toAcc) {
        UI.toast('Счета должны быть разными', 'error');
        return;
      }
      descriptionObj.fromAccount = fromAcc;
      descriptionObj.toAccount = toAcc;
    } else {
      const acc = document.getElementById('tx-account');
      if (acc) descriptionObj.account = acc.value;
    }
    
    const description = JSON.stringify(descriptionObj);

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
