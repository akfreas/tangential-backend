import {
  doLog,
  extractFromJiraAuth,
  fetchReportById,
  jsonLog,
  updateReport,
} from "@akfreas/tangential-core";
import { SQSRecord } from "aws-lambda";
import { createProjectAnalysis } from "../jira";

export async function handleProjectAnalysisFinalizeMessage(record: SQSRecord) {
  const { parentProjectId, auth } = JSON.parse(record.body);

  const { atlassianUserId } = extractFromJiraAuth(auth);

  jsonLog("Handling project analysis finalize message", {
    parentProjectId,
    atlassianUserId,
  });

  const fullReport = await fetchReportById(parentProjectId);
  if (!fullReport) {
    throw new Error(`No report found for parent project ID ${parentProjectId}`);
  }
  const { buildId } = fullReport;
  if (!fullReport) {
    throw new Error(`No report found for build ID ${buildId}`);
  }

  const { epics, ...report } = fullReport;

  report.buildStatus.status = "success";
  if (epics) {
    report.analysis = createProjectAnalysis(epics, report);
  }

  jsonLog("Updating report", report);
  await updateReport(report);

  doLog(`Finalized project analysis for job ${buildId}`);
}
