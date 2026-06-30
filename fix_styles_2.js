const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'js', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Replace background:var(--bg-primary); in ANY wrapper like class=".*-page"
  const bgRegex = /class="([a-zA-Z0-9_-]+-page)"([^>]*)background:\s*var\(--bg-primary\);?([^>]*)/g;
  if (bgRegex.test(content)) {
    content = content.replace(bgRegex, 'class="$1"$2$3');
    changed = true;
  }

  // Replace page-header inline styles
  const headerRegex = /<div class="page-header" style="[^"]*">/g;
  if (headerRegex.test(content)) {
    content = content.replace(headerRegex, '<div class="page-header">');
    changed = true;
  }

  // Clean up any empty style=""
  content = content.replace(/ style=""/g, '');
  content = content.replace(/ style=" "/g, '');

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
});
