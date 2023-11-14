import { SQSHandler } from "aws-lambda";
import { JiraRequestAuth, extractFromJiraAuth, fetchAllProjectReports, fetchReportByProjectKey, fetchTemplate } from "@akfreas/tangential-core";


export async function writeReport(templateId: string, projectKey: string, auth: JiraRequestAuth) {
  const { atlassianId, atlassianUserId } = extractFromJiraAuth(auth);
  const template = await fetchTemplate(atlassianId, templateId);
  const report = await fetchReportByProjectKey(atlassianUserId, atlassianId, projectKey);



}
export const handler: SQSHandler = async (event) => {

  try {
    for (const record of event.Records) {
      const { 
        projectKey,
        auth,
        templateId } = JSON.parse(record.body);

        const { atlassianId, atlassianUserId } = extractFromJiraAuth(auth);
        
        const template = await fetchTemplate(atlassianId, templateId);
        const report = await fetchReportByProjectKey(atlassianUserId, atlassianId, projectKey);


      }


  } catch (err) {
    console.error(err);
    throw new Error('Message processing failed');
  }

};