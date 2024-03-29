import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { httpsAgent } from "../config/config";
import { TangentialHTTPRequestError } from "../models/errors/TangentialHTTPRequestError";
import { JiraRequestAuth } from "@akfreas/tangential-core";

export const axiosInstance = axios.create({ httpsAgent });

interface ProcessErrorParams {
  method: string;
  url: string;
  params: any;
  error: any;
}

export function processError({
  method,
  url,
  params,
  error,
}: ProcessErrorParams): Promise<never> {
  const headers = error.response ? error.response.headers : undefined;
  return Promise.reject(
    new TangentialHTTPRequestError(
      `error on ${method}`,
      error,
      url,
      params,
      headers,
    ),
  );
}

interface JsonPostParams {
  url: string;
  headers?: any;
  params?: any;
  data?: any;
}

export function extractAtlassianHeaders(headers: any): JiraRequestAuth {
  const accessToken = headers["x-atlassian-token"];
  const atlassianWorkspaceId = headers["x-atlassian-workspace-id"];
  const refreshToken = headers["x-atlassian-refresh-token"];

  if (!accessToken) {
    throw new Error("No access token provided");
  }

  if (!atlassianWorkspaceId) {
    throw new Error("No Atlassian Workspace ID provided");
  }

  if (!refreshToken) {
    throw new Error("No refresh token provided");
  }

  return { accessToken, atlassianWorkspaceId, refreshToken };
}

export async function jsonPost({
  url,
  headers = {},
  ...params
}: JsonPostParams): Promise<any> {
  const jsonHeaders = { "Content-Type": "application/json", ...headers };
  const px: AxiosRequestConfig = {
    method: "post",
    url,
    params: params.params,
    data: params.data,
    headers: jsonHeaders,
  };

  try {
    const response: AxiosResponse = await axiosInstance(px);
    return Promise.resolve(response.data);
  } catch (error) {
    return processError({
      method: "post",
      url,
      params,
      error,
    });
  }
}

interface JsonGetParams {
  url: string;
  params?: any;
  headers?: any;
}

export async function jsonGet({ url, ...params }: JsonGetParams): Promise<any> {
  const px: AxiosRequestConfig = {
    method: "get",
    url,
    ...params,
  };

  try {
    const { data } = await axiosInstance(px);
    return data;
  } catch (error) {
    return processError({
      method: "get",
      url,
      params,
      error,
    });
  }
}

interface JsonPatchParams {
  url: string;
  data: any;
  params?: any;
  headers?: any;
}

export async function jsonPatch({
  url,
  data,
  ...params
}: JsonPatchParams): Promise<any> {
  const px: AxiosRequestConfig = {
    method: "patch",
    url,
    data,
    ...params,
  };

  try {
    const response: AxiosResponse = await axiosInstance(px);
    return response.data;
  } catch (error) {
    return Promise.reject(
      new TangentialHTTPRequestError(
        "error patching",
        error,
        url,
        data,
        params,
      ),
    );
  }
}
