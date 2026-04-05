import { AI } from '@pmai/shared';
import { logger } from '../lib/logger';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl = AI.OPENROUTER_API_URL;
  private model = AI.MODEL;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }
  }

  async chatCompletion(messages: ChatMessage[]): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://pmai.com',
          'X-Title': 'PMAI AI Engine',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: AI.MAX_TOKENS,
          temperature: AI.TEMPERATURE,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error({ status: response.status, body: errorBody }, 'OpenRouter API error');
        throw new Error(`OpenRouter API returned ${response.status}: ${errorBody}`);
      }

      const data: OpenRouterResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('OpenRouter returned no choices');
      }

      logger.info(
        { promptTokens: data.usage?.prompt_tokens, completionTokens: data.usage?.completion_tokens },
        'OpenRouter API call successful'
      );

      return data.choices[0].message.content;
    } finally {
      clearTimeout(timeout);
    }
  }
}
