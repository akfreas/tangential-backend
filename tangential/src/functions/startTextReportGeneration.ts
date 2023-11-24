import { APIGatewayEvent } from "aws-lambda";
import { extractAtlassianHeaders } from "../utils/request";
import { sendTextReportGenerationQueueMessage } from "../utils/sqs";

export async function handler(
  event: APIGatewayEvent
): Promise<{ statusCode: number; body: string }> {

  const { headers, body } = event;

  const auth = extractAtlassianHeaders(headers); // Assuming this function is defined elsewhere
  try {
    if (!body) {
      throw new Error('No body provided');
    }
    // Parse the body to get buildId and templateId
    const { buildId, templateId } = JSON.parse(body);

    if (!buildId || !templateId) {
      throw new Error('Missing buildId or templateId');
    }

    // Send message to the queue
    await sendTextReportGenerationQueueMessage(buildId, templateId, auth);

    return {
      statusCode: 200,
      body: 'Success'
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: 'Error'
    };
  }
}
