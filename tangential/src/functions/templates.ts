import {
  extractFromJiraAuth,
  fetchAllReportTemplatesByOwnerAndPublic,
} from "@akfreas/tangential-core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { extractAtlassianHeaders } from "../utils/request";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const auth = extractAtlassianHeaders(event.headers);
    const { atlassianUserId } = await extractFromJiraAuth(auth);

    const templates = await fetchAllReportTemplatesByOwnerAndPublic(
      atlassianUserId
    );

    return {
      statusCode: 200,
      body: JSON.stringify(templates),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
