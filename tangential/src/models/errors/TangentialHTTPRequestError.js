export class TangentialHTTPRequestError extends Error {
  // eslint-disable-next-line no-restricted-syntax
  constructor(message, requestError, url, params, headers) {
    super(message);
    this.requestError = requestError;
    this.url = url;
    this.params = params;
    this.headers = headers;
  }
}
