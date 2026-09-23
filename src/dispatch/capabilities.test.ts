import { describe, it, expect } from 'vitest';
import { getModelCapabilities } from './capabilities.js';

describe('dispatch/capabilities', () => {
  it('drops temperature for the Claude 5 family, including dated ids', () => {
    for (const model of ['claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5', 'claude-sonnet-5-20260630', 'claude-fable-5-1']) {
      expect(getModelCapabilities('anthropic', model).supportsTemperature, model).toBe(false);
    }
  });

  it('keeps temperature for older Claude models', () => {
    for (const model of ['claude-haiku-4-5-20251001', 'claude-opus-4-6', 'claude-sonnet-4-5-20250929']) {
      expect(getModelCapabilities('anthropic', model).supportsTemperature, model).toBe(true);
    }
  });

  it('allows forced tool choice except on Opus 5.5 and Fable 5.1', () => {
    expect(getModelCapabilities('anthropic', 'claude-opus-5-5').supportsForcedToolChoice).toBe(false);
    expect(getModelCapabilities('anthropic', 'claude-fable-5-1').supportsForcedToolChoice).toBe(false);
    expect(getModelCapabilities('anthropic', 'claude-opus-5').supportsForcedToolChoice).toBe(true);
    expect(getModelCapabilities('anthropic', 'claude-sonnet-5').supportsForcedToolChoice).toBe(true);
  });

  it('drops temperature for the OpenAI GPT-5 family and every o-series model', () => {
    for (const model of ['gpt-5', 'gpt-5.5', 'gpt-5.6-sol', 'gpt-5.6-luna', 'o1', 'o3', 'o4-mini']) {
      expect(getModelCapabilities('openai', model).supportsTemperature, model).toBe(false);
    }
    expect(getModelCapabilities('openai', 'gpt-4o').supportsTemperature).toBe(true);
  });

  it('keeps temperature for Gemini models', () => {
    expect(getModelCapabilities('google', 'gemini-3.8-flash').supportsTemperature).toBe(true);
  });
});
