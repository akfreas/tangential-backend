import { SQSHandler } from 'aws-lambda';
import { JiraRequestAuth, doLog } from '@akfreas/tangential-core';
import {decode, } from 'jsonwebtoken';
import { handleProjectAnalysisMessage } from '../utils/queueHandling/projectAnalysisMessageHandling';
import { handleEpicAnalysisMessage } from '../utils/queueHandling/epicAnalysisMessageHandling';
import { MessageType } from '../utils/sqs';
export const handler: SQSHandler = async (event) => {
  try {
    for (const record of event.Records) {
      const { auth, messageType } = JSON.parse(record.body);

      if (!messageType) {
        throw new Error('No message type found');
      }

      const { accessToken}: JiraRequestAuth = auth;

      const secretKey = process.env.ATLASSIAN_CLIENT_SECRET;

      if (!secretKey) {
        throw new Error('No secret key found');
      }

      const {sub: ownerId = undefined} = decode(accessToken) ?? {};

      if (!ownerId || typeof ownerId !== 'string') {
        throw new Error('No owner ID found or invalid type');
      }

      switch (messageType) {
        case MessageType.PROJECT_ANALYSIS_BEGIN: {
          await handleProjectAnalysisMessage(record);
          break;
        }
        case MessageType.EPIC_ANALYSIS: {
          await handleEpicAnalysisMessage(record);
          break;
        }
        case MessageType.PROJECT_ANALYSIS_FINALIZE: {
          doLog("Handling project analysis finalize message");
          break;
        }
      }
    }
  } catch (err) {
    console.error(err);
    throw new Error('Message processing failed');
  }
};
