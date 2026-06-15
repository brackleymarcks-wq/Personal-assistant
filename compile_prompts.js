const fs = require('fs');
const sys = fs.readFileSync('SYSTEM_PROMPT.md', 'utf8');
const ctx = fs.readFileSync('CONTEXT.md', 'utf8');
const out = `window.SYSTEM_PROMPT = ${JSON.stringify(sys)};\nwindow.USER_CONTEXT = ${JSON.stringify(ctx)};\n`;
fs.writeFileSync('js/prompts.js', out);
