import { APIGatewayEvent } from "aws-lambda";
import { extractAtlassianHeaders } from "../utils/request";
import { sendProjectAnalysisBeginQueueMessage } from "../utils/sqs";
import { DateTime } from "luxon";
import {
  extractFromJiraAuth,
  fetchAllProjectDefinitionsByOwner,
  jsonLog,
} from "@akfreas/tangential-core";

export async function handler(
  event: APIGatewayEvent
): Promise<{ statusCode: number; body: string }> {
  const { headers } = event;

  const auth = extractAtlassianHeaders(headers);
  try {
    const { atlassianUserId } = extractFromJiraAuth(auth);
    const projectDefinitions = await fetchAllProjectDefinitionsByOwner(
      atlassianUserId
    );

    jsonLog("Project Definitions", projectDefinitions);
    if (!projectDefinitions) {
      throw new Error("Could not get project definitions");
    }
    const date = DateTime.now().minus({ days: 10 }).toISODate();
    if (!date) {
      throw new Error("Could not get date");
    }
    await Promise.all(
      projectDefinitions.map((projectKey) => {
        return sendProjectAnalysisBeginQueueMessage(
          projectKey,
          date,
          auth,
          30,
          7
        );
      })
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
