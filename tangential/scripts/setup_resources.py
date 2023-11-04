#!/usr/bin/env python3

import boto3
import pdb as ipdb
import argparse
import os
import chevron
import json

from botocore.config import Config
from pathlib import Path

import yaml
import json
from pprint import pprint

from cfn_flip import flip, to_yaml, to_json



config = Config(region_name=os.environ.get('awsRegion', 'us-east-1'), proxies={'http': 'localhost:8081'})

def update_secrets_from_files(ssm, secrets_manager, stage):

    with open('./ssm_params.json') as ssm_json:
        ssm_params = json.load(ssm_json)

    for param in ssm_params:
        try:
            param_name = '/truffle/%s/%s' % (stage, param['Name'])
            if args.delete_resources:
                try:
                    ssm.delete_parameter(Name=param_name)
                    print('deleted param %s' % param_name)
                except:
                    print('could not delete param %s' % param_name)
                    pass
            param['Name'] = param_name
            ssm.put_parameter(**param, Type='SecureString', Overwrite=True)
            print('set param %s' % param_name)
        except Exception as e:
            print('did not create param %s' % param['Name'], e)


    with open('./app_secrets.json') as secrets_json:
        secrets = json.load(secrets_json)

    for secret in secrets:
        try:
            secret_name = f"/truffle/{stage}/{secret['Name']}"
            if args.delete_resources:
                try:
                    secrets_manager.delete_secret(SecretId=secret_name, ForceDeleteWithoutRecovery=True)
                except:
                    pass
            secrets_manager.create_secret(Name=secret_name, SecretString=secret['Value'])
            print(f"set secret {secret_name}")
        except Exception as e:
            print(f"did not create secret {secret['Name']}", e)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    localstack_address = 'http://0.0.0.0:4566'
    parser.add_argument('--stage', required=True)
    parser.add_argument('--delete_resources', action='store_true', default=False) 
    parser.add_argument('--load_ssm_and_secrets', required=False, default=False)
    parser.add_argument('--dynamodb_endpoint', default='http://0.0.0.0:4566')
    args = parser.parse_args()
    print(args)
    stage = args.stage
    sqs = boto3.resource('sqs', config=config, endpoint_url=localstack_address)
    s3 = boto3.resource('s3', config=config, endpoint_url=localstack_address)
    dynamodb = boto3.resource('dynamodb', config=config, endpoint_url=args.dynamodb_endpoint)
    ssm = boto3.client('ssm', config=config, endpoint_url=localstack_address)
    secrets_manager = boto3.client('secretsmanager', config=config, endpoint_url=localstack_address)

    update_secrets_from_files(ssm, secrets_manager, stage)

    buckets = []


    with open('../serverless.yml') as f:
        output = to_json(f.read())

    tx = json.loads(output)['resources']['Resources']
    tables = []
    queues = []
    [{x: tx[x]} for x in tx if tx[x]['Type'] == 'AWS::DynamoDB::Table']
    for x in tx:
        if tx[x]['Type'] == 'AWS::DynamoDB::Table':
            tx[x]['Properties']['TableName'] = x + '-' + stage
            allowed_keys = ['AttributeDefinitions', 'TableName',
                            'KeySchema', 'LocalSecondaryIndexes', 'GlobalSecondaryIndexes', 
                            'BillingMode', 'ProvisionedThroughput', 'StreamSpecification', 
                            'SSESpecification', 'Tags']

            filtered = {k: v for k, v in tx[x]['Properties'].items() if k in allowed_keys}
            with open('./dynamotables/%s.json' % x, 'w') as f:
                json.dump(filtered, f, indent=4, sort_keys=True)
            tables.append(filtered)
        if tx[x]['Type'] == 'AWS::SQS::Queue':
            queue_name = tx[x]['Properties']['QueueName'].replace('${self:provider.stage}', stage)
            fifo_attrs = {'Attributes': {'FifoQueue': 'true', 'ContentBasedDeduplication': 'true'}} if tx[x]['Properties'].get('FifoQueue', False) else {}
            queues.append({'QueueName': queue_name, **fifo_attrs })


    for queue in queues:
        queue_resource = sqs.create_queue(**queue)
        queue_resource.purge()
        print('created queue %s and purged' % queue['QueueName'])


    for table in tables:
        database_name = table['TableName']
        try:
            if args.delete_resources:
                try:
                    dynamodb.Table(database_name).delete()
                    print('deleted table %s' % database_name)
                except Exception as err:
                    print('could not delete table %s' % database_name, err)
            dynamodb.create_table(**table)
            print('created table %s' % database_name)
        except Exception as err:
            print('did not create table %s' % database_name, err)
    for bucket in buckets:
        try:
            resp = s3.Bucket(bucket).objects.all().delete()
            print('Deleted bucket', bucket)
        except:
            print('Could not delete bucket %s' % bucket)
        try:
            s3.create_bucket(Bucket=bucket, CreateBucketConfiguration={'LocationConstraint': config.region_name})
            print('Created bucket', bucket)
        except Exception as err:
            print('Could not create bucket %s' % bucket, err)
