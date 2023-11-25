import { SQSHandler } from "aws-lambda";
import {
  ProjectReport,
  doLog,
  extractFromJiraAuth,
  fetchReportByBuildId,
  fetchReportTemplateById,
  jsonLog,
  storeTextReport,
} from "@akfreas/tangential-core";
import { createChatCompletion } from "../utils/openAiWrapper";
import { DateTime } from "luxon";

async function writeReport(
  projectReport: ProjectReport,
  templateId: string,
  owner: string
) {
  // Extract basic project details
  const projectName = projectReport.title;
  const reportDate = projectReport.reportGenerationDate;

  // Determine the overall project status

  // Prepare the epic details
  let epicDetails = "";
  if (projectReport.epics) {
    projectReport.epics.forEach((epic) => {
      const epicName = epic.title;
      const assignee = epic.assignee?.displayName || "Unassigned";
      const epicStatus =
        epic.analysis && epic.analysis.state
          ? epic.analysis.state.name
          : "Unknown";
      const details = epic.summary?.longSummary ?? "No additional details.";
      const potentialRisks =
        epic.summary?.potentialRisks ?? "No potential risks.";
      const color = epic.summary?.color ?? "Unknown";
      epicDetails += `Epic Name: ${epicName}\n   Assignee: ${assignee}\n   Status: ${epicStatus}\n   Status Summary: ${details} \n   Potential Risks: ${potentialRisks}\n   Color: ${color}\n\n`;
    });
  }
  const template = await fetchReportTemplateById(templateId);
  // Construct the prompt
  const system = `Generate a project status update report based on the following data:\n\n
The report should provide an overview of the project's overall status, detail the status and progress of each epic, highlight any delays or issues, and mention any discussions or plans for mitigation. 
Sort the epics by status, with the most urgent epics first.
${
  template ? `Write this report for the audience: ${template.audience}` : ""
}\n\n
Format the report similarly to the provided example below:

"Program Name: New Application Monitoring

🔴 Overall status of new application monitoring is  red. Milestone 1 on October 3rd is likely not going to be held due to predicted delays in the monitoring infra epic. We are currently discussing with Paul from Team Pretzel if we can mitigate this problem by removing one nice-to have feature from Team Pretzel’s backlog.

Details: 
🔴 Red: Monitoring infra by team Pretzel. This is the last epic required for Milestone 1 and is planned to start on September 24th. The schedule will likely slip, as team Pretzel is still blocked with work on the Infra cost reduction program due to added features and bugs into the epic there. 

The other contributing epics are on track:
🟢 Green: Mobile monitoring by team Maverick. Work has finished on September 12th. 
🟢 Green: Service layer by team Stardust. Work is 83% ready and based on the past velocity of the team, all user stories will be finished on September 27th. 
🟢 Green: AuthN by team Maverick. Work is 81% ready and based on the past velocity of the team, all user stories will be finished on October 1st."

`;

  const user = `
  Project Name: ${projectName}\n
  Report Date: ${reportDate}\n\n
  Epic Statuses:\n${epicDetails}\n`;
  doLog(`Writing report for project ${projectName}...`);
  const report = await createChatCompletion({
    jsonResponse: false,
    messages: [
      {
        role: "system",
        content: system,
      },
      {
        role: "user",
        content: user,
      },
    ],
  });
  doLog(`Report: ${report}`);

  await storeTextReport({
    basedOnBuildId: projectReport.buildId,
    text: report,
    generatedDate: DateTime.local().toJSDate(),
    owner,
    templateId,
    name: `${projectName} Status Update${
      template?.audience ? ` for ${template.audience}` : ""
    }`,
    projectName,
    description: "Project Status Update",
  });

  return report;
}

export const handler: SQSHandler = async (event) => {
  try {
    for (const record of event.Records) {
      const { auth, buildId, templateId } = JSON.parse(record.body);
      if (!auth) {
        throw new Error("No auth found");
      }

      if (!buildId) {
        throw new Error("No build ID found");
      }
      const { atlassianUserId } = extractFromJiraAuth(auth);
      jsonLog("Input", { auth, atlassianUserId, buildId });

      const report: ProjectReport | null = await fetchReportByBuildId(
        atlassianUserId,
        buildId
      );
      // jsonLog("Report", report)
      if (!report) {
        throw new Error("Report not found");
      }
      await writeReport(report, templateId, atlassianUserId);
    }
  } catch (err) {
    console.error(err);
    throw new Error("Message processing failed");
  }
};
