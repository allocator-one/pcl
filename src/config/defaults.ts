import { ModelConfig } from './schema.js';

export function getDefaultModels(): ModelConfig[] {
  const models: ModelConfig[] = [];

  // Auto-detect Anthropic (Opus 5.5)
  if (process.env.ANTHROPIC_API_KEY) {
    models.push({
      provider: 'anthropic',
      model: 'claude-opus-5-5',
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxTokens: 32768, // Anthropic requires max_tokens
    });
  }

  // Auto-detect OpenAI (GPT-5.6 Sol)
  if (process.env.OPENAI_API_KEY) {
    models.push({
      provider: 'openai',
      model: 'gpt-5.6-sol',
      apiKey: process.env.OPENAI_API_KEY,
      // No maxTokens cap - let it run
    });
  }

  // Auto-detect Google (Gemini 3.1 Pro)
  const googleApiKey = process.env.GOOGLE_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (googleApiKey) {
    models.push({
      provider: 'google',
      model: 'gemini-3.1-pro-preview',
      apiKey: googleApiKey,
      // No maxOutputTokens for thinking models
    });
  }

  return models;
}

export const MODEL_ALIASES: Record<string, { provider: string; model: string }> = {
  'opus': { provider: 'anthropic', model: 'claude-opus-5-5' },
  'opus-5-5': { provider: 'anthropic', model: 'claude-opus-5-5' },
  'opus-5': { provider: 'anthropic', model: 'claude-opus-5' },
  'opus-4-6': { provider: 'anthropic', model: 'claude-opus-4-6' },
  'fable': { provider: 'anthropic', model: 'claude-fable-5-1' },
  'fable-5-1': { provider: 'anthropic', model: 'claude-fable-5-1' },
  'sonnet': { provider: 'anthropic', model: 'claude-sonnet-5' },
  'sonnet-5': { provider: 'anthropic', model: 'claude-sonnet-5' },
  'sonnet-4-5': { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
  'haiku': { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
  'haiku-4-5': { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },

  'gpt-5.6': { provider: 'openai', model: 'gpt-5.6-sol' },
  'gpt-5': { provider: 'openai', model: 'gpt-5' },
  'gpt-5.4': { provider: 'openai', model: 'gpt-5.4' },
  'gpt-4': { provider: 'openai', model: 'gpt-4-turbo' },
  'gpt-4o': { provider: 'openai', model: 'gpt-4o' },
  'o1': { provider: 'openai', model: 'o1' },
  'o3': { provider: 'openai', model: 'o3' },

  'gemini': { provider: 'google', model: 'gemini-3.1-pro-preview' },
  'gemini-3': { provider: 'google', model: 'gemini-3.1-pro-preview' },
  'gemini-3.1': { provider: 'google', model: 'gemini-3.1-pro-preview' },
  'gemini-3.1-pro': { provider: 'google', model: 'gemini-3.1-pro-preview' },
  'gemini-flash': { provider: 'google', model: 'gemini-3.8-flash' },
  'gemini-2': { provider: 'google', model: 'gemini-2.5-flash' },
  'gemini-2.5': { provider: 'google', model: 'gemini-2.5-pro' },
  'gemini-2.5-pro': { provider: 'google', model: 'gemini-2.5-pro' },
  'gemini-2.5-flash': { provider: 'google', model: 'gemini-2.5-flash' },
};
