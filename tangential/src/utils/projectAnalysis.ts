import { JiraRequestAuth, ProjectReport, extractFromJiraAuth } from "@akfreas/tangential-core";
import { calculateVelocity, fetchAndSumStoryPoints, fetchProjectById, getByJql, getFields, sumTotalStoryPointsForProject } from "./jira";
import { DateTime } from "luxon";
import { sendEpicAnalysisQueueMessage } from "./sqs";

export async function analyzeProject(
  projectKey: string,
  windowStartDate: DateTime,
  auth: JiraRequestAuth,
  velocityWindowDays: number = 30,
  longRunningDays: number = 10
): Promise<ProjectReport> {
  const { atlassianUserId, atlassianWorkspaceId } = extractFromJiraAuth(auth);
  const reportGenerationDate = DateTime.local().toISO();
  const buildId = `${atlassianUserId}-${projectKey}-${reportGenerationDate}`;

  const { avatarUrls, displayName, name, lead } = await fetchProjectById(projectKey, auth);
  const { issues: notCompletedResults } = await getByJql(`project = ${projectKey} AND issuetype = Epic AND statusCategory != "Done"`, auth);
  const { issues: recentlyCompletedResults } = await getByJql(`project = ${projectKey} AND issuetype = "Epic" AND statusCategory = "Done" AND status changed DURING (-10d, now())`, auth)

  const epicKeys: string[] = [...notCompletedResults, ...recentlyCompletedResults].map((epic: any) => epic.key);

  await Promise.all(epicKeys.map((key: any) => {
    return sendEpicAnalysisQueueMessage(
      buildId, 
      key,
      auth, 
      velocityWindowDays, 
      longRunningDays)
  }));
  const fields = await getFields(auth, 'point')

  const totalPoints = await sumTotalStoryPointsForProject(projectKey, fields, auth)

  const projectVelocity = await calculateVelocity(`project = ${projectKey}`, velocityWindowDays, fields, auth);
  const windowEndDate = DateTime.local().toISO();
  const windowStartDateObject = windowStartDate.toISO()
  const projectRemainingPoints = await fetchAndSumStoryPoints(`project = ${projectKey} AND statusCategory != "Done"`, fields, auth);
  const inProgressPoints = await fetchAndSumStoryPoints(`project = ${projectKey} AND statusCategory = "In Progress"`, fields, auth);
  const completedPoints = await fetchAndSumStoryPoints(`project = ${projectKey} AND statusCategory = "Done"`, fields, auth);
  if (windowEndDate === null || windowStartDateObject === null) {
    throw new Error('Failed to format window dates');
  }
  
  if (reportGenerationDate === null) {
    throw new Error('Failed to format report generation date');
  }

  
  const report: ProjectReport = {
    buildId,
    reportType: 'project',
    buildStatus: {
      status: 'pending',
      buildId,
      startedAt: reportGenerationDate,
      remainingItems: epicKeys
    },
    ownerId: atlassianUserId,
    atlassianWorkspaceId,
    reportGenerationDate,
    name: displayName || name,
    projectKey,
    lead,
    avatar: avatarUrls['48x48'],
    windowEndDate,
    totalPoints,
    windowStartDate: windowStartDateObject,
    velocity: projectVelocity,
    remainingPoints: projectRemainingPoints,
    inProgressPoints,
    completedPoints,
    statusName: 'Active',
  };

  return report;
}