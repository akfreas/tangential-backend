import { SQSHandler } from 'aws-lambda';
import { analyzeProject } from '../utils/jira';
import { doLog, jsonLog } from '../utils/logging';
import { storeProjectReport } from '../utils/analysisStorage';
import { DateTime } from 'luxon';

export const handler: SQSHandler = async (event) => {
  try {
    for (const record of event.Records) {
      const { projectKey, windowStartDate, auth,
        velocityWindowDays, longRunningDays } = JSON.parse(record.body);
      const result = await analyzeProject(
        projectKey,
        DateTime.fromISO(windowStartDate),
        auth,
        velocityWindowDays,
        longRunningDays
      );
      await storeProjectReport(result);
    }
  } catch (err) {
    console.error(err);
    throw new Error('Message processing failed');
  }
};
