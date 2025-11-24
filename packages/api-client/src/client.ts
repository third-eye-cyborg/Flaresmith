import { z } from "zod";

export interface CloudMakeClientConfig {
  baseUrl: string;
  apiKey?: string;
  onError?: (error: unknown) => void;
}

export class CloudMakeClient {
  private baseUrl: string;
  private apiKey?: string;
  private onError?: (error: unknown) => void;

  constructor(config: CloudMakeClientConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.onError = config.onError;
  }

  async request<T>(
    method: string,
    path: string,
    schema: z.ZodSchema<T>,
    body?: unknown
  ): Promise<T> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return schema.parse(data);
    } catch (error) {
      this.onError?.(error);
      throw error;
    }
  }

  async get<T>(path: string, schema: z.ZodSchema<T>): Promise<T> {
    return this.request("GET", path, schema);
  }

  async post<T>(path: string, schema: z.ZodSchema<T>, body?: unknown): Promise<T> {
    return this.request("POST", path, schema, body);
  }

  async put<T>(path: string, schema: z.ZodSchema<T>, body?: unknown): Promise<T> {
    return this.request("PUT", path, schema, body);
  }

  async patch<T>(path: string, schema: z.ZodSchema<T>, body?: unknown): Promise<T> {
    return this.request("PATCH", path, schema, body);
  }

  async delete<T>(path: string, schema: z.ZodSchema<T>): Promise<T> {
    return this.request("DELETE", path, schema);
  }
}
