export class HttpRequestError extends Error {
  constructor(public statusCode: number, message: string) {
    super(`Http Error ${statusCode}: ${message}`);
    this.name = '[HttpRequestError]';
  }
}

export class InvalidArgumentError extends TypeError {
  constructor(public argumentName: string, message: string) {
    super(`Argument ${argumentName}: ${message}`);
    this.name = '[InvalidArgumentError]';
  }
}

export function headers(headers: HeadersInit = {}) {
  if (typeof headers !== 'object') {
    throw new InvalidArgumentError('headers', 'headers must be an object');
  }

  const h = new Headers(headers);

  function set(key: string, value: string) {
    h.append(key, value);
    return this;
  }

  function remove(key: string) {
    h.delete(key);
    return this;
  }

  function get(key: string) {
    return h.get(key);
  }

  function toHeaders() {
    return h;
  }

  return { set, remove, get, toHeaders };
}

export function convertStdoutToResponse(stdout: string) {
  const [headers, body] = splitStringUsingRegex(stdout, '\r\n\r\n');
  const [statusLine, ...headerLines] = splitStringUsingRegex(headers, '\r\n');
  //                      ^?
  const [_, statusCode, statusText] = splitStringUsingRegex(statusLine, ' ');
  
  
  // c6nvert headerLinnes from string[] to [string, string][]
  const responseHeaders = transformHeaders(headerLines);
  
  const response = new Response(body, {
    status: parseInt(statusCode) > 101 ? parseInt(statusCode) : 200,
    statusText,
    headers: new Headers(responseHeaders),
  });

  return response;
}

function transformHeaders(headers: string[]) {
  let transformedHeaders: [string, string][] = [];

  for (const header of headers) {
    const [key, value] = header.split(': ');
    transformedHeaders.push([key, value]);
  }

  return transformedHeaders;
}

function splitStringUsingRegex(str: string, exp: string) {
  const regex = new RegExp(exp);
  return str.split(regex);
}

export function fetchToCurl(url: URL |  string, requestInit: RequestInit) {
  let curlCommand = `curl -i -X ${requestInit.method || 'GET'}`;

  // Add headers
  if (requestInit.headers) {
      for (const [key, value] of Object.entries(requestInit.headers)) {
          curlCommand += ` -H "${key}: ${value}"`;
      }
  }

  // Add body
  if (requestInit.body) {
      if (typeof requestInit.body === 'object' && !ArrayBuffer.isView(requestInit.body)) {
          const body = JSON.stringify(requestInit.body);
          curlCommand += ` -d '${body}'`;
      } else {
          curlCommand += ` -d '${requestInit.body}'`;
      }
  }

  // Add mode (Note: cURL does not support all Fetch API modes directly)
  if (requestInit.mode) {
      if (requestInit.mode === 'no-cors') {
          console.warn('cURL does not support no-cors mode.');
      }
  }

  // Add credentials
  if (requestInit.credentials) {
      if (requestInit.credentials === 'include') {
          curlCommand += ' --include';
      } else if (requestInit.credentials === 'same-origin') {
          console.warn('cURL does not support same-origin credentials.');
      }
  }

  // Add cache (Note: cURL does not support all Fetch API cache modes directly)
  if (requestInit.cache) {
      if (requestInit.cache === 'no-cache') {
          curlCommand += ' -H "Cache-Control: no-cache"';
      } else if (requestInit.cache === 'reload') {
          curlCommand += ' --no-cache';
      }
  }

  // Add redirect
  if (requestInit.redirect) {
      if (requestInit.redirect === 'follow') {
          curlCommand += ' -L';
      } else if (requestInit.redirect === 'manual') {
          curlCommand += ' -w "%{redirect_url}" -o /dev/null';
      } else if (requestInit.redirect === 'error') {
          curlCommand += ' --fail';
      }
  }

  // Add referrer
  if (requestInit.referrer) {
      curlCommand += ` -e "${requestInit.referrer}"`;
  }

  // Add referrerPolicy
  if (requestInit.referrerPolicy) {
      // This is for informational purposes; cURL does not have a direct equivalent for referrerPolicy
      console.warn('cURL does not support referrerPolicy directly.');
  }

  // Add integrity (Note: cURL does not support integrity directly)
  if (requestInit.integrity) {
      console.warn('cURL does not support integrity directly.');
  }

  // Add keepalive (Note: cURL does not support keepalive directly)
  if (requestInit.keepalive) {
      console.warn('cURL does not support keepalive directly.');
  }

  // Add URL
  curlCommand += ` "${(url instanceof URL) ? url.toString() : (new URL(url)).toString() /* This is done to prevent malicious through url*/}"`;

  return curlCommand;
}
