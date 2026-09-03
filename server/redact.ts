// Central secret-redaction helpers. Every error message, log line, and
// receipt written by this codebase passes through here. Secrets must never
// appear in logs, test output, receipts, or thrown errors.

const SECRET_ENV_KEYS = [
  'PERFECT_CORP_API_KEY',
  'PERFECT_CORP_API_SECRET',
  'SERPAPI_KEY',
  'FEATHERLESS_API_KEY',
] as const;

const SENSITIVE_JSON_KEY =
  /^(?:api[_-]?key|apikey|access[_-]?token|auth(?:orization)?|bearer|client[_-]?secret|credential|password|query[_-]?token|refresh[_-]?token|secret|signature|security[_-]?token)$/i;
const SENSITIVE_QUERY_KEY =
  /^(?:api[_-]?key|apikey|key|token|access[_-]?token|auth|authorization|credential|password|secret|signature|x-amz-.+)$/i;

/** Replace any known secret value and common credential-bearing URL params. */
export function redactSecrets(input: string): string {
  let out = input;
  for (const key of SECRET_ENV_KEYS) {
    const value = process.env[key];
    if (value && value.length >= 8) {
      out = out.split(value).join(`[${key} REDACTED]`);
    }
  }
  // Credential-bearing query params, regardless of whether we know the value.
  out = out.replace(/([?&](?:api_key|apikey|key|token|access_token)=)[^&\s"']+/gi, '$1[REDACTED]');
  // AWS presigned-URL signature material (Perfect Corp result URLs are S3-signed).
  out = out.replace(
    /([?&]X-Amz-(?:Signature|Credential|Security-Token|SignedHeaders|Algorithm|Date|Expires)=)[^&\s"']+/gi,
    '$1[REDACTED]',
  );
  out = out.replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/g, '$1[REDACTED]');
  return out;
}

/** Strip the entire query string from a signed URL, keeping origin+path. */
export function stripSignedQuery(url: string): string {
  try {
    const u = new URL(url);
    if (u.search.length > 0) {
      return `${u.origin}${u.pathname}?[SIGNED-QUERY-REDACTED]`;
    }
    return url;
  } catch {
    return redactSecrets(url);
  }
}

function redactExplicitValues(input: string, secretValues: readonly string[]): string {
  let output = input;
  for (const value of secretValues) {
    if (value.length >= 8) output = output.split(value).join('[EXPLICIT SECRET REDACTED]');
  }
  return output;
}

/**
 * Sanitize a provider-returned string without assuming credentials only use
 * the environment variable values known to this process.
 */
export function sanitizeProviderString(
  input: string,
  secretValues: readonly string[] = [],
): string {
  const redacted = redactSecrets(redactExplicitValues(input, secretValues));
  try {
    const url = new URL(redacted);
    let changed = false;
    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEY.test(key)) {
        url.searchParams.set(key, '[REDACTED]');
        changed = true;
      }
    }
    if (/^https?:$/.test(url.protocol)) {
      if ([...url.searchParams.keys()].some((key) => /^x-amz-/i.test(key))) {
        return `${url.origin}${url.pathname}?[SIGNED-QUERY-REDACTED]`;
      }
      return changed ? url.toString() : redacted;
    }
  } catch {
    // Non-URL strings still receive the explicit and environment redaction above.
  }
  return redacted;
}

function sanitizeProviderValue(value: unknown, secretValues: readonly string[]): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeProviderValue(item, secretValues));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SENSITIVE_JSON_KEY.test(key)
          ? '[REDACTED]'
          : sanitizeProviderValue(item, secretValues),
      ]),
    );
  }
  return typeof value === 'string' ? sanitizeProviderString(value, secretValues) : value;
}

/**
 * Preserve the complete JSON response object before domain normalization while
 * recursively redacting credential-shaped fields and URL query tokens. The
 * returned UTF-8 text is the exact retained artifact that callers hash.
 */
export function sanitizeProviderResponseBody(
  bodyText: string,
  secretValues: readonly string[] = [],
): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText) as unknown;
  } catch {
    return sanitizeProviderString(bodyText, secretValues);
  }
  return JSON.stringify(sanitizeProviderValue(parsed, secretValues));
}

/** Deep-sanitize any JSON-serializable value for receipts/fixtures. */
export function sanitizeJson<T>(value: T): T {
  const text = JSON.stringify(value);
  const redacted = redactSecrets(text)
    // Signed URLs inside JSON strings: keep path, drop query material.
    .replace(
      /(https:\/\/[^"\s]+?)\?[^"\s]*X-Amz-[^"\s]*/g,
      '$1?[SIGNED-QUERY-REDACTED]',
    );
  return JSON.parse(redacted) as T;
}

/** Error type whose message is guaranteed redacted. */
export class ProviderError extends Error {
  constructor(message: string) {
    super(redactSecrets(message));
    this.name = 'ProviderError';
  }
}
