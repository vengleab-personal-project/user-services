import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { config } from './index';

// Create DynamoDB client
const client = new DynamoDBClient({
  region: config.aws.region,
  credentials: config.aws.accessKeyId && config.aws.secretAccessKey
    ? {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      }
    : undefined,
});

// Create document client for easier operations
export const dynamoDBClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

// Table names
export const TableNames = {
  Users: `${config.aws.dynamoDBTablePrefix}-users`,
  Forms: `${config.aws.dynamoDBTablePrefix}-forms`,
  Subscriptions: `${config.aws.dynamoDBTablePrefix}-subscriptions`,
  Usage: `${config.aws.dynamoDBTablePrefix}-usage`,
  Policies: `${config.aws.dynamoDBTablePrefix}-policies`,
  Sessions: `${config.aws.dynamoDBTablePrefix}-sessions`,
};


