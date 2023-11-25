import {
  JiraRequestAuth,
  EpicReport,
  extractFromJiraAuth,
  PointsField,
  IssueReport,
  LongRunningIssue,
  ScopeDelta,
} from "@akfreas/tangential-core";
import { DateTime } from "luxon";
import {
  getFields,
  calculateVelocity,
  sumRemainingStoryPointsForEpic,
  sumTotalStoryPointsForEpic,
  sumStoryPoints,
  getByJql,
  getCommentsTimeline,
  createEpicMetricAnalysis,
  fetchIssueChangelogTimeline,
  getIssue,
  fetchAndSumStoryPoints,
} from "./jira";
import { summarizeEpicReport } from "./summarization/summarizationUtils";
import { randomUUID } from "crypto";

async function analyzeChildIssues(
  jql: string,
  epicId: string,
  longRunningDays: number,
  auth: JiraRequestAuth,
  windowStartDate: Date,
  pointsFields: PointsField[]
): Promise<{
  longRunningIssues: LongRunningIssue[];
  childIssues: IssueReport[];
  scopeDeltas: ScopeDelta[];
}> {
  const longRunningIssues: LongRunningIssue[] = [];
  const childIssues: IssueReport[] = [];
  const scopeDeltas: ScopeDelta[] = [];
  const { issues: epicChildIssues } = await getByJql(jql, auth);

  for (const child of epicChildIssues) {
    const issueChangelogTimeline = await fetchIssueChangelogTimeline(
      child.id,
      auth,
      windowStartDate
    );

    if (issueChangelogTimeline) {
      const currentStatus = child.fields?.status;

      if (currentStatus?.statusCategory?.name === "In Progress") {
        for (const log of issueChangelogTimeline.all) {
          if (
            log.items.some(
              (item) =>
                item.field === "IssueParentAssociation" && item.to === epicId
            )
          ) {
            scopeDeltas.push({
              issueKey: child.key,
              storyPoints: sumStoryPoints([child], pointsFields),
              changingUser: log.author,
            });
          }

          if (log.items.some((item) => item.to === currentStatus.id)) {
            const inProgressDate = DateTime.fromISO(log.created);
            const daysInStatus = DateTime.local().diff(
              inProgressDate,
              "days"
            ).days;

            if (daysInStatus > longRunningDays) {
              longRunningIssues.push({
                id: child.id,
                key: child.key,
                timeInStatus: daysInStatus,
              });
            }
          }
        }
      }
    }
    const comments = await getCommentsTimeline(child.id, auth, windowStartDate);

    childIssues.push({
      id: child.id,
      key: child.key,
      changelogTimeline: issueChangelogTimeline,
      commentsTimeline: comments,
    });
  }
  return {
    longRunningIssues,
    childIssues,
    scopeDeltas,
  };
}

export async function analyzeEpic(
  epicKey: string,
  windowStartDate: Date,
  windowEndDate: Date,
  auth: JiraRequestAuth,
  buildId: string,
  velocityWindowDays: number,
  longRunningDays: number
): Promise<EpicReport> {
  const {
    id: epicId,
    fields: {
      assignee,
      duedate,
      status: { name: statusName },
      priority: { name: priority },
      summary: title,
    },
  } = await getIssue(epicKey, auth);
  const { atlassianUserId, atlassianWorkspaceId } = extractFromJiraAuth(auth);
  // Compute the 30-day velocity for issues with that epic as a parent
  const jql = `parent = ${epicKey}`;
  const pointsFields: PointsField[] = await getFields(auth, "point"); // Assuming getFields returns the fields used for story points
  const velocity = await calculateVelocity(
    jql,
    velocityWindowDays,
    pointsFields,
    auth
  ); // Assuming 30 days
  const remainingPoints = await sumRemainingStoryPointsForEpic(
    epicKey,
    pointsFields,
    auth
  );

  const totalPoints = await sumTotalStoryPointsForEpic(
    epicKey,
    pointsFields,
    auth
  );
  const inProgressPoints = await fetchAndSumStoryPoints(
    `parent = ${epicKey} AND statusCategory = "In Progress"`,
    pointsFields,
    auth
  );
  const completedPoints = await fetchAndSumStoryPoints(
    `parent = ${epicKey} AND statusCategory = "Done"`,
    pointsFields,
    auth
  );
  const changelogTimeline = await fetchIssueChangelogTimeline(
    epicKey,
    auth,
    windowStartDate
  );
  const commentsTimeline = await getCommentsTimeline(
    epicKey,
    auth,
    windowStartDate
  );
  const { longRunningIssues, childIssues, scopeDeltas } =
    await analyzeChildIssues(
      jql,
      epicId,
      longRunningDays,
      auth,
      windowStartDate,
      pointsFields
    );

  const analysis = createEpicMetricAnalysis(remainingPoints, velocity, duedate);
  const reportGenerationDate = DateTime.local().toJSDate();

  if (!reportGenerationDate) {
    throw new Error("Failed to format report generation date");
  }

  const dueDate = DateTime.fromISO(duedate)?.toJSDate() ?? undefined;
  const epicReport: EpicReport = {
    buildId,
    reportType: "epic",
    buildStatus: {
      buildId,
      status: "success",
      startedAt: reportGenerationDate,
      remainingItems: [],
    },
    id: randomUUID().toString(),
    ownerId: atlassianUserId,
    scopeDeltas,
    atlassianWorkspaceId,
    longRunningDays,
    key: epicKey,
    commentsTimeline,
    childIssues,
    windowStartDate,
    windowEndDate,
    longRunningIssues,
    analysis,
    assignee,
    changelogTimeline,
    title,
    reportGenerationDate,
    statusName,
    priority,
    dueDate,
    velocity: velocity,
    remainingPoints,
    inProgressPoints,
    completedPoints,
    totalPoints,
  };

  const summary = await summarizeEpicReport(epicReport);

  return { ...epicReport, summary };
}
