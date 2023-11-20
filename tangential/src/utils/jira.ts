import {
  Changelog, ChangelogEntry,
  ChangelogValue, GetByJqlResponse,
  JiraRequestAuth, JiraRequestOptions,
  PointsField, ProjectReport,
  JiraProfile,
  EpicReport,
  IssueComment,
  jsonLog,
  Velocity,
  Analysis,
  AnalysisState,
  JiraIssue,
  extractFromJiraAuth
} from '@akfreas/tangential-core';
import { DateTime } from 'luxon';
import { makeJiraRequest } from './jiraRequest';
import { summarizeEpicReport } from './summarizationUtils';
import { sendEpicAnalysisQueueMessage } from './sqs';

interface ProjectInfo {
  id: string;
  key: string;
  name: string;
  displayName?: string;
  avatarUrls: any;
  active: boolean;
  lead: JiraProfile;
}


export async function getByJql(jql: string = 'project=10001', auth: JiraRequestAuth, maxItems: number = 5000): Promise<GetByJqlResponse> {
  const path = 'search';
  let startAt = 0;
  const maxResults = 100;  // Jira usually has a limit per request, often 100
  let fetchedItems = 0;
  let allIssues: any[] = [];

  while (fetchedItems < maxItems) {
    const params = {
      expand: 'names',
      jql,
      startAt,
      maxResults
    };

    const options: JiraRequestOptions = {
      method: 'GET',
      path,
      params,
    };

    let response;
    try {
      response = await makeJiraRequest(options, auth);
    } catch (error) {
      console.error('Failed to get issues for JQL:', jql);
      return { issues: [] };
    }

    const issues = response?.issues ?? [];
    allIssues = [...allIssues, ...issues];

    const fetched = issues.length;
    if (fetched === 0) {
      break;  // No more issues to fetch
    }

    fetchedItems += fetched;
    startAt += fetched;
  }

  return { issues: allIssues.slice(0, maxItems) };
}


async function sumStoryPoints(jql: string, pointsFields: PointsField[], auth: JiraRequestAuth): Promise<number> {
  let totalPoints = 0;

  let response: GetByJqlResponse;
  try {
    response = await getByJql(jql, auth);
  } catch (error) {
    console.error('Failed to get issues for JQL:', jql);
    return totalPoints;
  }

  const issues = response.issues;
  for (const issue of issues) {
    for (const field of pointsFields) {
      const fieldId = field.id;
      const points = issue.fields?.[fieldId] ?? 0;
      totalPoints += points ? points : 0;  // add the points if they exist
    }
  }

  return totalPoints;
}

export async function fetchIssueQueryChangelogs(jqlQuery: string, auth: JiraRequestAuth, maxResults: number = 50): Promise<ChangelogEntry[]> {
  const body = {
    jql: jqlQuery,
    fields: '',  // Empty to only get issue key and changelog
    expand: 'changelog',  // To include changelog in the response
    maxResults
  };

  const options: JiraRequestOptions = {
    method: 'GET',
    path: 'search',
    body,
  };

  let response;
  try {
    response = await makeJiraRequest(options, auth);
  } catch (error) {
    console.error('Failed to get issues for JQL query:', jqlQuery);
    return [];
  }

  const issues = response?.issues ?? [];
  const changelogs: ChangelogEntry[] = [];
  for (const issue of issues) {
    const issueId = issue.id;
    const changelog = issue.changelog.histories;
    changelogs.push({
      issue_id: issueId,
      key: issue.key,
      changelog
    });
  }

  return changelogs;
}

