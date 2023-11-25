import { SQSRecord } from "aws-lambda";
import { DateTime } from "luxon";
import { jsonLog, storeEpicReport } from "@akfreas/tangential-core";
import { sendUpdateProjectAnalysisStatusQueueMessage } from "../sqs";
import { analyzeEpic } from "../epicAnalysis";
import { writeFile } from "fs/promises";

export async function handleEpicAnalysisMessage(record: SQSRecord) {
  const parsed = JSON.parse(record.body);
  const {
    key,
    buildId,
    velocityWindowDays,
    windowStartDate,
    longRunningDays,
    windowEndDate,
    auth,
  } = parsed;
  jsonLog("Handling Epic Analysis Message", parsed);

  const result = await analyzeEpic(
    key,
    windowStartDate,
    windowEndDate,
    auth,
    buildId,
    velocityWindowDays,
    longRunningDays,
  );
  await storeEpicReport(result);

  // Write the epic report to disk
  if (process.env.IS_OFFLINE) {
    await writeFile(`Epic-${key}.json`, JSON.stringify(result, null, 2));
  }

  await sendUpdateProjectAnalysisStatusQueueMessage(key, buildId, auth);
}
