const BASE_URL = process.env.HYPERLEDGER_API_URL;
const REQUEST_TIMEOUT_MS = 12_000;

class BlockchainClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'BlockchainClientError';
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  if (!BASE_URL) {
    throw new BlockchainClientError('HYPERLEDGER_API_URL tidak dikonfigurasi');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    throw new BlockchainClientError(
      timedOut
        ? `Fabric REST API timeout setelah ${REQUEST_TIMEOUT_MS} ms`
        : error instanceof Error
          ? error.message
          : 'Fabric REST API tidak terjangkau',
    );
  } finally {
    clearTimeout(timer);
  }

  const raw = await response.text();

  if (!response.ok) {
    const detail = parseErrorDetail(raw);
    throw new BlockchainClientError(
      detail
        ? `Fabric REST API error: ${detail}`
        : `Fabric REST API error: ${response.statusText}`,
      response.status,
    );
  }

  if (!raw) return undefined as T;

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new BlockchainClientError('Fabric REST API mengembalikan JSON tidak valid');
  }
}

function parseErrorDetail(raw: string): string {
  if (!raw) return '';

  try {
    const parsed = JSON.parse(raw) as { error?: unknown; message?: unknown };
    if (typeof parsed.error === 'string') return parsed.error;
    if (typeof parsed.message === 'string') return parsed.message;
  } catch {
    return raw.slice(0, 240);
  }

  return raw.slice(0, 240);
}

export async function fabricPost<TBody, TResponse>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  return request<TResponse>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function fabricGet<TResponse>(path: string): Promise<TResponse> {
  return request<TResponse>(path, { method: 'GET' });
}
