import { describe, it, expect, vi, beforeEach } from 'vitest';

const create = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create };
  },
}));

const { AnthropicAdapter } = await import('./anthropic.js');

const request = { systemPrompt: 'system', userPrompt: 'user', maxTokens: 100, temperature: 0.3 };

function toolUseResponse() {
  return {
    content: [{ type: 'tool_use', name: 'create_plan', input: { summary: 'ok' } }],
    usage: { input_tokens: 1, output_tokens: 2 },
  };
}

describe('dispatch/anthropic', () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue(toolUseResponse());
  });

  it('sends temperature and forces the plan tool on models that support both', async () => {
    await new AnthropicAdapter('key', 'claude-haiku-4-5-20251001').execute(request);

    const params = create.mock.calls[0][0];
    expect(params.temperature).toBe(0.3);
    expect(params.tool_choice).toEqual({ type: 'tool', name: 'create_plan' });
  });

  it('omits temperature for Claude 5 models', async () => {
    await new AnthropicAdapter('key', 'claude-sonnet-5').execute(request);

    const params = create.mock.calls[0][0];
    expect(params).not.toHaveProperty('temperature');
    expect(params.tool_choice).toEqual({ type: 'tool', name: 'create_plan' });
  });

  it('uses auto tool choice on models that reject forced tool choice', async () => {
    await new AnthropicAdapter('key', 'claude-opus-5-5').execute(request);

    const params = create.mock.calls[0][0];
    expect(params.tool_choice).toEqual({ type: 'auto' });
    expect(params).not.toHaveProperty('temperature');
  });

  it('throws when the model answers without calling the plan tool', async () => {
    create.mockResolvedValue({ content: [{ type: 'text', text: 'hi' }], usage: { input_tokens: 1, output_tokens: 1 } });

    await expect(new AnthropicAdapter('key', 'claude-opus-5-5').execute(request)).rejects.toThrow(/No tool_use block/);
  });
});
