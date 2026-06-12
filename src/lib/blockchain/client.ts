const BASE_URL = process.env.HYPERLEDGER_API_URL;

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

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new BlockchainClientError(
      `Fabric REST API error: ${response.statusText}`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
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