export async function fetchProjects(auth: JiraRequestAuth, maxItems: number = 5000): Promise<ProjectInfo[]> {
  let projects: ProjectInfo[] = [];
  let startAt = 0;
  const maxResults = 50;  // Max items per request, can be changed if needed

  while (projects.length < maxItems) {
    const options = {
      path: 'project/search',
      method: 'GET',
      qs: {  // Query parameters
        startAt: startAt,
        maxResults: maxResults
      }
    };

    const response = await makeJiraRequest(options, auth);
    const newProjects = response.values;  // The projects are in the `values` field based on your sample response

    if (!newProjects || newProjects.length === 0) {
      break;  // Exit loop if no more projects
    }

    // Extract only the "id", "key", and "name" fields
    const extractedProjects = newProjects.map((project: any) => ({
      id: project.id,
      key: project.key,
      name: project.name
    }));

    projects = projects.concat(extractedProjects);

    if (projects.length >= maxItems) {
      projects = projects.slice(0, maxItems);  // Trim excess projects if any
      break;  // Exit loop if maxItems or more projects fetched
    }

    if (response.isLast) {
      break;  // Exit loop if this is the last batch
    }

    startAt += maxResults;  // Update start index for the next request
  }

  return projects;
}

export async function fetchProjectById(projectId: string, auth: JiraRequestAuth): Promise<ProjectInfo> {
  const options = {
    path: `project/${projectId}`,
    method: 'GET',
  };

  const response = await makeJiraRequest(options, auth);
  const project: ProjectInfo = {
    id: response.id,
    key: response.key,
    name: response.name,
    avatarUrls: response.avatarUrls,
    active: response.active,
    displayName: response.displayName,
    lead: response.lead
  };

  return project;
}

async function fetchIssueChangelog(issueId: string, auth: JiraRequestAuth, maxResults: number = 50): Promise<ChangelogValue[]> {
  let changelogItems: ChangelogValue[] = [];
  let startAt = 0;
  let fetched = 0;

  while (true) {
  
    const options: JiraRequestOptions = {
      method: 'GET',
      path: `issue/${issueId}/changelog`,
      params: {
        startAt
      }
    };

    let response: Changelog;
    try {
      response = await makeJiraRequest(options, auth);
    } catch (error) {
      console.error(`Failed to get changelog for issue ID: ${issueId}`);
      return [];
    }

    const changelog: ChangelogValue[] = response.values;

    // Filter out unwanted fields from the author dictionary
    for (const item of changelog) {
      item.author = {
        accountId: item.author?.accountId ?? '',
        displayName: item.author?.displayName ?? '',
        avatarUrls: item.author?.avatarUrls ?? {}
      };
    }

    changelogItems = [...changelogItems, ...changelog];
    fetched += changelog.length;

    // Check if we've fetched all items or reached the last page
    if (changelog.length < maxResults || fetched >= maxResults) {
      break;
    }

    // Update the starting index for the next page of results
    startAt += maxResults;
  }

  return changelogItems;
}

async function calculateVelocity(
  baseJql: string,
  window: number,
  pointsFields: PointsField[],
  auth: JiraRequestAuth
): Promise<Velocity> {
  const endDate = DateTime.now();
  const startDate = endDate.minus({ days: window });

  // Formulate JQL for issues completed in the last X days
  const dateJql = `status changed to "Done" DURING ("${startDate.toFormat('yyyy/MM/dd')}", "${endDate.toFormat('yyyy/MM/dd')}")`;

  // Combine baseJql and dateJql
  const combinedJql = `${baseJql} AND ${dateJql}`;
  const storyPoints = await sumStoryPoints(combinedJql, pointsFields, auth);

  return {
    daily: storyPoints / window,
    total: storyPoints,
    window
  }
}

export async function sumRemainingStoryPointsForEpic(epicId: string, pointsFields: PointsField[], auth: JiraRequestAuth): Promise<number> {
  // Formulate JQL for issues within an epic, excluding completed issues
  const jql = `parent = ${epicId} AND status != "Done"`;

  // Use the sumStoryPoints function to get the total of remaining points
  return await sumStoryPoints(jql, pointsFields, auth);
}

export async function sumTotalStoryPointsForEpic(epicId: string, pointsFields: PointsField[], auth: JiraRequestAuth): Promise<number> {

  // Formulate JQL for issues within an epic
  const jql = `parent = ${epicId}`;

  // Use the sumStoryPoints function to get the total of remaining points
  return await sumStoryPoints(jql, pointsFields, auth);
}

