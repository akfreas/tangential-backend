#!/usr/bin/env python3
import boto3
import os
import sys
import json
import subprocess
import argparse
import requests
import yaml
session = boto3.session.Session(region_name='us-east-1')


local_session = boto3.session.Session(region_name='localhost', aws_access_key_id='access-key', aws_secret_access_key='secret-key')

dynamodb_port = 8001

cloudformation = session.client('cloudformation')

def deploy_stage(stage, skip_message_upload):
    
    os.environ.update({'NO_MINIFY_JS': 'true'})
    deploy_handle = subprocess.Popen('node --max-old-space-size=8192 ./node_modules/serverless/bin/serverless.js deploy --stage %s' % stage, cwd="../", shell=True)
    deploy_handle.wait()

    if deploy_handle.returncode != 0:
        print(f"Deployment failed with exit code {deploy_handle.returncode}", file=sys.stderr)
        sys.exit(deploy_handle.returncode)  # Exit with the error code

if __name__ == '__main__':

    parser = argparse.ArgumentParser()
    parser.add_argument('--stage', help='Deploy stage', required=True)
    args = parser.parse_args()

    deploy_stage(args.stage, args.skip_message_upload)
