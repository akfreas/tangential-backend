import { SendMessageCommand, SendMessageCommandInput } from "@aws-sdk/client-sqs";
import { sqs } from "../config/config";
import { doError, jsonLog } from "./logging";
import { JiraRequestAuth } from "@akfreas/tangential-core";

const maxDeadLetterMessages = 10;

async function sendMessage(payload: SendMessageCommandInput) {
  try {
    await sqs.send(new SendMessageCommand(payload))
  } catch (err) {
    doError('Error sending SQS message', err, payload);
    throw err;
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