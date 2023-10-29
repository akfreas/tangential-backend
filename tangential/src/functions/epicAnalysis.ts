import { APIGatewayEvent, Context, Handler } from 'aws-lambda';
import { jsonLog } from '../utils/logging';
import { analyzeEpic, fetchIssueQueryChangelogs } from '../utils/jira';
import { JiraRequestAuth } from '../types/jiraTypes';
import { DateTime } from 'luxon';

function extractAtlassianHeaders(headers: any): JiraRequestAuth {
  const accessToken = headers['x-atlassian-token'];
  const atlassianId = headers['x-atlassian-id'];
  return { accessToken, atlassianId };
}

export async function handler(
  event: APIGatewayEvent,
  context: Context
): Promise<{ statusCode: number; body: string }> {

  const { headers, body } = event;

  const auth = extractAtlassianHeaders(headers);

  const changeLogs = await analyzeEpic('TAN-93', DateTime.now().minus({ days: 10 }), auth);
  jsonLog('Changelogs', changeLogs);
  // rest of the code

  return {
    statusCode: 200,
    body: 'Success'
  };
}
