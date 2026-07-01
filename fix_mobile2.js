const fs = require('fs');

// 1. Update index.html to add Force Update Button
let html = fs.readFileSync('index.html', 'utf8');
if (!html.includes('id="force-update-btn"')) {
  html = html.replace(
    '<button id="settings-btn" class="icon-btn" title="Настройки">',
    '<button id="force-update-btn" class="icon-btn" title="Принудительное обновление">\n            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 2v6h6"/></svg>\n          </button>\n          <button id="settings-btn" class="icon-btn" title="Настройки">'
  );
  fs.writeFileSync('index.html', html);
}

// 2. Update app.js to handle force update button
let app = fs.readFileSync('js/app.js', 'utf8');
if (!app.includes("forceUpdateBtn.addEventListener('click'")) {
  app = app.replace(
    'const mobileToggle = document.getElementById(\'mobile-sidebar-toggle\');',
    'const mobileToggle = document.getElementById(\'mobile-sidebar-toggle\');\n    const forceUpdateBtn = document.getElementById(\'force-update-btn\');\n    if (forceUpdateBtn) {\n      forceUpdateBtn.addEventListener(\'click\', async () => {\n        forceUpdateBtn.classList.add(\'spin\');\n        UI.toast(\'Удаление кэша PWA...\', \'info\');\n        if (\'serviceWorker\' in navigator) {\n          const regs = await navigator.serviceWorker.getRegistrations();\n          for (let r of regs) await r.unregister();\n        }\n        setTimeout(() => window.location.reload(true), 1000);\n      });\n    }'
  );
  fs.writeFileSync('js/app.js', app);
}

// 3. Append Mobile CSS fixes to main.css
let css = fs.readFileSync('styles/main.css', 'utf8');
if (!css.includes('.tasks-toolbar { flex-direction: column;')) {
  css += `
@media (max-width: 768px) {
  .page-header {
    padding: var(--space-md) !important;
  }
  .page-title {
    font-size: 18px !important;
  }
  .tasks-toolbar {
    padding: var(--space-md) !important;
    flex-direction: column;
    align-items: stretch !important;
  }
  .tasks-toolbar .filter-select {
    width: 100% !important;
  }
  .view-toggle {
    margin-top: var(--space-sm);
  }
  .kanban-board {
    padding: var(--space-md) !important;
  }
  .dashboard-grid, .analytics-grid, .finance-summary, .welcome-shortcuts {
    padding: var(--space-md) !important;
  }
  .pomodoro-page {
    padding: var(--space-md) !important;
  }
  .calendar-controls {
    padding: var(--space-md) !important;
    flex-direction: column;
    gap: var(--space-sm);
  }
}
`;
  fs.writeFileSync('styles/main.css', css);
}

console.log('Mobile UI fixes applied.');
