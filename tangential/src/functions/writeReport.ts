import { SQSHandler } from "aws-lambda";
import {  ProjectReport, doLog, extractFromJiraAuth, fetchLatestProjectReportsWithEpics, fetchReportByBuildId, fetchReportByProjectKey, fetchTemplate, jsonLog } from "@akfreas/tangential-core";
import { ReportTemplate } from "@akfreas/tangential-core/dist/types/template";



async function writeReport(projectReport: ProjectReport) {
  // Extract basic project details
  const projectName = projectReport.name;
  const reportDate = projectReport.reportGenerationDate;
  
  // Determine the overall project status
  let projectStatus = 'Unknown';
  if (projectReport.analysis && projectReport.analysis.state) {
      projectStatus = projectReport.analysis.state.name;
  }

  // Prepare the epic details
  let epicDetails = '';
  if (projectReport.epics) {
      projectReport.epics.forEach(epic => {
          const epicName = epic.summary;
          const teamName = epic.assignee.displayName;
          const epicStatus = epic.analysis && epic.analysis.state ? epic.analysis.state.name : 'Unknown';
          const details = epic.analysis && epic.analysis.summaryText ? epic.analysis.summaryText : 'No additional details.';
          
          epicDetails += `Epic Name: ${epicName}\n   Team: ${teamName}\n   Status: ${epicStatus}\n   Details: ${details}\n\n`;
      });
  }

  // Construct the prompt
  const prompt = `Generate a project status update report based on the following data:\n\n` +
                  `Project Name: ${projectName}\n` +
                  `Report Date: ${reportDate}\n\n` +
                  `Project Status: ${projectStatus}\n` +
                  `Epic Statuses:\n${epicDetails}\n` +
                  `The report should provide an overview of the project's overall status, detail the status and progress of each epic, highlight any delays or issues, and mention any discussions or plans for mitigation. Format the report similarly to the provided example.`;


  doLog(`Writing report for project ${projectName}...`);
  doLog(prompt);
  return prompt;
  
}


export const handler: SQSHandler = async (event) => {

  try {
    for (const record of event.Records) {
      const { 
        auth, buildId } = JSON.parse(record.body);
        const { atlassianUserId } = extractFromJiraAuth(auth);

        const report: ProjectReport | null = await fetchReportByBuildId(atlassianUserId, buildId);
        if (!report) {
          throw new Error('Template or report not found');
        }
        await writeReport(report);
      }

  } catch (err) {
    console.error(err);
    throw new Error('Message processing failed');
  }

};