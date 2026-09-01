// Central secret-redaction helpers. Every error message, log line, and
// receipt written by this codebase passes through here. Secrets must never
// appear in logs, test output, receipts, or thrown errors.

const SECRET_ENV_KEYS = [
  'PERFECT_CORP_API_KEY',
  'PERFECT_CORP_API_SECRET',
  'SERPAPI_KEY',
  'FEATHERLESS_API_KEY',
] as const;

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
