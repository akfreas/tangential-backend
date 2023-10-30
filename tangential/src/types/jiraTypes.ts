import { Document } from "mongodb";

export interface ChangelogEntry {
  issue_id: string;
  key: string;
  changelog: any[];
}

export interface JiraRequestAuth {
  accessToken: string;
  atlassianId: string;
}

export interface JiraRequestOptions {
  path: string;
  method: string;
  body?: any;
  params?: any;
}

export interface GetByJqlResponse {
  issues: any[];
}

export interface PointsField {
  id: string;
}
export interface AvatarUrls {
  "48x48": string;
  "24x24": string;
  "16x16": string;
  "32x32": string;
}

export interface Author {
  accountId: string;
  displayName: string;
}

export interface ChangelogItem {
  field: string;
  fieldtype: string;
  fieldId: string; // New field
  from: string | null;
  fromString: string;
  to: string | null;
  toString: string;
}

export interface ChangelogValue {
  id: string;
  author: Author;
  created: string;
  items: ChangelogItem[];
}

export interface Changelog {
  self: string; // New field
  nextPage: string; // New field
  maxResults: number; // New field
  startAt: number; // New field
  total: number; // New field
  isLast: boolean; // New field
  values: ChangelogValue[]; // Updated field type
}


export interface ChildIssue {  // probably rename to "ticket" or "story"
  id: string;
  key: string;
  fields?: any;
}

export interface LongRunningIssue {
  id: string;
  key: string;
  self: string;
  timeInStatus: number;
}

export interface EpicReport {
  epicKey: string;
  velocity: number;
  changelogs: ChangelogEntry[];
  longRunningIssues: LongRunningIssue[];
  childIssues: ChildIssue[];
}

export interface ProjectReport extends Document {
  velocity: number;
  epics: EpicReport[];
  windowStartDate: string;
  windowEndDate: string;
  projectKey: string;
}