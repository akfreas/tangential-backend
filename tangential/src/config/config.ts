import * as AWSSDK from 'aws-sdk';
import AWSXRay from 'aws-xray-sdk';
import * as https from 'https';
import * as http from 'http';
import HTTPSProxyAgent from 'https-proxy-agent';
import HTTPProxyAgent from 'http-proxy-agent';

import 'aws-sdk/lib/maintenance_mode_message';
// Suppressing the maintenance mode warning
require('aws-sdk/lib/maintenance_mode_message').suppress = true;

process.on('warning', (warning: any) => {
  console.log(warning.stack);
});

let AWS: typeof AWSSDK = AWSSDK;
let agent: https.Agent;
const configInfo: AWSSDK.SNS.ClientConfiguration = { region: process.env.awsRegion as string };

let snsInstance = new AWS.SNS(configInfo);
let sqsInstance = new AWS.SQS(configInfo);
let s3Instance = new AWS.S3(configInfo);
let ssmInstance = new AWS.SSM(configInfo);
let secretsManagerInstance = new AWS.SecretsManager(configInfo);
let comprehendInstance = new AWS.Comprehend(configInfo);
let httpsInstance: https.Agent = new https.Agent();
let httpInstance: http.Agent = new http.Agent();
let elasticSearchHttpInstance: https.Agent | http.Agent = httpsInstance;
let documentClientInstance = new AWS.DynamoDB.DocumentClient(configInfo);

if (process.env.LOCAL_HTTP_PROXY) {
  httpsInstance = new HTTPSProxyAgent(process.env.LOCAL_HTTP_PROXY) as https.Agent;
  httpInstance = new HTTPProxyAgent(process.env.LOCAL_HTTP_PROXY) as http.Agent;
  elasticSearchHttpInstance = httpsInstance;
  const config = { ...configInfo, httpOptions: { agent: httpsInstance } };
  comprehendInstance = new AWS.Comprehend(config);
  ssmInstance = new AWS.SSM(config);
  snsInstance = new AWS.SNS(config);
  sqsInstance = new AWS.SQS(config);
  documentClientInstance = new AWS.DynamoDB.DocumentClient(config);
  s3Instance = new AWS.S3({ ...config, s3ForcePathStyle: true });
  secretsManagerInstance = new AWS.SecretsManager(config);
} else if (process.env.IS_OFFLINE) {
  httpInstance = new http.Agent();
  elasticSearchHttpInstance = httpInstance;
}

if (process.env.IS_OFFLINE) {
  const localstackConfigInfo = { endpoint: 'http://localhost:4566', httpOptions: { agent: httpInstance }, ...configInfo };
  ssmInstance = new AWS.SSM(localstackConfigInfo);
  snsInstance = new AWS.SNS(localstackConfigInfo);
  sqsInstance = new AWS.SQS(localstackConfigInfo);
  documentClientInstance = new AWS.DynamoDB.DocumentClient(localstackConfigInfo);
  s3Instance = new AWS.S3({ ...localstackConfigInfo, s3ForcePathStyle: true });
  secretsManagerInstance = new AWS.SecretsManager(localstackConfigInfo);
}

export function setupXray(): void {
  if (process.env.xRayEnabled === 'true') {
    AWS = AWSXRay.captureAWS(AWS);
    AWSXRay.captureHTTPsGlobal(https);
    AWSXRay.capturePromise();
    agent = new https.Agent();
    AWS.config.update({ httpOptions: { agent } });
  }
}

export const sqs = sqsInstance;
export const sns = snsInstance;
export const s3 = s3Instance;
export const ssm = ssmInstance;
export const secretsManager = secretsManagerInstance;
export const comprehend = comprehendInstance;
export const httpsAgent = httpsInstance;
export const httpAgent = httpInstance;
export const elasticSearchHttpAgent = elasticSearchHttpInstance;
export const dynamoDbDocumentClient = documentClientInstance;

