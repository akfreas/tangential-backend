export class TruffleSlackRequestError extends Error {
  /* eslint-disable-next-line */
  constructor(message, resource, slackError, retryAfter) {
    super(message);
    this.resource = resource;
    this.slackError = slackError;
    this.retryAfter = retryAfter;
  }
}
