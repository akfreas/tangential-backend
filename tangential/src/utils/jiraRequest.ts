import {
  JiraRequestAuth, JiraRequestOptions,
} from '@akfreas/tangential-core';
import { axiosInstance } from './request';
import { promises as fs } from 'fs';
import * as path from 'path';
import qs from 'qs'; // qs is a querystring parsing library that can handle complex objects

async function writeRequestToDisk(options: JiraRequestOptions, response: any) {

  // Prepare the data to be stored
  const requestData = {
    request: {
      method: options.method,
      path: options.path,
      body: options.body,
      params: options.params
    },
    response: response.data
  };
  // Create a directory called 'recordings' if it doesn't exist
  const recordingsPath = path.join(__dirname, 'recordings');
  await fs.mkdir(recordingsPath, { recursive: true });

  // Construct the filename from the request path, method, and parameters if it's a GET request
  const sanitizedPath = options.path.replace(/\//g, '-');
  let filename = `${sanitizedPath}-${options.method}.json`;

  if (options.method.toUpperCase() === 'GET' && options.params) {
    // URL-encode the parameters to ensure they are safe for a filename
    const encodedParams = qs.stringify(options.params, { format: 'RFC1738' }).replace(/[?=&]/g, '-');
    filename = `${sanitizedPath}-${encodedParams}-${options.method}.json`;
  }

  // Replace characters that are not allowed in filenames
  filename = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');

  // Write the request and response to the filesystem
  const filePath = path.join(recordingsPath, filename);
  await fs.writeFile(filePath, JSON.stringify(requestData, null, 2), 'utf8');
}

export async function makeJiraRequest(options: JiraRequestOptions, auth: JiraRequestAuth): Promise<any> {

  const { accessToken, atlassianId } = auth;

  const url = `https://api.atlassian.com/ex/jira/${atlassianId}/rest/api/3/${options.path}`;

  // Make the request and get the response
  const response = await axiosInstance(url,
    {
      method: options.method,
      data: options.body,
      params: options.params,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

  if (process.env.recordJiraRequests) {
    await writeRequestToDisk(options, response);
  }

  // Return the response data
  return response.data;
}
