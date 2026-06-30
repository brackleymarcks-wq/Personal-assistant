const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'js', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Fix page wrapper
  const pageRegex = /<div class="([a-zA-Z0-9_-]+-page)" style="display:flex;flex-direction:column;height:100%;background:var\(--bg-primary\);?(overflow-y:auto;)?">/g;
  if (pageRegex.test(content)) {
    content = content.replace(pageRegex, '<div class="$1" style="display:flex;flex-direction:column;height:100%;$2">');
    changed = true;
  }

  // Fix page header
  const headerRegex = /<div class="page-header" style="background:var\(--bg-surface\);padding:var\(--space-lg\) var\(--space-xl\);border-bottom:1px solid var\(--border\);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">/g;
  if (headerRegex.test(content)) {
    content = content.replace(headerRegex, '<div class="page-header">');
    changed = true;
  }

  // Fix page title
  const titleRegex = /<div class="page-title" style="font-size:20px;font-weight:700;?(display:flex;align-items:center;gap:8px;)?">/g;
  if (titleRegex.test(content)) {
    content = content.replace(titleRegex, '<div class="page-title" style="$1">');
    changed = true;
  }

  // Fix page subtitle
  const subtitleRegex = /class="page-subtitle"( id="[^"]+")? style="font-size:13px;color:var\(--text-secondary\);margin-top:2px;"/g;
  if (subtitleRegex.test(content)) {
    content = content.replace(subtitleRegex, 'class="page-subtitle"$1');
    changed = true;
  }

  // Clean up empty style attributes if any are left
  content = content.replace(/ style=""/g, '');

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
});