export async function sumTotalStoryPointsForProject(projectId: string, pointsFields: PointsField[], auth: JiraRequestAuth): Promise<number> {
  
  // Formulate JQL for issues within an epic
  const jql = `project = ${projectId}`;

  // Use the sumStoryPoints function to get the total of remaining points
  return await sumStoryPoints(jql, pointsFields, auth);
}

interface IssueCommentsTimeline {
  beforeDate: IssueComment[];
  afterDate: IssueComment[];
}

export async function getCommentsTimeline(issueId: string, auth: JiraRequestAuth, pivotDate: string, maxResults: number = 50): Promise<IssueCommentsTimeline | null> {
  const beforeDate: IssueComment[] = [];
  const afterDate: IssueComment[] = [];
  let startAt = 0;
  let total = 0;

  // Convert pivotDate to Date object for comparison
  const pivot = DateTime.fromISO(pivotDate);

  while (true) {
    const options = {
      path: `issue/${issueId}/comment`,
      method: 'GET',
      params: {
        startAt,
        maxResults,
        expand: 'renderedBody'
      }
    };

    let response;
    try {
      response = await makeJiraRequest(options, auth);
    } catch (error) {
      console.error(`Failed to get comments for issue ID: ${issueId}`);
      return { beforeDate, afterDate }; // Return the partial lists if there's an error
    }

    const pageComments: IssueComment[] = response.comments.map((comment: any): IssueComment => {
      const {
        self,
        id,
        author: {
          accountId: authorAccountId,
          avatarUrls: authorAvatarUrls,
          displayName: authorDisplayName,
        },
        renderedBody,
        updateAuthor: {
          accountId: updateAuthorAccountId,
          avatarUrls: updateAuthorAvatarUrls,
          displayName: updateAuthorDisplayName,
        },
        created,
        updated,
      } = comment;

      const author: JiraProfile = {
        accountId: authorAccountId,
        avatarUrls: authorAvatarUrls,
        displayName: authorDisplayName,
      };

      const updateAuthor: JiraProfile = {
        accountId: updateAuthorAccountId,
        avatarUrls: updateAuthorAvatarUrls,
        displayName: updateAuthorDisplayName,
      };

      return {
        self,
        id,
        author,
        renderedBody,
        updateAuthor,
        created,
        updated,
      };
    });

    pageComments.forEach(comment => {
      const createdDate = DateTime.fromISO(comment.created);
      if (createdDate < pivot) {
        beforeDate.push(comment);
      } else if (createdDate > pivot) {
        afterDate.push(comment);
      }
      // Comments exactly at the pivot time are not included, as per the initial request
    });

    total = response.total; // Assuming the response includes a 'total' field indicating the total number of comments

    // Check if we've fetched all items or reached the last page
    if (pageComments.length < maxResults || beforeDate.length + afterDate.length >= total) {
      break;
    }

    // Update the starting index for the next page of results
    startAt += maxResults;
  }

  if (beforeDate.length + afterDate.length === 0) {
    return null;
  }

  return { beforeDate, afterDate };
}

export async function fetchChildIssues(parentIssueKey: string, auth: JiraRequestAuth, maxResults: number = 5000): Promise<any> {
  const jql = `parent = ${parentIssueKey}`;
  return await getByJql(jql, auth, maxResults);
}

export async function getFields(auth: JiraRequestAuth, filter?: string): Promise<PointsField[]> {
  const options = {
    path: 'field',
    method: 'GET',
  };

  const fields = await makeJiraRequest(options, auth);

  if (filter) {
    const regex = new RegExp(filter, 'i');
    return fields.filter((field: any) => regex.test(field.name));
  } else {
    return fields;
  }
}

