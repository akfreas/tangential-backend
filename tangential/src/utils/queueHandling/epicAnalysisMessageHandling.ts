import { SQSRecord } from "aws-lambda";
import { DateTime } from "luxon";
import { storeEpicReport } from "@akfreas/tangential-core";
import { analyzeEpic } from "../jira";
import { sendUpdateProjectAnalysisStatusQueueMessage } from "../sqs";


export async function handleEpicAnalysisMessage(record: SQSRecord) {
  const { epicKey, jobId,
    velocityWindowDays, windowStartDate,
     longRunningDays, auth } = JSON.parse(record.body);


  const result = await analyzeEpic(
    epicKey,
    DateTime.fromISO(windowStartDate),
    auth,
    jobId,
    velocityWindowDays,
    longRunningDays,
  );
  await storeEpicReport(result);

  await sendUpdateProjectAnalysisStatusQueueMessage(epicKey, jobId);
}