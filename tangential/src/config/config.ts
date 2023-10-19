import * as https from 'https';
import * as http from 'http';
import * as HTTPSProxyAgent from 'https-proxy-agent';
import * as HTTPProxyAgent from 'http-proxy-agent';

let agent: https.Agent;
const configInfo = { region: process.env.awsRegion };

let httpsInstance: https.Agent = new https.Agent();
let httpInstance: http.Agent = new http.Agent();

if (process.env.LOCAL_HTTP_PROXY) {
  console.log("Using proxy: " + process.env.LOCAL_HTTP_PROXY)
  httpsInstance = new HTTPSProxyAgent.HttpsProxyAgent(process.env.LOCAL_HTTP_PROXY);
  httpInstance = new HTTPProxyAgent.HttpProxyAgent(process.env.LOCAL_HTTP_PROXY);
  const config = { ...configInfo, httpOptions: { agent: httpsInstance } };
} else if (process.env.IS_OFFLINE) {
  httpInstance = new http.Agent();
}



export const httpsAgent = httpsInstance;
export const httpAgent = httpInstance;

