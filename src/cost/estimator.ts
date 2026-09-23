import { ModelConfig } from '../config/schema.js';

export interface CostEstimate {
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

export interface TotalCostEstimate {
  models: CostEstimate[];
  totalCost: number;
}

// Token estimation heuristic: Use Buffer.byteLength for accurate byte count
// then divide by ~4 (typical tokens are ~4 bytes in UTF-8)
// NOTE: Buffer.byteLength is Node.js-specific (not portable to browser), which is acceptable for this CLI tool
export function estimateTokens(text: string): number {
  const byteLength = Buffer.byteLength(text, 'utf8');
  return Math.ceil(byteLength / 4);
}

// Standard list prices per 1M tokens, as published on 2026-09-23.
// gemini-3.8-flash is introductory until 2026-12-31 ($1.50/$7.50 after).
const PRICING: Record<
  string,
  { input: number; output: number } // dollars per 1M tokens
> = {
  // Anthropic
  'claude-fable-5-1': { input: 10, output: 50 },
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-opus-5': { input: 5, output: 25 },
  'claude-opus-4-6': { input: 5, output: 25 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-sonnet-4-5-20250929': { input: 3, output: 15 },
  'claude-haiku-4-5-20251001': { input: 1, output: 5 },

  // OpenAI
  'gpt-5.6-sol': { input: 5, output: 30 },
  'gpt-5.6-terra': { input: 2, output: 12 },
  'gpt-5.6-luna': { input: 0.2, output: 1.2 },
  'gpt-5.5': { input: 5, output: 30 },
  'gpt-5.4': { input: 2.5, output: 15 },
  'gpt-5': { input: 1.25, output: 10 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-4o': { input: 2.5, output: 10 },
  'o1': { input: 15, output: 60 },
  'o3': { input: 2, output: 8 },
  'o4-mini': { input: 1.1, output: 4.4 },

  // Google
  'gemini-3.1-pro-preview': { input: 2, output: 12 },
  'gemini-3.8-flash': { input: 0.75, output: 3.75 },
  'gemini-3.5-flash-lite': { input: 0.3, output: 2.5 },
  'gemini-2.5-pro': { input: 1.25, output: 10 },
  'gemini-2.5-flash': { input: 0.3, output: 2.5 },
};

export function estimateCost(
  models: ModelConfig[],
  inputText: string,
  estimatedOutputTokens: number = 2000
): TotalCostEstimate {
  const inputTokens = estimateTokens(inputText);

  const modelEstimates: CostEstimate[] = models.map((modelConfig) => {
    const pricing = PRICING[modelConfig.model] || { input: 5, output: 15 };

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (estimatedOutputTokens / 1_000_000) * pricing.output;

    return {
      model: modelConfig.model,
      inputTokens,
      outputTokens: estimatedOutputTokens,
      estimatedCost: inputCost + outputCost,
    };
  });

  const totalCost = modelEstimates.reduce((sum, est) => sum + est.estimatedCost, 0);

  return {
    models: modelEstimates,
    totalCost,
  };
}

export function formatCostEstimate(estimate: TotalCostEstimate): string {
  const lines: string[] = [];

  lines.push('Cost Estimate:');
  lines.push('');

  for (const model of estimate.models) {
    lines.push(
      `  ${model.model}: ~$${model.estimatedCost.toFixed(4)} (${model.inputTokens} in + ${model.outputTokens} out)`
    );
  }

  lines.push('');
  lines.push(`Total: ~$${estimate.totalCost.toFixed(4)}`);

  return lines.join('\n');
}
