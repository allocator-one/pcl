import { describe, it, expect, vi, beforeEach } from 'vitest';

const create = vi.fn();

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create } };
  },
}));

const { OpenAIAdapter } = await import('./openai.js');

const request = { systemPrompt: 'Respond in JSON.', userPrompt: 'user', maxTokens: 100, temperature: 0.3 };

describe('dispatch/openai', () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue({ choices: [{ message: { content: '{}' } }] });
  });

  it('omits temperature for GPT-5 family models', async () => {
    await new OpenAIAdapter('key', 'gpt-5.6-sol').execute(request);

    const params = create.mock.calls[0][0];
    expect(params).not.toHaveProperty('temperature');
    expect(params.max_completion_tokens).toBe(100);
  });

  it('keeps temperature for models that accept it', async () => {
    await new OpenAIAdapter('key', 'gpt-4o').execute(request);

    expect(create.mock.calls[0][0].temperature).toBe(0.3);
  });
});
