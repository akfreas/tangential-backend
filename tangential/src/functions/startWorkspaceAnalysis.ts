import { APIGatewayEvent } from "aws-lambda";
import { Context } from "vm";
import { extractAtlassianHeaders } from "../utils/request";
import { fetchProjects } from "../utils/jira";
import { jsonLog } from "../utils/logging";
import { sendProjectAnalysisQueueMessage } from "../utils/sqs";
import { DateTime } from 'luxon';
import MongoDBWrapper from "../utils/databaseWrapper";
import { ProjectReport } from "../types/jiraTypes";

export async function handler(
  event: APIGatewayEvent,
  context: Context
): Promise<{ statusCode: number; body: string }> {

  const { headers, body } = event;

  const auth = extractAtlassianHeaders(headers);

  const dbWrapper = await MongoDBWrapper.getInstance();

  const reportsCollection = dbWrapper.getCollection<ProjectReport>('reports');

  const result = await reportsCollection.updateOne(
    { projectKey: '234' }, // filter
    { $set: { test: '123455' } }, // update
    { upsert: true } // options: create a new document if no documents match the filter
  );

  jsonLog('Result', result);
  const projects = await fetchProjects(auth);

  await Promise.all(projects.map(p => p.key).map((projectKey) => {
    return sendProjectAnalysisQueueMessage(
      projectKey,
      DateTime.now().minus({ days: 10 }).toISODate(),
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
}