import { Agent as HttpsAgent } from 'https';
import { Agent as HttpAgent } from 'http';
import * as https from 'https';
import * as http from 'http';
import * as HTTPSProxyAgent from 'https-proxy-agent';
import * as HTTPProxyAgent from 'http-proxy-agent';

let agent: https.Agent;
// import { captureAWS, captureHTTPs, capturePromise } from 'aws-xray-sdk-core';
// import { SNSClient } from '@aws-sdk/client-sns';
import { SQSClient } from '@aws-sdk/client-sqs';
// import { S3Client } from '@aws-sdk/client-s3';
// import { SSMClient } from '@aws-sdk/client-ssm';
// import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
// import { ComprehendClient } from '@aws-sdk/client-comprehend';
import { jsonLog } from '../utils/logging';


const configInfo = {
  region: process.env.awsRegion as string
};

// let snsInstance = new SNSClient(configInfo);
let sqsInstance = new SQSClient(configInfo);
// let s3Instance = new S3Client(configInfo);
// let ssmInstance = new SSMClient(configInfo);
// let secretsManagerInstance = new SecretsManagerClient(configInfo);
// let comprehendInstance = new ComprehendClient(configInfo);
let httpsInstance = new HttpsAgent();
let httpInstance = new HttpAgent();
let elasticSearchHttpInstance = httpsInstance;

if (process.env.LOCAL_HTTP_PROXY) {
  httpsInstance = new HTTPSProxyAgent.HttpsProxyAgent(process.env.LOCAL_HTTP_PROXY);
  httpInstance = new HTTPProxyAgent.HttpProxyAgent(process.env.LOCAL_HTTP_PROXY);
  elasticSearchHttpInstance = httpsInstance;

  const config = { ...configInfo, httpsAgent: httpsInstance };
  // snsInstance = new SNSClient(config);
  sqsInstance = new SQSClient(config);
  // ssmInstance = new SSMClient(config);
  // secretsManagerInstance = new SecretsManagerClient(config);
  // comprehendInstance = new ComprehendClient(config);
  // s3Instance = new S3Client({ ...config });
}

if (process.env.IS_OFFLINE) {
  const localstackConfigInfo = { endpoint: 'http://localhost:4566', ...configInfo, httpsAgent: httpInstance };
  // snsInstance = new SNSClient(localstackConfigInfo);
  sqsInstance = new SQSClient(localstackConfigInfo);
  // ssmInstance = new SSMClient(localstackConfigInfo);
  // secretsManagerInstance = new SecretsManagerClient(localstackConfigInfo);
  // s3Instance = new S3Client({ ...localstackConfigInfo });
}

// export function setupXray(): void {
//   if (process.env.xRayEnabled === 'true') {
//     captureAWS(snsInstance);
//     captureHTTPs(HTTPSProxyAgent.HttpsProxyAgent);
//     capturePromise();

//     const agent = new HttpsAgent();
//     snsInstance.middlewareStack.add(
//       (next) => async (args) => {
//         args.request.httpOptions.agent = agent;
//         return next(args);
//       },
//       {
//         step: 'build'
//       }
//     );
//   }
// }

export const sqs = sqsInstance;
// export const sns = snsInstance;
// export const s3 = s3Instance;
// export const ssm = ssmInstance;
// export const secretsManager = secretsManagerInstance;
// export const comprehend = comprehendInstance;
export const httpsAgent = httpsInstance;
export const httpAgent = httpInstance;
// export const dynamoDbDocumentClient = documentClientInstance;

globalThis.jsonLog = jsonLog;
