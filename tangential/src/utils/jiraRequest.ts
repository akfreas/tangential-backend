import {
  JiraRequestAuth, JiraRequestOptions, doError, doLog, jsonLog,
} from '@akfreas/tangential-core';
import { axiosInstance } from './request';
import { promises as fs } from 'fs';
import * as path from 'path';
import qs from 'qs'; // qs is a querystring parsing library that can handle complex objects
import axios from 'axios';

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
  // eslint-disable-next-line no-control-regex
  filename = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');

  // Write the request and response to the filesystem
  const filePath = path.join(recordingsPath, filename);
  doLog("Writing to disk: ", filePath)
  await fs.writeFile(filePath, JSON.stringify(requestData, null, 2), 'utf8');
}


export async function makeJiraRequest(options: JiraRequestOptions, auth: JiraRequestAuth): Promise<any> {
  const { accessToken, atlassianWorkspaceId } = auth;

  if (!accessToken) {
    throw new Error('No access token provided');
  }

  if (!atlassianWorkspaceId) {
    throw new Error('No Atlassian Workspace ID provided');
  }

  const url = `https://api.atlassian.com/ex/jira/${atlassianWorkspaceId}/rest/api/3/${options.path}`;

  try {
    const response = await axiosInstance({
      method: options.method,
      url,
      data: options.body,
      params: options.params,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        // Token expired, refresh it
        return await refreshTokenAndRetry(options, auth);
      }
      throw error;
    } else {
      // For non-Axios errors
      throw new Error('An unexpected error occurred');
    }
  }
}

async function refreshTokenAndRetry(options: JiraRequestOptions, auth: JiraRequestAuth): Promise<any> {
  const clientId = process.env.ATLASSIAN_CLIENT_ID;
  const clientSecret = process.env.ATLASSIAN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Client ID or Client Secret is not set in the environment variables.');
  }

  try {
    const tokenResponse = await axiosInstance.post('https://auth.atlassian.com/oauth/token', {
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: auth.refreshToken,
    });

    const newAccessToken = tokenResponse.data.access_token;
    auth.accessToken = newAccessToken; // Update the access token in auth

    return makeJiraRequest(options, auth); // Retry the original request with the new token
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw error;
    } else {
      // For non-Axios errors
      throw new Error('Error while refreshing token');
    }
  }
}
