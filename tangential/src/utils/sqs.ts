import {
  SendMessageCommand,
  SendMessageCommandInput,
} from "@aws-sdk/client-sqs";
import { sqs } from "../config/config";
import {
  JiraRequestAuth,
  ProjectDefinition,
  doError,
} from "@akfreas/tangential-core";

export const MessageType = {
  PROJECT_ANALYSIS_BEGIN: "PROJECT_ANALYSIS_BEGIN",
  EPIC_ANALYSIS: "EPIC_ANALYSIS",
  PROJECT_ANALYSIS_FINALIZE: "PROJECT_ANALYSIS_FINALIZE",
};

async function sendMessage(payload: SendMessageCommandInput) {
  try {
    await sqs.send(new SendMessageCommand(payload));
  } catch (err) {
    if (err instanceof Error) {
      doError("Error sending SQS message", err, payload);
    } else {
      throw err;
    }
  }
  return Promise.resolve();
}

export async function sendProjectAnalysisBeginQueueMessage(
  projectDefinition: ProjectDefinition,
  windowStartDate: string,
  auth: JiraRequestAuth,
  velocityWindowDays: number,
  longRunningDays: number
): Promise<void> {
  const payload = {
    QueueUrl: process.env.jiraAnalysisQueueUrl as string,
    MessageBody: JSON.stringify({
      messageType: MessageType.PROJECT_ANALYSIS_BEGIN,
      projectDefinition,
      windowStartDate,
      auth,
      velocityWindowDays,
      longRunningDays,
    }),
  };
  await sendMessage(payload);
}

export async function sendProjectAnalysisFinalizeQueueMessage(
  parentProjectId: string,
  auth: JiraRequestAuth
): Promise<void> {
  const payload = {
    QueueUrl: process.env.jiraAnalysisQueueUrl as string,
    MessageBody: JSON.stringify({
      messageType: MessageType.PROJECT_ANALYSIS_FINALIZE,
      parentProjectId,
      auth,
    }),
  };
  await sendMessage(payload);
}

export async function sendEpicAnalysisQueueMessage(
  buildId: string,
  parentProjectId: string,
  key: string,
  auth: JiraRequestAuth,
  windowStartDate: string,
  windowEndDate: string,
  velocityWindowDays: number,
  longRunningDays: number
): Promise<void> {
  const payload = {
    QueueUrl: process.env.jiraAnalysisQueueUrl as string,
    MessageBody: JSON.stringify({
      buildId,
      messageType: MessageType.EPIC_ANALYSIS,
      key,
      auth,
      parentProjectId,
      windowStartDate,
      windowEndDate,
      velocityWindowDays,
      longRunningDays,
    }),
  };
  await sendMessage(payload);
}

export async function sendUpdateProjectAnalysisStatusQueueMessage(
  epicKey: string,
  parentProjectId: string,
  auth: JiraRequestAuth
): Promise<void> {
  if (!parentProjectId) {
    throw new Error(
      "sendUpdateProjectAnalysisStatusQueueMessage: No parentProjectId provided"
    );
  }
  const payload = {
    QueueUrl: process.env.updateProjectAnalysisStatusQueueUrl as string,
    MessageBody: JSON.stringify({
      epicKey,
      parentProjectId,
      auth,
    }),
    MessageGroupId: parentProjectId,
  };
  await sendMessage(payload);
}

export async function sendTextReportGenerationQueueMessage(
  buildId: string,
  templateId: string,
  auth: JiraRequestAuth
): Promise<void> {
  const payload = {
    QueueUrl: process.env.textReportGenerationQueueUrl as string,
    MessageBody: JSON.stringify({
      buildId,
      auth,
      templateId,
    }),
  };
  await sendMessage(payload);
}
