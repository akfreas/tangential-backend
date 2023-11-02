import { APIGatewayEvent, Context, Handler } from 'aws-lambda';
import { jsonLog } from '../utils/logging';
import { analyzeEpic, analyzeProject, fetchIssueQueryChangelogs } from '../utils/jira';
import { DateTime } from 'luxon';
import { storeProjectReport } from '../utils/analysisStorage';
import { extractAtlassianHeaders } from '../utils/request';

export async function handler(
  event: APIGatewayEvent,
  context: Context
): Promise<{ statusCode: number; body: string }> {

  const { headers, body } = event;

  const auth = extractAtlassianHeaders(headers);

  const analysis = await analyzeProject('TAN', DateTime.now().minus({ days: 10 }), auth);

  await storeProjectReport(analysis);


  return {
    statusCode: 200,
    body: 'Success'
  };
}
