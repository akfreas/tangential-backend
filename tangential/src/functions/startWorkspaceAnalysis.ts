import { APIGatewayEvent } from "aws-lambda";
import { extractAtlassianHeaders } from "../utils/request";
import { fetchProjects } from "../utils/jira";
import { sendEpicAnalysisQueueMessage, sendProjectAnalysisBeginQueueMessage } from "../utils/sqs";
import { DateTime } from 'luxon';
import { jsonLog } from "@akfreas/tangential-core";

export async function handler(
  event: APIGatewayEvent
): Promise<{ statusCode: number; body: string }> {

  const { headers } = event;

  const auth = extractAtlassianHeaders(headers);
  try {
    const projects = await fetchProjects(auth);
    const date = DateTime.now().minus({ days: 10 }).toISODate();
    if (!date) {
      throw new Error('Could not get date');
    }
    await Promise.all(projects.map(p => p.key).map((projectKey) => {
      return sendProjectAnalysisBeginQueueMessage(
        projectKey,
        date,
        auth,
        30,
        7
      )
    }));

    // jsonLog('Analyzing Projects', projects);
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