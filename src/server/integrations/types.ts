/**
 * Common shapes shared across platform integrations.
 * Each integration implements a subset based on what the platform supports.
 */

export type PublishResult = {
  externalPostId: string;
  externalUrl?: string;
  publishedAt: Date;
  raw?: unknown;
};

export type PublishError = {
  code: string;
  message: string;
  retryable: boolean;
  raw?: unknown;
};

export type Outcome<T> =
  | { ok: true; value: T }
  | { ok: false; error: PublishError };

export function ok<T>(value: T): Outcome<T> {
  return { ok: true, value };
}

export function err(
  code: string,
  message: string,
  retryable = false,
  raw?: unknown,
): Outcome<never> {
  return { ok: false, error: { code, message, retryable, raw } };
}
