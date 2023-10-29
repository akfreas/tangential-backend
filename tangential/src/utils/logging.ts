#!/usr/bin/env node

/* eslint-disable no-console */
function areWeUsingCI(): boolean {
  return process.env.CI === 'true';
}

function consoleLog(message: string, ...optionalParams: any[]): void {
  if (process.env.IS_OFFLINE) {
    console.log(`\x1b[32m${message}\x1b[0m`, ...optionalParams);
  } else {
    console.log(message, ...optionalParams);
  }
}

function consoleError(message: string, ...optionalParams: any[]): void {
  if (process.env.IS_OFFLINE) {
    console.error(`\x1b[31m${message}\x1b[0m`, ...optionalParams);
  } else {
    console.error(message, ...optionalParams);
  }
}

function consoleDebug(message: string, ...optionalParams: any[]): void {
  if (process.env.IS_OFFLINE) {
    console.debug(`\x1b[36m${message}\x1b[0m`, ...optionalParams);
  } else {
    console.debug(message, ...optionalParams);
  }
}

export function doDebug(message: any, ...optionalParams: any[]): void {
  if (areWeUsingCI()) {
    return;
  }
  if (process.env.enableDebugLogging === 'true') {
    let out = message;
    if (typeof message === 'object') {
      out = JSON.stringify(message, null, 2);
    }
    consoleDebug(out, JSON.stringify(optionalParams, null, 2));
  }
}

export function doLog(message: string, param?: any, ...optionalParams: any[]): void {
  if (!areWeUsingCI()) {
    const hasParam = param !== undefined;
    const hasOptionalParams = optionalParams.length > 0;

    if (hasParam && param instanceof Error) {
      consoleLog(message, hasOptionalParams ? JSON.stringify({ ...optionalParams }) : '', param);
    } else if (hasParam && typeof param === 'object') {
      const context = hasOptionalParams ? { context: optionalParams } : {};
      consoleLog(message, JSON.stringify({ ...param, context }));
    } else if (hasParam) {
      consoleLog(message, param, hasOptionalParams ? JSON.stringify({ ...optionalParams }) : '');
    } else {
      consoleLog(message);
    }
  }
}

export function doError(message: string, error: Error, ...optionalParams: any[]): Error {
  if (!areWeUsingCI()) {
    consoleError(message, JSON.stringify({ ...optionalParams }), error);
  }
  return new Error(`${message}, ${error}, ${JSON.stringify({ ...optionalParams })}`);
}

export function jsonLog(message: string, ...optionalParams: any[]): void {
  consoleLog(message, JSON.stringify(optionalParams, null, 2));
}
/* eslint-enable no-console */
