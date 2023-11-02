
import {
  JiraRequestAuth, JiraRequestOptions,
} from '@akfreas/tangential-core';
import { axiosInstance } from './request';
import { promises as fs } from 'fs'; // Use the Promise-based version of fs for async/await
import * as path from 'path'; // For path manipulation

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
  const result = await fs.mkdir(recordingsPath, { recursive: true });
  console.log(`Created directory ${recordingsPath}, ${result}}`);

  // Construct the filename from the request path and method
  const sanitizedPath = options.path.replace(/\//g, '-'); // Replace slashes with dashes to avoid directory issues
  const filename = `${sanitizedPath}-${options.method}.json`;

  // Write the request and response to the filesystem
  await fs.writeFile(path.join(recordingsPath, filename), JSON.stringify(requestData, null, 2), 'utf8');

  // Return the response data
  return response.data;
}
