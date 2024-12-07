#!/bin/bash

# Set AWS credentials for local development
export AWS_ACCESS_KEY_ID='dummy'
export AWS_SECRET_ACCESS_KEY='dummy'
export AWS_DEFAULT_REGION='us-east-1'

# Start DynamoDB Local
java -Djava.library.path=/dynamodb_local/DynamoDBLocal_lib \
  -jar /dynamodb_local/DynamoDBLocal.jar \
  -sharedDb -port 8005 \
  -dbPath /data/dynamodb &

# Wait for DynamoDB to start
sleep 5

# Create table if it doesn't exist
/app/create-dynamodb-table.sh

# Start OpenSearch as opensearch-user
su opensearch-user -c '/opensearch/bin/opensearch' &

# Wait for services to be ready
sleep 10

# Start your application
yarn start 