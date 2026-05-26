import type {
  ChatMessage,
  ChatCompletionResponse,
  ChatCompletionChunk,
  ChatToolDefinition,
  ChatToolChoice,
  Platform,
} from "@routezero/shared/types.js";

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  tools?: ChatToolDefinition[];
  tool_choice?: ChatToolChoice;
  parallel_tool_calls?: boolean;
}

export interface ImageOptions {
  model?: string;
  n?: number;
  size?: string;
  response_format?: "url" | "b64_json";
}

export interface ImageResponse {
  created: number;
  data: { url?: string; b64_json?: string }[];
}

export interface EmbeddingResponse {
  model: string;
  data: { index: number; embedding: number[] }[];
  usage: { prompt_tokens: number; total_tokens: number };
}

export abstract class BaseProvider {
  abstract readonly platform: Platform;
  abstract readonly name: string;

  abstract chatCompletion(
    apiKey: string,
    messages: ChatMessage[],
    modelId: string,
    options?: CompletionOptions,
  ): Promise<ChatCompletionResponse>;

  abstract streamChatCompletion(
    apiKey: string,
    messages: ChatMessage[],
    modelId: string,
    options?: CompletionOptions,
  ): AsyncGenerator<ChatCompletionChunk>;

  abstract validateKey(apiKey: string): Promise<boolean>;

  /** Generate images from a text prompt. Throws by default if not supported. */
  async generateImage(
    _apiKey: string,
    _prompt: string,
    _options?: ImageOptions,
  ): Promise<ImageResponse> {
    throw new Error(`${this.platform} does not support image generation`);
  }

  /** Create embeddings. Throws by default if not supported. */
  async createEmbeddings(
    _apiKey: string,
    _input: string | string[],
    _modelId: string,
  ): Promise<EmbeddingResponse> {
    throw new Error(`${this.platform} does not support embeddings`);
  }

  /** Check if this provider supports a capability (vision, image_gen, embeddings, audio). */
  supportsCapability(_capability: string): boolean {
    return false;
  }

  protected async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs = 15000,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  protected makeId(): string {
    return `chatcmpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
