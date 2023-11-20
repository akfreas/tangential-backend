import { SQSRecord } from "aws-lambda";
import { DateTime } from "luxon";
import { jsonLog, storeEpicReport } from "@akfreas/tangential-core";
import { analyzeEpic } from "../jira";
import { sendUpdateProjectAnalysisStatusQueueMessage } from "../sqs";


export async function handleEpicAnalysisMessage(record: SQSRecord) {

  jsonLog("Handling Epic Analysis Message", record)
  const { epicKey, buildId,
    velocityWindowDays, windowStartDate,
     longRunningDays, auth } = JSON.parse(record.body);


  const result = await analyzeEpic(
    epicKey,
    DateTime.fromISO(windowStartDate),
    auth,
    buildId,
    velocityWindowDays,
    longRunningDays,
  );
  await storeEpicReport(result);

  await sendUpdateProjectAnalysisStatusQueueMessage(epicKey, buildId, auth);
}