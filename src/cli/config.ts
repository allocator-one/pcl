import chalk from 'chalk';
import { PlanCouncilConfig } from '../config/schema.js';
import { loadConfig } from '../config/loader.js';

/**
 * Display resolved configuration
 */
export async function showConfig(): Promise<void> {
  console.log(chalk.bold.blue('⚙️  Plan Council Configuration\n'));

  try {
    const config = await loadConfig();

    // Models
    console.log(chalk.bold('Models:'));
    for (const model of config.models) {
      const apiKeyStatus = model.apiKey ? '(key set)' : '(env)';
      console.log(`  • ${model.provider}/${model.model} ${chalk.gray(apiKeyStatus)}`);
    }
    console.log();

    // Settings
    console.log(chalk.bold('Settings:'));
    console.log(`  Depth: ${config.depth}`);
    console.log(`  Deduplication threshold: ${config.deduplicationThreshold}`);
    console.log(`  Consensus threshold: ${config.consensusThreshold}`);
    console.log(`  Timeout: ${config.timeout}ms`);
    if (config.maxCost) {
      console.log(`  Max cost: $${config.maxCost}`);
    }
    console.log();

    // Consensus
    if (config.consensus) {
      console.log(chalk.bold('Consensus:'));
      console.log(`  Similarity algorithm: ${config.consensus.similarity}`);
      console.log();
    }

    // Research
    if (config.research?.enabled) {
      console.log(chalk.bold('Research:'));
      console.log(`  Enabled: Yes`);
      console.log(`  Provider: ${config.research.provider}`);
      if (config.research.model) {
        console.log(`  Model: ${config.research.model}`);
      }
      console.log(`  Max tokens: ${config.research.maxTokens}`);
      console.log(`  Cache TTL: ${config.research.cacheTTL}s`);
      console.log();
    }

    // GitHub
    if (config.github?.token) {
      console.log(chalk.bold('GitHub:'));
      console.log(`  Token: ${chalk.gray('(set)')}`);
      console.log();
    }

    // Plugins
    if (config.plugins && config.plugins.length > 0) {
      console.log(chalk.bold('Plugins:'));
      for (const plugin of config.plugins) {
        console.log(`  • ${plugin.type}: ${plugin.name} (${plugin.path})`);
      }
      console.log();
    }

    console.log(chalk.green('✓ Configuration loaded successfully'));
  } catch (error) {
    console.error(chalk.red('Error loading configuration:'));
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Get predefined configuration profile
 */
export function getProfile(profile: 'fast' | 'thorough'): Partial<PlanCouncilConfig> {
  switch (profile) {
    case 'fast':
      return {
        models: [
          { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
          { provider: 'openai', model: 'gpt-5.6-luna' },
          { provider: 'google', model: 'gemini-3.5-flash-lite' },
        ],
        timeout: 30000,
        deduplicationThreshold: 0.8, // More aggressive deduplication
      };

    case 'thorough':
      // Flagships as of 2026-09. Update when newer ones are released.
      return {
        models: [
          { provider: 'anthropic', model: 'claude-opus-5-5' },
          { provider: 'openai', model: 'gpt-5.6-sol' },
          { provider: 'google', model: 'gemini-3.1-pro-preview' },
        ],
        timeout: 120000,
        deduplicationThreshold: 0.6, // Less aggressive - preserve variations
        research: {
          enabled: true,
          provider: 'perplexity',
          model: 'sonar-deep-research',
          maxTokens: 8192,
          cacheTTL: 3600,
        },
      };

    default:
      throw new Error(`Unknown profile: ${profile}`);
  }
}
