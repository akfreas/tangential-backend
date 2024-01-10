import { SQSRecord } from "aws-lambda";
import { DateTime } from "luxon";
import { storeProjectReport } from "@akfreas/tangential-core";
import { analyzeProject } from "../projectAnalysis";

export async function handleProjectAnalysisMessage(record: SQSRecord) {
  const {
    projectDefinition,
    windowStartDate,
    velocityWindowDays,
    longRunningDays,
    auth,
  } = JSON.parse(record.body);

  const result = await analyzeProject(
    projectDefinition,
    DateTime.fromISO(windowStartDate).toJSDate(),
    auth,
    velocityWindowDays,
    longRunningDays
  );

  await storeProjectReport(result);
}
