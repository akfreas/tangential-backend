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
  ChangelogTimeline,
  IssueCommentsTimeline,
  ProjectInfo,
  doError
} from '@akfreas/tangential-core';
import { DateTime } from 'luxon';
import { makeJiraRequest } from './jiraRequest';

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


export function sumStoryPoints(issues: any[], pointsFields: PointsField[]): number {
  let totalPoints = 0;

  for (const issue of issues) {
    for (const field of pointsFields) {
      const fieldId = field.id;
      const points = issue.fields?.[fieldId] ?? 0;
      totalPoints += points ? points : 0;  // add the points if they exist
    }
  }
  return totalPoints;
}

export async function fetchAndSumStoryPoints(jql: string, pointsFields: PointsField[], auth: JiraRequestAuth): Promise<number> {

  let issues: any[];
  try {
    ({issues} = await getByJql(jql, auth));
  } catch (error) {
    console.error('Failed to get issues for JQL:', jql);
    return 0;
  }

  return sumStoryPoints(issues, pointsFields);
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


export async function fetchIssueChangelogTimeline(issueKey: string, auth: JiraRequestAuth, pivotDate: string, maxResults: number = 50): Promise<ChangelogTimeline> {
  let changelogItems: ChangelogValue[] = [];
  let startAt = 0;
  let fetched = 0;
  const beforeDate: ChangelogValue[] = [];
  const afterDate: ChangelogValue[] = [];
  while (true) {
  
    const options: JiraRequestOptions = {
      method: 'GET',
      path: `issue/${issueKey}/changelog`,
      params: {
        startAt
      }
    };

    let response: Changelog;
    try {
      response = await makeJiraRequest(options, auth);
    } catch (error) {
      doError("error", new Error(`Failed to get changelog for ${issueKey}`));
      return { issueKey, beforeDate, afterDate, all: [] }; // Return the partial lists if there's an error
    }

    const changelog: ChangelogValue[] = response.values;

    // Filter out unwanted fields from the author dictionary
    for (const item of changelog) {
      item.author = {
        accountId: item.author?.accountId ?? '',
        displayName: item.author?.displayName ?? ''
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

  // Separating the changelogs based on the pivotDate
  const pivot = DateTime.fromISO(pivotDate);
  changelogItems.forEach(item => {
    const itemDate = DateTime.fromISO(item.created);
    if (itemDate < pivot) {
      beforeDate.push(item);
    } else {
      afterDate.push(item);
    }
  });

  return { 
    issueKey,
    beforeDate, 
    afterDate,
    all: changelogItems 
  };
}

export async function calculateVelocity(
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
  const storyPoints = await fetchAndSumStoryPoints(combinedJql, pointsFields, auth);

  return {
    daily: storyPoints / window,
    total: storyPoints,
    window
  }
}

export async function sumRemainingStoryPointsForEpic(epicId: string, pointsFields: PointsField[], auth: JiraRequestAuth): Promise<number> {
  // Formulate JQL for issues within an epic, excluding completed issues
  const jql = `parent = ${epicId} AND status != "Done"`;

  // Use the fetchAndSumStoryPoints function to get the total of remaining points
  return await fetchAndSumStoryPoints(jql, pointsFields, auth);
}

export async function sumTotalStoryPointsForEpic(epicId: string, pointsFields: PointsField[], auth: JiraRequestAuth): Promise<number> {

  // Formulate JQL for issues within an epic
  const jql = `parent = ${epicId}`;

  // Use the fetchAndSumStoryPoints function to get the total of remaining points
  return await fetchAndSumStoryPoints(jql, pointsFields, auth);
}

export async function sumTotalStoryPointsForProject(projectId: string, pointsFields: PointsField[], auth: JiraRequestAuth): Promise<number> {
  
  // Formulate JQL for issues within an epic
  const jql = `project = ${projectId}`;

  // Use the fetchAndSumStoryPoints function to get the total of remaining points
  return await fetchAndSumStoryPoints(jql, pointsFields, auth);
}


export async function getCommentsTimeline(issueId: string, auth: JiraRequestAuth, pivotDate: string, maxResults: number = 50): Promise<IssueCommentsTimeline | undefined> {
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
          displayName: authorDisplayName,
        },
        renderedBody,
        updateAuthor: {
          accountId: updateAuthorAccountId,
          displayName: updateAuthorDisplayName,
        },
        created,
        updated,
      } = comment;

      const author: JiraProfile = {
        accountId: authorAccountId,
        displayName: authorDisplayName,
      };

      const updateAuthor: JiraProfile = {
        accountId: updateAuthorAccountId,
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
    return undefined;
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

export async function getNewIssuesForEpic(projectKey: string, epicId: string, auth: JiraRequestAuth, windowStartDate: DateTime, maxResults: number = 5000): Promise<any> {
  const jql = `project = "${projectKey}" AND "Epic Link" = "${epicId}" AND created >= "${windowStartDate.toISO()}"`;
  return await getByJql(jql, auth, maxResults);
}

export async function getIssue(issueId: string, auth: JiraRequestAuth): Promise<any> {
  const options = {
    path: `issue/${issueId}`,
    method: 'GET',
  };

  return await makeJiraRequest(options, auth);
}

export function createEpicMetricAnalysis(remainingPoints: number, velocity: Velocity, duedate?: string): Analysis | undefined {

  if (remainingPoints === 0) {
    return {
      state: {
        id: 'completed',
        name: 'Completed',
        color: 'blue'
      }
    };
  }

  if (velocity.daily === 0) {
    return {
        state: {
        id: 'no-velocity',
        name: 'No Velocity',
        color: 'blue'
      }
    }
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

export function createProjectAnalysis(epicKeys: EpicReport[], projectReport: ProjectReport): Analysis | undefined {
  const { velocity: { daily } } = projectReport;
  if (daily === 0) {
    return undefined;
  }

  const daysRemaining = projectReport.remainingPoints / daily;
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

