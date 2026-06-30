require('dotenv').config();

const AI_MODEL = process.env.AI_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
const isOpenRouter = process.env.OPENROUTER_API_KEY || (process.env.AI_API_KEY && process.env.AI_API_KEY.includes('sk-or'));
const AI_API_URL = process.env.AI_API_URL || (isOpenRouter ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.groq.com/openai/v1/chat/completions');

let minimalSystem = true;
let overrideModel = null;
if (minimalSystem && isOpenRouter) {
  overrideModel = 'google/gemini-2.0-flash-exp:free';
}

function callAPI(forceModel = null) {
  let modelToUse = forceModel || AI_MODEL;
  return modelToUse;
}

console.log('isOpenRouter:', !!isOpenRouter);
console.log('overrideModel:', overrideModel);
console.log('modelToUse:', callAPI(overrideModel));
console.log('AI_API_URL:', AI_API_URL);
