import { SQSRecord } from "aws-lambda";
import { analyzeProject } from "../jira";
import { DateTime } from "luxon";
import { extractFromJiraAuth, storeProjectReport } from "@akfreas/tangential-core";

export async function handleProjectAnalysisMessage(record: SQSRecord) {
  const { projectKey, windowStartDate,
    velocityWindowDays, longRunningDays, auth } = JSON.parse(record.body);

   const {atlassianWorkspaceId, atlassianUserId } = extractFromJiraAuth(auth);

  const result = await analyzeProject(
    projectKey,
    DateTime.fromISO(windowStartDate),
    auth,
    velocityWindowDays,
    longRunningDays
  );
  await storeProjectReport(atlassianUserId, atlassianWorkspaceId, result);

}
