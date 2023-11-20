import { doLog, extractFromJiraAuth, fetchReportByBuildId, updateReport } from "@akfreas/tangential-core";
import { SQSRecord } from "aws-lambda";
import {  createProjectAnalysis } from "../jira";

export async function handleProjectAnalysisFinalizeMessage(record: SQSRecord) {
    const { buildId, auth } = JSON.parse(record.body);

    const { atlassianUserId } = extractFromJiraAuth(auth);

    const fullReport = await fetchReportByBuildId(atlassianUserId, buildId);

    if (!fullReport) {
        throw new Error(`No report found for build ID ${buildId}`);
    }
    
    const { epics, ...report} = fullReport;

    report.buildStatus.status = 'success';
    if (epics) {
        report.analysis = createProjectAnalysis(epics, report);
    }
    await updateReport(report);

    doLog(`Project analysis complete for job ${buildId}`)
}