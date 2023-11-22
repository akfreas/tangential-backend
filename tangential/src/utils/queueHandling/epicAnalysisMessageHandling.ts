import { SQSRecord } from "aws-lambda";
import { DateTime } from "luxon";
import { jsonLog, storeEpicReport } from "@akfreas/tangential-core";
import { sendUpdateProjectAnalysisStatusQueueMessage } from "../sqs";
import { analyzeEpic } from "../epicAnalysis";
import { writeFile } from "fs/promises";



export async function handleEpicAnalysisMessage(record: SQSRecord) {

  const { key, buildId,
    velocityWindowDays, windowStartDate,
    longRunningDays, auth } = JSON.parse(record.body);
    jsonLog("Handling Epic Analysis Message", {key, buildId,
      velocityWindowDays, windowStartDate,
      longRunningDays})

  const result = await analyzeEpic(
    key,
    DateTime.fromISO(windowStartDate),
    auth,
    buildId,
    velocityWindowDays,
    longRunningDays,
  );
  await storeEpicReport(result);

  await sendUpdateProjectAnalysisStatusQueueMessage(key, buildId, auth);
}