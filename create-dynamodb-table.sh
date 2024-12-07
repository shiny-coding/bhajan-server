#!/bin/bash

# Check if table exists
if aws dynamodb describe-table --table-name bhajans --endpoint-url http://localhost:8005 2>/dev/null; then
    echo "Table bhajans already exists"
else
    echo "Creating bhajans table..."
    aws dynamodb create-table \
        --table-name bhajans \
        --attribute-definitions \
            AttributeName=author,AttributeType=S \
            AttributeName=title,AttributeType=S \
        --key-schema \
            AttributeName=author,KeyType=HASH \
            AttributeName=title,KeyType=RANGE \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --endpoint-url http://localhost:8005
    echo "Table created successfully"
fi 