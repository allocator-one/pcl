export interface ModelCapabilities {
  supportsTemperature: boolean;
  supportsForcedToolChoice: boolean;
  supportsJSON: boolean;
  requiresMaxTokens: boolean;
  isReasoningModel: boolean;
  isThinkingModel: boolean;
}

// The Claude 5 family rejects a non-default `temperature` with a 400 (probed 2026-09-23).
const TEMPERATURE_DEPRECATED_CLAUDE_PREFIXES = ['claude-sonnet-5', 'claude-opus-5', 'claude-fable-5'];
// These reject tool_choice "tool"/"any" with a 400 and need "auto".
const AUTO_TOOL_CHOICE_ONLY_CLAUDE_PREFIXES = ['claude-opus-5-5', 'claude-fable-5-1'];

function hasPrefix(model: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => model.startsWith(prefix));
}

export function getModelCapabilities(provider: string, model: string): ModelCapabilities {
  // OpenAI GPT-5 family and o-series: all but gpt-5.4 reject a non-default temperature,
  // so the whole family omits it rather than tracking per-model exceptions
  if (provider === 'openai' && (model.startsWith('gpt-5') || /^o[1-9]/.test(model))) {
    return {
      supportsTemperature: false,
      supportsForcedToolChoice: true,
      supportsJSON: true,
      requiresMaxTokens: false,
      isReasoningModel: true,
      isThinkingModel: false,
    };
  }

  // Thinking models (Gemini 2.x thinking variants)
  if (provider === 'google' && model.includes('thinking')) {
    return {
      supportsTemperature: true,
      supportsForcedToolChoice: true,
      supportsJSON: true,
      requiresMaxTokens: false,
      isReasoningModel: false,
      isThinkingModel: true,
    };
  }

  // Anthropic models
  if (provider === 'anthropic') {
    return {
      supportsTemperature: !hasPrefix(model, TEMPERATURE_DEPRECATED_CLAUDE_PREFIXES),
      supportsForcedToolChoice: !hasPrefix(model, AUTO_TOOL_CHOICE_ONLY_CLAUDE_PREFIXES),
      supportsJSON: true,
      requiresMaxTokens: true,
      isReasoningModel: false,
      isThinkingModel: false,
    };
  }

  // Default capabilities (OpenAI, Google standard models)
  return {
    supportsTemperature: true,
    supportsForcedToolChoice: true,
    supportsJSON: true,
    requiresMaxTokens: false,
    isReasoningModel: false,
    isThinkingModel: false,
  };
}
