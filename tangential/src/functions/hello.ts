import { APIGatewayEvent, Context, Handler } from 'aws-lambda';

export async function handler(event: APIGatewayEvent, context: Context): Promise<{ statusCode: number, body: string }> {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hello, World!',
    }),
  };

  return response;
}
