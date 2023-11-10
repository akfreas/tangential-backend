import { SendMessageCommand, SendMessageCommandInput } from "@aws-sdk/client-sqs";
import { sqs } from "../config/config";
import { JiraRequestAuth, doError } from "@akfreas/tangential-core";


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


export async function sendProjectAnalysisQueueMessage(
  projectKey: string,
  windowStartDate: string,
  auth: JiraRequestAuth,
  velocityWindowDays: number,
  longRunningDays: number
): Promise<void> {
  const payload = {
    QueueUrl: process.env.projectAnalysisQueueUrl as string,
    MessageBody: JSON.stringify({
      projectKey,
      windowStartDate,
      auth,
      velocityWindowDays,
      longRunningDays
    })
  };
  await sendMessage(payload);
}

export async function sendEpicAnalysisQueueMessage(
  projectKey: string,
  epicKey: string,
  auth: JiraRequestAuth,
  velocityWindowDays: number,
  longRunningDays: number
): Promise<void> {
  const payload = {
    QueueUrl: process.env.epicAnalysisQueueUrl as string,
    MessageBody: JSON.stringify({
      projectKey,
      epicKey,
      auth,
      velocityWindowDays,
      longRunningDays
    })
  };
  await sendMessage(payload);
}