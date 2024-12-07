FROM node:18

WORKDIR /app

# Install Java and AWS CLI
RUN apt-get update && \
    apt-get install -y openjdk-17-jre-headless awscli

# Create non-root user for OpenSearch
RUN groupadd -g 1001 opensearch-user && \
    useradd -u 1001 -g opensearch-user opensearch-user

# Install DynamoDB Local
RUN curl -O https://s3.us-west-2.amazonaws.com/dynamodb-local/dynamodb_local_latest.tar.gz && \
    mkdir -p /dynamodb_local && \
    tar -xzf dynamodb_local_latest.tar.gz -C /dynamodb_local && \
    rm dynamodb_local_latest.tar.gz

# Install OpenSearch
RUN curl -O https://artifacts.opensearch.org/releases/bundle/opensearch/2.11.1/opensearch-2.11.1-linux-x64.tar.gz && \
    mkdir -p /opensearch && \
    tar -xzf opensearch-2.11.1-linux-x64.tar.gz -C /opensearch --strip-components=1 && \
    rm opensearch-2.11.1-linux-x64.tar.gz

# Create directories for persistence and set permissions
RUN mkdir -p /data/dynamodb /data/opensearch && \
    chown -R opensearch-user:opensearch-user /opensearch /data/opensearch

# Expose ports
EXPOSE 4000 8005 9200

# Configure OpenSearch
RUN echo "path.data: /data/opensearch" >> /opensearch/config/opensearch.yml && \
    echo "plugins.security.disabled: true" >> /opensearch/config/opensearch.yml && \
    echo "network.host: 0.0.0.0" >> /opensearch/config/opensearch.yml && \
    echo "discovery.type: single-node" >> /opensearch/config/opensearch.yml && \
    echo "logger.level: WARN" >> /opensearch/config/opensearch.yml

CMD ["./start.sh"]