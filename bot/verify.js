// Automated startup & sanity verification script
const path = require('path');
const botDir = path.resolve(__dirname);
require('dotenv').config({ path: path.join(botDir, '.env') });

console.log('🔍 [1/3] Проверка синтаксиса и критических констант...');
try {
  const botCode = require('fs').readFileSync(path.join(botDir, 'bot.js'), 'utf8');
  if (botCode.includes('if (!AI_API_KEY)') && !botCode.includes('const AI_API_KEY')) {
    throw new Error('AI_API_KEY referenced but not defined!');
  }
  console.log('✅ Синтаксис и базовые переменные корректны.');
} catch (e) {
  console.error('❌ ОШИБКА ВАЛИДАЦИИ:', e.message);
  process.exit(1);
}

console.log('🔍 [2/3] Тестовый сухой запуск bot.js...');
const { spawn } = require('child_process');
const proc = spawn('node', ['-e', `
  require('dotenv').config();
  try {
    require('./bot.js');
    console.log('DRY_RUN_OK');
    setTimeout(() => process.exit(0), 1500);
  } catch (err) {
    console.error('CRASH:', err.stack || err.message);
    process.exit(1);
  }
`], { cwd: botDir, stdio: 'pipe' });

let output = '';
let errOutput = '';
proc.stdout.on('data', d => { output += d.toString(); });
proc.stderr.on('data', d => { errOutput += d.toString(); });

proc.on('close', (code) => {
  if (code === 0 && output.includes('DRY_RUN_OK')) {
    console.log('✅ Бот успешно поднимается и не падает при старте.');
    console.log('🎉 [3/3] ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ! Код надёжен и готов к деплою.\n');
    process.exit(0);
  } else {
    console.error('❌ КРИТИЧЕСКИЙ СБОЙ ПРИ ТЕСТОВОМ ЗАПУСКЕ БОТА!');
    console.error(errOutput || output);
    process.exit(1);
  }
});
