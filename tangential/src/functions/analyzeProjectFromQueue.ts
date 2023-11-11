import { SQSHandler } from 'aws-lambda';
import { analyzeProject } from '../utils/jira';
import { DateTime } from 'luxon';
import { JiraRequestAuth, doLog, storeProjectReport } from '@akfreas/tangential-core';
import {decode, } from 'jsonwebtoken';
export const handler: SQSHandler = async (event) => {
  try {
    for (const record of event.Records) {
      const { projectKey, windowStartDate, auth,
        velocityWindowDays, longRunningDays } = JSON.parse(record.body);
      const jiraAuth: JiraRequestAuth = auth;

      const secretKey = process.env.ATLASSIAN_CLIENT_SECRET;

      if (!secretKey) {
        throw new Error('No secret key found');
      }

      const {sub: ownerId = undefined} = decode(jiraAuth.accessToken) ?? {};

      if (!ownerId || typeof ownerId !== 'string') {
        throw new Error('No owner ID found or invalid type');
      }
      doLog('ownerId', ownerId)
      const result = await analyzeProject(
        projectKey,
        DateTime.fromISO(windowStartDate),
        auth,
        velocityWindowDays,
        longRunningDays
      );
      await storeProjectReport(ownerId, result);
    }
  } catch (err) {
    console.error(err);
    throw new Error('Message processing failed');
  }
};
