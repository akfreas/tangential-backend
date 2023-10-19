import { APIGatewayEvent, Context, Handler } from "aws-lambda";
import { jsonGet, jsonPost } from "../utils/request";

export async function handler(
  event: APIGatewayEvent,
  context: Context
): Promise<{ statusCode: number; body: string }> {
  const clientId = process.env.ATLASSIAN_CLIENT_ID;
  const secret = process.env.ATLASSIAN_CLIENT_SECRET;
  const { code } = event.queryStringParameters;

  const url = "https://auth.atlassian.com/oauth/token";
  const { access_token,
    refresh_token,
    scope,
    token_type,
    expires_in,
    error,
    error_description,
  } = await jsonPost({
    url,
    data: {
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: secret,
      code,
      redirect_uri: "https://tangential.ngrok.io/offline/oauth",
    },
  });

  const resourceUrl = "https://api.atlassian.com/oauth/token/accessible-resources";

  const [{
    id,

  }] = await jsonGet({

    url: resourceUrl,
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
  try {
    const response = await jsonGet({
      url: `https://api.atlassian.com/ex/jira/${id}/rest/api/3/project`,
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })


    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.log(error)
    return {
      statusCode: 500,
      body: JSON.stringify(error),
    };
  }
}
