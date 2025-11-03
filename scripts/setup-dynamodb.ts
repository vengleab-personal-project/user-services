/**
 * DynamoDB Table Setup Script
 * 
 * This script creates the required DynamoDB tables with proper indexes.
 * Run with: npx tsx scripts/setup-dynamodb.ts
 */

import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { config } from '../src/config';

const client = new DynamoDBClient({
  region: config.aws.region,
  credentials: config.aws.accessKeyId && config.aws.secretAccessKey
    ? {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      }
    : undefined,
});

const tables = [
  {
    name: `${config.aws.dynamoDBTablePrefix}-users`,
    schema: {
      TableName: `${config.aws.dynamoDBTablePrefix}-users`,
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' },
        { AttributeName: 'email', AttributeType: 'S' },
        { AttributeName: 'oauthProvider', AttributeType: 'S' },
        { AttributeName: 'oauthId', AttributeType: 'S' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'EmailIndex',
          KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        },
        {
          IndexName: 'OAuthIndex',
          KeySchema: [
            { AttributeName: 'oauthProvider', KeyType: 'HASH' },
            { AttributeName: 'oauthId', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        },
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
    },
  },
  {
    name: `${config.aws.dynamoDBTablePrefix}-forms`,
    schema: {
      TableName: `${config.aws.dynamoDBTablePrefix}-forms`,
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' },
        { AttributeName: 'userId', AttributeType: 'S' },
        { AttributeName: 'createdAt', AttributeType: 'S' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'UserIdIndex',
          KeySchema: [
            { AttributeName: 'userId', KeyType: 'HASH' },
            { AttributeName: 'createdAt', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        },
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
    },
  },
  {
    name: `${config.aws.dynamoDBTablePrefix}-subscriptions`,
    schema: {
      TableName: `${config.aws.dynamoDBTablePrefix}-subscriptions`,
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' },
        { AttributeName: 'userId', AttributeType: 'S' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'UserIdIndex',
          KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        },
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
    },
  },
  {
    name: `${config.aws.dynamoDBTablePrefix}-usage`,
    schema: {
      TableName: `${config.aws.dynamoDBTablePrefix}-usage`,
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
    },
  },
  {
    name: `${config.aws.dynamoDBTablePrefix}-policies`,
    schema: {
      TableName: `${config.aws.dynamoDBTablePrefix}-policies`,
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' },
        { AttributeName: 'userId', AttributeType: 'S' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'UserIdIndex',
          KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        },
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
    },
  },
  {
    name: `${config.aws.dynamoDBTablePrefix}-sessions`,
    schema: {
      TableName: `${config.aws.dynamoDBTablePrefix}-sessions`,
      KeySchema: [
        { AttributeName: 'PK', KeyType: 'HASH' },
        { AttributeName: 'SK', KeyType: 'RANGE' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'PK', AttributeType: 'S' },
        { AttributeName: 'SK', AttributeType: 'S' },
        { AttributeName: 'tokenHash', AttributeType: 'S' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'TokenHashIndex',
          KeySchema: [{ AttributeName: 'tokenHash', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        },
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
    },
  },
];

async function tableExists(tableName: string): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
}

async function createTable(tableConfig: any) {
  const exists = await tableExists(tableConfig.name);
  
  if (exists) {
    console.log(`✓ Table ${tableConfig.name} already exists`);
    return;
  }

  console.log(`Creating table ${tableConfig.name}...`);
  
  try {
    await client.send(new CreateTableCommand(tableConfig.schema));
    console.log(`✓ Table ${tableConfig.name} created successfully`);
  } catch (error: any) {
    console.error(`✗ Failed to create table ${tableConfig.name}:`, error.message);
    throw error;
  }
}

async function setupTables() {
  console.log('\n🚀 Setting up DynamoDB tables...\n');
  console.log(`Region: ${config.aws.region}`);
  console.log(`Table Prefix: ${config.aws.dynamoDBTablePrefix}\n`);

  for (const table of tables) {
    await createTable(table);
  }

  console.log('\n✅ All tables setup complete!\n');
  console.log('Note: It may take a few moments for tables to become active.');
  console.log('You can check the status in the AWS DynamoDB console.\n');
}

// Run the setup
setupTables()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });


