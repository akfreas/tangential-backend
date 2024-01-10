import { APIGatewayEvent } from "aws-lambda";
import { extractAtlassianHeaders } from "../utils/request";
import { sendProjectAnalysisBeginQueueMessage } from "../utils/sqs";
import { DateTime } from "luxon";
import { fetchProjectDefinitionById } from "@akfreas/tangential-core";

export async function handler(
  event: APIGatewayEvent
): Promise<{ statusCode: number; body: string }> {
  const { headers } = event;

  const auth = extractAtlassianHeaders(headers);
  try {
    const date = DateTime.now().minus({ days: 10 }).toISODate();

    const { projectDefinitionId } = JSON.parse(event.body || "{}");
    if (!date) {
      throw new Error("Could not get date");
    }

    if (!projectDefinitionId) {
      return {
        statusCode: 400,
        body: "No project definition ID provided",
      };
    }

    const fetchedProjectDefinitions = await fetchProjectDefinitionById(
      projectDefinitionId
    );

    if (!fetchedProjectDefinitions) {
      return {
        statusCode: 404,
        body: "Project definition not found",
      };
    }

    await sendProjectAnalysisBeginQueueMessage(
      fetchedProjectDefinitions,
      date,
      auth,
      30,
      7
    );

    // jsonLog('Analyzing Projects', projects);
    return {
      statusCode: 200,
      body: "Success",
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: "Error",
    };
  }
}