async function getIssue(issueId: string, auth: JiraRequestAuth): Promise<any> {
  const options = {
    path: `issue/${issueId}`,
    method: 'GET',
  };

  return await makeJiraRequest(options, auth);
}

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
    return sendEpicAnalysisQueueMessage(buildId, 
      projectKey, key,
      auth, velocityWindowDays, 
      longRunningDays)
  }));
  const fields = await getFields(auth, 'point')

  const totalPoints = await sumTotalStoryPointsForProject(projectKey, fields, auth)

  const projectVelocity = await calculateVelocity(`project = ${projectKey}`, velocityWindowDays, fields, auth);
  const windowEndDate = DateTime.local().toISO();
  const windowStartDateObject = windowStartDate.toISO()
  const projectRemainingPoints = await sumStoryPoints(`project = ${projectKey} AND statusCategory != "Done"`, fields, auth);
  const inProgressPoints = await sumStoryPoints(`project = ${projectKey} AND statusCategory = "In Progress"`, fields, auth);
  const completedPoints = await sumStoryPoints(`project = ${projectKey} AND statusCategory = "Done"`, fields, auth);
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

export async function analyzeEpic(
  epicKey: string,
  windowStartDate: DateTime,
  auth: JiraRequestAuth,
  buildId: string,
  velocityWindowDays: number = 30,
  longRunningDays: number = 10
): Promise<EpicReport> {
  let report: any = { epicKey };

  const {
    fields: { assignee, duedate,
    status: { name: statusName },
    priority: { name: priority },
    summary } } = await getIssue(epicKey, auth);

  report = { ...report, statusName, priority, summary };
  const { atlassianUserId, atlassianWorkspaceId } = extractFromJiraAuth(auth);
  // Compute the 30-day velocity for issues with that epic as a parent
  const jql = `parent = ${epicKey}`;
  const pointsFields: PointsField[] = await getFields(auth, 'point');  // Assuming getFields returns the fields used for story points  
  const velocity = await calculateVelocity(jql, velocityWindowDays, pointsFields, auth); // Assuming 30 days
  const remainingPoints = await sumRemainingStoryPointsForEpic(epicKey, pointsFields, auth);


  const totalPoints = await sumTotalStoryPointsForEpic(epicKey, pointsFields, auth);
  const inProgressPoints = await sumStoryPoints(`parent = ${epicKey} AND statusCategory = "In Progress"`, pointsFields, auth);
  const completedPoints = await sumStoryPoints(`parent = ${epicKey} AND statusCategory = "Done"`, pointsFields, auth);
  // Fetch the changelog for that epic
  const changelogs = await fetchIssueChangelog(epicKey, auth);

  // Fetch child issues
  const {issues: epicChildIssues} = await getByJql(jql, auth);
  report.child_issues = [];

  // Pull changelog and comments and filter out everything before last checked date
  const longRunningIssues: JiraIssue[] = [];

  const comments = await getCommentsTimeline(epicKey, auth, windowStartDate.toISO()!);

  if (comments) {
    report.comments = comments;
  }
  const childIssues: JiraIssue[] = [];

  for (const child of epicChildIssues) {
    const childData: any = {
      issue_id: child.id,
      key: child.key
    };

    const comments = await getCommentsTimeline(child.id, auth, windowStartDate.toISO()!);
    childData.comments = comments;

    const changelog = await fetchIssueChangelog(child.id, auth);

    if (changelog) {

      const filteredChangelog = changelog.filter((log: ChangelogValue) => DateTime.fromISO(log.created) > windowStartDate);
      childData.changelog = filteredChangelog;

      const currentStatus = child.fields?.status;

      if (currentStatus?.statusCategory?.name === 'In Progress') {
        for (const log of changelog) {
          if (log.items.some(item => item.to === currentStatus.id)) {
            const inProgressDate = DateTime.fromISO(log.created);
            const daysInStatus = DateTime.local().diff(inProgressDate, 'days').days;

            if (daysInStatus > longRunningDays) {
              longRunningIssues.push({
                id: child.id,
                key: child.key,
                self: child.self,
                timeInStatus: daysInStatus
              });
            }
          }
        }
      }
    }
    childIssues.push(childData);
  }


  let analysis: Analysis | undefined = undefined;
  if (velocity.daily > 0) {
    analysis = createEpicMetricAnalysis(remainingPoints, velocity, duedate);
  }
  const reportGenerationDate = DateTime.local().toISO();
  
  if (!reportGenerationDate) {
    throw new Error('Failed to format report generation date');
  }

  const dueDate = DateTime.fromISO(duedate)?.toISODate() ?? undefined;
  const epicReport: EpicReport = {
    buildId,
    reportType: 'epic',
    buildStatus: {
      buildId,
      status: 'success',
      startedAt: reportGenerationDate,
      remainingItems: []
    },
    ownerId: atlassianUserId,
    atlassianWorkspaceId,
    epicKey,
    childIssues,
    longRunningIssues,
    analysis,
    assignee,
    changelogs,
    summary,
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

  const summaryText = await summarizeEpicReport(epicReport);
  
  return {...epicReport, summaryText};
}

function createEpicMetricAnalysis(remainingPoints: number, velocity: Velocity, duedate?: string): Analysis | undefined {

  if (remainingPoints === 0) {
    return {
      state: {
        id: 'completed',
        name: 'Completed',
        color: 'blue'
      }
    };
  }

  const daysRemaining = remainingPoints / velocity.daily;
  const predictedEndDate = DateTime.now().plus({ days: daysRemaining }).toISODate();
  
  if (!predictedEndDate) {
    throw new Error('Failed to format predicted end date');
  }

  const analysis: Analysis = {
    predictedEndDate,
  };
  if (duedate) {
    const predictedOverdue = predictedEndDate && DateTime.fromISO(predictedEndDate) > DateTime.fromISO(duedate)
    if (predictedOverdue === undefined) {
      throw new Error('Failed to format predicted end date');
    }
    analysis.predictedOverdue = predictedOverdue === "" ? false : predictedOverdue;
    analysis.state = {
      id: predictedOverdue ? 'at-risk' : 'on-track',
      name: predictedOverdue ? 'At Risk' : 'On Track',
      color: predictedOverdue ? 'red' : 'green'
    }
  } else {
    analysis.state = {
      id: 'no-due-date',
      name: 'No Due Date',
      color: 'blue'
    }
  }
  return analysis
}

export function createProjectAnalysis(epicKeys: EpicReport[], projectReport: ProjectReport): Analysis | undefined {
  const daysRemaining = projectReport.remainingPoints / projectReport.velocity.daily;
  const predictedEndDate = DateTime.now().plus({ days: daysRemaining }).toISODate();
  if (!predictedEndDate) {
    throw new Error('Failed to format predicted end date');
  }

    if (projectReport.remainingPoints === 0) {
      return undefined;
    }
      
    if (!predictedEndDate) {
      throw new Error('Failed to format predicted end date');
    }
  
    const analysis: Analysis = {
      predictedEndDate,
    };
  
    analysis.state = createProjectMetricAnalysis(epicKeys) 
    return analysis
  }
function createProjectMetricAnalysis(epicKeys: EpicReport[]): AnalysisState {
  const totalEpics = epicKeys.length;
  const atRiskCount = epicKeys.filter(epic => epic.analysis?.state?.id === 'at-risk').length;
  const onTrackCount = epicKeys.filter(epic => epic.analysis?.state?.id === 'on-track').length;

  if (onTrackCount === totalEpics) {
    return {
      id: 'on-track',
      name: 'On Track',
      color: 'green'
    }
  } else if (atRiskCount / totalEpics > 0.5) {
    return {
      id: 'at-risk',
      name: 'At Risk',
      color: 'red'
    }
  } else if (atRiskCount / totalEpics > 0.2) {
    return {
      id: 'off-track',
      name: 'Off Track',
      color: 'yellow'
    }
  } else {
    jsonLog('did not match any analysis', { atRiskCount, onTrackCount, totalEpics })
    return {
      id: 'on-track',
      name: 'On Track',
      color: 'green'
    }
  }
}
