import axios, { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import tauriAxiosAdapter from '../src/index.ts';

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn<typeof fetch>(),
}));

vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: mockFetch,
}));

const client = axios.create({ adapter: tauriAxiosAdapter });

function jsonResponse(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, { status: 200, statusText: 'OK', ...init });
}

function hangUntilAborted(init?: RequestInit) {
  return new Promise<Response>((_, reject) => {
    const signal = init?.signal;
    if (!signal) {
      return;
    }
    if (signal.aborted) {
      reject(new Error('Request cancelled'));
      return;
    }
    signal.addEventListener('abort', () => reject(new Error('Request cancelled')), { once: true });
  });
}

describe('tauriAxiosAdapter', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('performs GET text requests', async () => {
    mockFetch.mockResolvedValue(new Response('hello', { status: 200, statusText: 'OK' }));

    const response = await client.get('http://example.com/get/text');

    expect(response.data).toBe('hello');
    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://example.com/get/text',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('serializes query params into the request URL', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ ok: true }));

    await client.get('http://example.com/get/json', {
      params: { key1: 'value1', key2: 'value2' },
    });

    expect(mockFetch.mock.calls[0]?.[0]).toBe(
      'http://example.com/get/json?key1=value1&key2=value2'
    );
  });

  it('sends JSON POST requests', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ saved: true }));

    const response = await client.post('http://example.com/post/json', { name: 'Grant' });

    expect(response.data).toEqual({ saved: true });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://example.com/post/json',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Grant' }),
      })
    );
  });

  it('sends urlencoded form POST requests', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ saved: true }));

    await client.post('http://example.com/post/form', 'name=Grant', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://example.com/post/form',
      expect.objectContaining({
        method: 'POST',
        body: 'name=Grant',
      })
    );
  });

  it('returns blob responses', async () => {
    mockFetch.mockResolvedValue(
      new Response(new Blob(['file']), {
        status: 200,
        headers: { 'content-type': 'application/octet-stream' },
      })
    );

    const response = await client.get('http://example.com/download', { responseType: 'blob' });

    expect(response.data).toBeInstanceOf(Blob);
  });

  it('returns arraybuffer responses', async () => {
    mockFetch.mockResolvedValue(new Response(new Uint8Array([1, 2, 3]).buffer, { status: 200 }));

    const response = await client.get('http://example.com/download', { responseType: 'arraybuffer' });

    expect(response.data).toBeInstanceOf(ArrayBuffer);
  });

  it('clears content-type for FormData uploads', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ uploaded: true }));
    const formData = new FormData();
    formData.append('name', 'abc');

    await client.post('http://example.com/upload', formData);

    const init = mockFetch.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get('content-type')).toBeNull();
  });

  it('rejects HTTP error responses', async () => {
    mockFetch.mockResolvedValue(new Response('not found', { status: 404, statusText: 'Not Found' }));

    const error = await client.get('http://example.com/404').catch((err: unknown) => err);

    expect(error).toBeInstanceOf(AxiosError);
    expect((error as AxiosError).status).toBe(404);
  });

  it('honors allowAbsoluteUrls: false with baseURL', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ ok: true }));

    await client.get('http://attacker.test/resource', {
      baseURL: 'http://example.com/api/',
      allowAbsoluteUrls: false,
    });

    expect(mockFetch.mock.calls[0]?.[0]).toBe(
      'http://example.com/api/http://attacker.test/resource'
    );
  });

  it('aborts in-flight requests on timeout', async () => {
    vi.useFakeTimers();
    mockFetch.mockImplementation((_url, init) => hangUntilAborted(init));

    const request = client.get('http://example.com/delayed', { timeout: 1000 });
    const assertion = expect(request).rejects.toMatchObject({
      isAxiosError: true,
      code: AxiosError.ETIMEDOUT,
    });
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it('aborts in-flight requests when signal is cancelled', async () => {
    mockFetch.mockImplementation((_url, init) => hangUntilAborted(init));
    const controller = new AbortController();

    const request = client.get('http://example.com/cancel', { signal: controller.signal });
    controller.abort();

    await expect(request).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(AxiosError);
      expect((error as AxiosError).code).toBe('ERR_CANCELED');
      return true;
    });
  });
});
