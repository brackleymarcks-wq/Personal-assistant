const fs = require('fs');

// 1. Update index.html
let html = fs.readFileSync('index.html', 'utf8');
if (!html.includes('id="sidebar-overlay"')) {
  html = html.replace('<!-- Sidebar -->', '<div id="sidebar-overlay" class="sidebar-overlay"></div>\n      <!-- Sidebar -->');
  fs.writeFileSync('index.html', html);
}

// 2. Update CSS
let css = fs.readFileSync('styles/main.css', 'utf8');
if (!css.includes('.sidebar-overlay {')) {
  css += `
.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 199;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
.sidebar-overlay.show {
  opacity: 1;
  pointer-events: auto;
}
`;
  fs.writeFileSync('styles/main.css', css);
}

// 3. Update app.js
let app = fs.readFileSync('js/app.js', 'utf8');
app = app.replace(
  "sidebar.classList.toggle('mobile-open');",
  "sidebar.classList.toggle('mobile-open');\n        const overlay = document.getElementById('sidebar-overlay');\n        if(overlay) overlay.classList.toggle('show', sidebar.classList.contains('mobile-open'));"
);
app = app.replace(
  "document.querySelector('.sidebar').classList.remove('mobile-open');",
  "document.querySelector('.sidebar').classList.remove('mobile-open');\n          const overlay = document.getElementById('sidebar-overlay');\n          if(overlay) overlay.classList.remove('show');"
);
if (!app.includes("overlay.addEventListener('click'")) {
  app = app.replace(
    "this.initNav();",
    "this.initNav();\n    const overlay = document.getElementById('sidebar-overlay');\n    if (overlay) overlay.addEventListener('click', () => {\n      document.querySelector('.sidebar').classList.remove('mobile-open');\n      overlay.classList.remove('show');\n    });"
  );
}
fs.writeFileSync('js/app.js', app);
console.log('Sidebar fixes applied.');
