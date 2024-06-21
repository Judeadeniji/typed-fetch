import * as childProcess from 'child_process';
import { convertStdoutToResponse, fetchToCurl, headers, HttpRequestError, InvalidArgumentError } from "./utils";

type Destination = string | URL;

type TRetryConfig = {
  count: number;
  delay: number;
  attempt: number;
};

type RequestInterceptor = (request: Request) => Request | Promise<Request>;

type TRequestInit = RequestInit & {
  retryConfig?: TRetryConfig;
  interceptors?: RequestInterceptor[] | RequestInterceptor;
  headers?: THeadersInit;
  engine?: "curl" | "fetch";
};

type THeadersInit = HeadersInit & {
  params?: Record<string, string | number>;
  pathname?: string;
};

interface TypedFormData<K extends string> extends FormData {
  append(name: K, value: string |  Blob): void;
  append(name: K, value: string): void;
  append(name: string, blobValue: string, filename?: string): void;
  get(name: K): string | null;
  getAll(name: K): string[];
  has(name: K): boolean;
  delete(name: K): void;
  set(name: K, value: string): void;
  set(name: K, value: string | Blob): void;
}


const fetchImpl = globalThis.fetch;

async function send_request(
  url: Destination,
  options: TRequestInit = {},
  retryConfig: TRetryConfig = {
    count: 0,
    delay: 0,
    attempt: 0,
  }
): Promise<any> {
  // check if is url is a URL object or a string, if it is a string, convert it to a URL object
  const destination = typeof url === 'string' ? new URL(url) : url;

  if (!(destination instanceof URL)) {
    throw new InvalidArgumentError( "url", 'url must be a string or URL object');
  }

  if (options.headers && (typeof options.headers !== 'object')) {
    throw new InvalidArgumentError( "headers", 'headers must be an object');
  }

  const { params, pathname, ...requestHeaders } = options.headers || {};

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      destination.searchParams.append(key, String(value));
    }
  }
  
  if (pathname) {
    destination.pathname = pathname;
  }

  const $r_headers = headers(requestHeaders);

  // make options.header not read-only
  Object.defineProperty(options, 'headers', {
    writable: true,
    enumerable: true,
    configurable: true
  });
  
  options.headers = $r_headers.toHeaders();
  try {
    const response = await fetchImpl(destination.toString(), options);

    if (!response.ok) {
      throw new HttpRequestError(response.status, response.statusText);
    }

    return response;
  } catch (error) {
    if (retryConfig.attempt < retryConfig.count) {
      retryConfig.attempt++;
      await new Promise((resolve) => setTimeout(resolve, retryConfig.delay));
      return send_request(url, options, retryConfig);
    }

    // check the error type to know if it is an abort error
    if (error.name === 'AbortError') {
      throw new HttpRequestError(408, 'Request Timeout');
    }

    throw error;
  }
}

const ResponseImpl = globalThis.Response;

class Response<T> extends ResponseImpl {
  public request: Request;
  constructor(response: Response<T>, request: Request) {
    super(response.body, response);
    this.request = request;
  }

  async json() {
    const clone = this.clone();
    return await clone.json() as T extends object ? T : any;
  }

  async text() {
    const clone = this.clone();
    return await clone.text() as T extends string ? T : string;
  }

  async blob() {
    const clone = this.clone();
    return await clone.blob() as T extends Blob ? T : any;
  }

  async arrayBuffer() {
    const clone = this.clone();
    return await clone.arrayBuffer() as T extends ArrayBuffer ? T : any;
  }

  async formData<S extends string>() {
    const clone = this.clone();
    return await clone.formData() as T extends FormData ? S extends string ? TypedFormData<S> : FormData : any;
  }
}

async function handleInterceptors(
  request: Request,
  interceptors: RequestInterceptor[] | RequestInterceptor
) {
  if (Array.isArray(interceptors)) {
    const length = interceptors.length;
    let r = request;

    for (let i = 0; i < length; i++) {
      r = await interceptors[i](r);
      //          ^?
    }

    return r;
  }

  return await interceptors(request);
}


type ResponseType = object | string | Blob | ArrayBuffer | FormData;

async function fetch<T extends ResponseType>(
  url: Destination,
  option: TRequestInit = {}
) {
  const { retryConfig, interceptors, engine, ...requestInit } = option || {};

  if ((engine) && engine === 'curl') {
    return await fetchWithCUrl<T>(url, requestInit);
  }

  const request = new Request(url.toString(), requestInit);
  if (interceptors) {
    const interceptedRequest = await handleInterceptors(request, interceptors);
    return new Response<T>(await send_request(url, interceptedRequest, retryConfig), interceptedRequest);
  }

  return new Response<T>(await send_request(url, requestInit, retryConfig), request);
}

// cUrl implementation
// use  sever's cUrl to make request
async function fetchWithCUrl<T>(url: Destination, options: TRequestInit = {}) {
  const cUrlCommand = fetchToCurl(url, options)

  // execute command with node child_process and return the result
  const { exec } = childProcess
  return new Promise<Response<T>>((resolve, reject) => {
    exec(cUrlCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(stderr)
        reject(error);
      }

      resolve(convertStdoutToResponse(stdout) as unknown as Response<T>);
    });
  });
}

export { Destination, fetch, RequestInterceptor, Response, ResponseType, THeadersInit, TRequestInit, TRetryConfig, TypedFormData };

