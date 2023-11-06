import { Agent as HttpsAgent } from 'https';
import { Agent as HttpAgent } from 'http';
import { SQSClient } from '@aws-sdk/client-sqs';

const configInfo = {
  region: process.env.awsRegion as string
};

let sqsInstance = new SQSClient(configInfo);
let httpsInstance = new HttpsAgent();
let httpInstance = new HttpAgent();

if (process.env.LOCAL_HTTP_PROXY) {
/* eslint-disable @typescript-eslint/no-var-requires */
  const HTTPSProxyAgent = require('https-proxy-agent');
  const HTTPProxyAgent = require('http-proxy-agent');
/* eslint-enable @typescript-eslint/no-var-requires */
  httpsInstance = new HTTPSProxyAgent.HttpsProxyAgent(process.env.LOCAL_HTTP_PROXY);
  httpInstance = new HTTPProxyAgent.HttpProxyAgent(process.env.LOCAL_HTTP_PROXY);

  const config = { ...configInfo, httpsAgent: httpsInstance };
  sqsInstance = new SQSClient(config);
}

if (process.env.IS_OFFLINE) {
  const localstackConfigInfo = { endpoint: 'http://localhost:4566', ...configInfo, httpsAgent: httpInstance };
  sqsInstance = new SQSClient(localstackConfigInfo);
}

export const sqs = sqsInstance;
export const httpsAgent = httpsInstance;
export const httpAgent = httpInstance;
