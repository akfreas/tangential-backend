export class TangentialHTTPRequestError extends Error {
  requestError: any; // Consider using a more specific type if possible
  url: string;
  params: Record<string, any>; // Use an appropriate type for the parameters
  headers: Record<string, string>; // Assuming headers are a dictionary with string values

  constructor(
    message: string,
    requestError: any, // Replace 'any' with a more specific type if possible
    url: string,
    params: Record<string, any>, // Use an appropriate type for the parameters
    headers: Record<string, string> // Assuming headers are a dictionary with string values
  ) {
    super(message);
    this.requestError = requestError;
    this.url = url;
    this.params = params;
    this.headers = headers;
  }
}
