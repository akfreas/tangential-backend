import { APIGatewayEvent, Context, Handler } from "aws-lambda";
import { jsonGet, jsonPost } from "../utils/request";

export async function handler(
  event: APIGatewayEvent,
  context: Context
): Promise<{ statusCode: number; body: string }> {
  const clientId = "lKCXKlNw2myH1xNmrapHhpq5KGkbq91j";
  const secret = "ATOA-AdVQkT9_X9SJG_Vx_nHyf3u3YjNWI2ho_Tynam2ar3VwEH7xg-ztbH8SY91oUT_511E0D4B";
  console.log("event", event);
  const { code } = event.queryStringParameters;

  /*
  curl --request POST \
  --url 'https://auth.atlassian.com/oauth/token' \
  --header 'Content-Type: application/json' \
  --data '{ "grant_type": "refresh_token", "client_id": "YOUR_CLIENT_ID", "client_secret": "YOUR_CLIENT_SECRET", "refresh_token": "YOUR_REFRESH_TOKEN" }'

  */
  const url = "https://auth.atlassian.com/oauth/token";
  const result = await jsonPost({
    url,
    data: {
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: secret,
      refresh_token: code,
    },
  });

  return {
    statusCode: 200,
    body: "ok",
  };
}
