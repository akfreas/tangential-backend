
import { promises as fs } from 'fs';
import * as path from 'path';
import qs from 'qs'; // Assuming qs is already installed, otherwise you need to install it
import { DateTime } from 'luxon';
import { JiraRequestAuth, JiraRequestOptions } from '@akfreas/tangential-core';
import { jsonLog } from '../../../src/utils/logging';

export async function makeDiskRequest(options: JiraRequestOptions, auth: JiraRequestAuth): Promise<any> {
  // Construct the directory and file path
  const recordingsPath = path.join(__dirname, '../data');
  const sanitizedPath = options.path.replace(/\//g, '-'); // Replace slashes with dashes

  // Initialize the filename based on the method
  let filename = `${sanitizedPath}-${options.method}.json`;

  if (options.method.toUpperCase() === 'GET' && options.params) {
    // URL-encode the parameters to ensure they are safe for a filename
    const encodedParams = qs.stringify(options.params, { format: 'RFC1738' }).replace(/[?=&]/g, '-');
    filename = `${sanitizedPath}-${encodedParams}-${options.method}.json`;
  }

  // Replace characters that are not allowed in filenames
  filename = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  const filePath = path.join(recordingsPath, filename);

  if (options.method.toUpperCase() === 'GET') {
    try {
      // Read the file from the filesystem
      const data = await fs.readFile(filePath, 'utf8');

      // Parse the data as JSON
      const requestData = JSON.parse(data);

      // Return the response part of the stored data
      return requestData.response;
    } catch (error: unknown) { // Notice we've added the type here
      // We need to check that error is an instance of Error to access the message property
      if (error instanceof Error) {
        console.log("Error reading from disk for GET request: ", error.message);
        throw new Error(`Error reading from disk for GET request: ${error.message}`);
      } else {
        // If it's not an Error instance, we can just stringify the unknown error
        console.log("An unknown error occurred: ", error);
        throw new Error(`An unknown error occurred: ${String(error)}`);
      }
    }
  } else {
    // Handle POST request or other methods
    console.log(`Handling ${options.method} request differently.`);
    // Here you need to define how you want to handle POST requests
  }
}
