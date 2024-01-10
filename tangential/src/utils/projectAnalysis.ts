import {
  JiraRequestAuth,
  ProjectDefinition,
  ProjectReport,
  extractFromJiraAuth,
} from "@akfreas/tangential-core";
import {
  calculateVelocity,
  fetchAndSumStoryPoints,
  fetchProjectById,
  getByJql,
  getFields,
  sumTotalStoryPointsForProject,
} from "./jira";
import { DateTime } from "luxon";
import { sendEpicAnalysisQueueMessage } from "./sqs";
import { randomUUID } from "crypto";

export async function analyzeProject(
  projectDefinition: ProjectDefinition,
  windowStartDate: Date,
  auth: JiraRequestAuth,
  velocityWindowDays: number = 30,
  longRunningDays: number = 10
): Promise<ProjectReport> {
  const { atlassianUserId, atlassianWorkspaceId } = extractFromJiraAuth(auth);
  const reportGenerationDate = DateTime.local();
  const reportGenerationDateString = reportGenerationDate.toISO({
    includeOffset: false,
  });
  const id = randomUUID().toString();
  if (!projectDefinition.id) {
    throw new Error("Project definition must have an ID");
  }
  const buildId = `${projectDefinition.id}-${reportGenerationDateString}`;

  let lead: any = null;
  let avatarUrls: any = null;

  if (projectDefinition.associatedProjectKey) {
    ({ avatarUrls, lead } = await fetchProjectById(
      projectDefinition.associatedProjectKey,
      auth
    ));
  }

  const { issues: notCompletedResults } = await getByJql(
    `${projectDefinition.jqlQuery} AND issuetype = Epic AND statusCategory != "Done"`,
    auth
  );
  const { issues: recentlyCompletedResults } = await getByJql(
    `${projectDefinition.jqlQuery} AND issuetype = "Epic" AND statusCategory = "Done" AND status changed DURING (-10d, now())`,
    auth
  );

  const epicKeys: string[] = [
    ...notCompletedResults,
    ...recentlyCompletedResults,
  ].map((epic: any) => epic.key);
  const windowEndDate = DateTime.local();
  const windowStartDateString = DateTime.fromJSDate(windowStartDate).toISO();

  if (windowEndDate === null || windowStartDateString === null) {
    throw new Error("Failed to format window dates");
  }

  await Promise.all(
    epicKeys.map((key: any) => {
      return sendEpicAnalysisQueueMessage(
        buildId,
        id,
        key,
        auth,
        windowStartDateString,
        windowEndDate.toISO()!,
        velocityWindowDays,
        longRunningDays
      );
    })
  );
  const fields = await getFields(auth, "point");

  const totalPoints = await sumTotalStoryPointsForProject(
    projectDefinition,
    fields,
    auth
  );

  const projectVelocity = await calculateVelocity(
    projectDefinition.jqlQuery,
    velocityWindowDays,
    fields,
    auth
  );
  const projectRemainingPoints = await fetchAndSumStoryPoints(
    `${projectDefinition.jqlQuery} AND statusCategory != "Done"`,
    fields,
    auth
  );
  const inProgressPoints = await fetchAndSumStoryPoints(
    `${projectDefinition.jqlQuery} AND statusCategory = "In Progress"`,
    fields,
    auth
  );
  const completedPoints = await fetchAndSumStoryPoints(
    `${projectDefinition.jqlQuery} AND statusCategory = "Done"`,
    fields,
    auth
  );

  if (reportGenerationDate === null) {
    throw new Error("Failed to format report generation date");
  }

  const report: ProjectReport = {
    id,
    buildId,
    reportType: "project",
    buildStatus: {
      status: "pending",
      buildId,
      startedAt: reportGenerationDate.toJSDate(),
      remainingItems: epicKeys,
    },
    longRunningDays,
    ownerId: atlassianUserId,
    atlassianWorkspaceId,
    reportGenerationDate: reportGenerationDate.toJSDate(),
    title: projectDefinition.name,
    projectDefinitionId: projectDefinition.id,
    lead,
    avatar: avatarUrls?.["48x48"] ?? null,
    windowEndDate: windowEndDate.toJSDate(),
    totalPoints,
    windowStartDate,
    velocity: projectVelocity,
    remainingPoints: projectRemainingPoints,
    inProgressPoints,
    completedPoints,
    statusName: "Active",
  };

  return report;
}
