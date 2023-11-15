import { SendMessageCommand, SendMessageCommandInput } from "@aws-sdk/client-sqs";
import { sqs } from "../config/config";
import { JiraRequestAuth, doError } from "@akfreas/tangential-core";

export const MessageType = {
  PROJECT_ANALYSIS_BEGIN: 'PROJECT_ANALYSIS_BEGIN',
  EPIC_ANALYSIS: 'EPIC_ANALYSIS',
  PROJECT_ANALYSIS_FINALIZE: 'PROJECT_ANALYSIS_FINALIZE'
}

async function sendMessage(payload: SendMessageCommandInput) {
  try {
    await sqs.send(new SendMessageCommand(payload))
  } catch (err) {
    if (err instanceof Error) {
      doError('Error sending SQS message', err, payload);
    } else {
      throw err;
    }
  }
  return Promise.resolve();
}


export async function sendProjectAnalysisBeginQueueMessage(
  projectKey: string,
  windowStartDate: string,
  auth: JiraRequestAuth,
  velocityWindowDays: number,
  longRunningDays: number
): Promise<void> {
  const payload = {
    QueueUrl: process.env.jiraAnalysisQueueUrl as string,
    MessageBody: JSON.stringify({
      messageType: MessageType.PROJECT_ANALYSIS_BEGIN,
      projectKey,
      windowStartDate,
      auth,
      velocityWindowDays,
      longRunningDays
    })
  };
  await sendMessage(payload);
}

export async function sendProjectAnalysisFinalizeQueueMessage(jobId: string, auth: JiraRequestAuth): Promise<void> {
  const payload = {
    QueueUrl: process.env.jiraAnalysisQueueUrl as string,
    MessageBody: JSON.stringify({
      messageType: MessageType.PROJECT_ANALYSIS_FINALIZE,
      jobId,
      auth
    })
  };
  await sendMessage(payload);

}

export async function sendEpicAnalysisQueueMessage(
  jobId: string,
  projectKey: string,
  epicKey: string,
  auth: JiraRequestAuth,
  velocityWindowDays: number,
  longRunningDays: number
): Promise<void> {
  const payload = {
    QueueUrl: process.env.jiraAnalysisQueueUrl as string,
    MessageBody: JSON.stringify({
      jobId,
      messageType: MessageType.EPIC_ANALYSIS,
      projectKey,
      epicKey,
      auth,
      velocityWindowDays,
      longRunningDays
    })
  };
  await sendMessage(payload);
}

export async function sendUpdateProjectAnalysisStatusQueueMessage(
  epicKey: string,
  jobId: string,
  auth: JiraRequestAuth
): Promise<void> {
  if (!jobId) {
    throw new Error('sendUpdateProjectAnalysisStatusQueueMessage: No job ID provided');
  }
  const payload = {
    QueueUrl: process.env.updateProjectAnalysisStatusQueueUrl as string,
    MessageBody: JSON.stringify({
      epicKey,
      jobId,
      auth
    }),
    MessageGroupId: jobId
  };
  await sendMessage(payload);
}
