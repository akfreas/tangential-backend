import { SQSHandler } from "aws-lambda";
import {  extractFromJiraAuth, fetchReportByProjectKey, fetchTemplate, jsonLog } from "@akfreas/tangential-core";


// export async function writeReport(templateId: string, projectKey: string, auth: JiraRequestAuth) {
//   const { atlassianWorkspaceId, atlassianUserId } = extractFromJiraAuth(auth);
//   const template = await fetchTemplate(atlassianWorkspaceId, templateId);
//   const report = await fetchReportByProjectKey(atlassianUserId, atlassianWorkspaceId, projectKey);

//   do

// }
export const handler: SQSHandler = async (event) => {

  try {
    for (const record of event.Records) {
      const { 
        projectKey,
        auth,
        templateId } = JSON.parse(record.body);

        const { atlassianWorkspaceId, atlassianUserId } = extractFromJiraAuth(auth);
        
        const template = await fetchTemplate(atlassianWorkspaceId, templateId);
        const report = await fetchReportByProjectKey(atlassianUserId, atlassianWorkspaceId, projectKey);

        jsonLog("Params", {atlassianWorkspaceId, template, report})

      }


  } catch (err) {
    console.error(err);
    throw new Error('Message processing failed');
  }

};