import { PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBClient } from '../config/dynamodb.config';

export class DynamoDBUtils {
  /**
   * Put item into DynamoDB table
   */
  static async put(tableName: string, item: any): Promise<void> {
    const command = new PutCommand({
      TableName: tableName,
      Item: item,
    });
    await dynamoDBClient.send(command);
  }

  /**
   * Get item from DynamoDB table
   */
  static async get<T>(tableName: string, key: any): Promise<T | null> {
    const command = new GetCommand({
      TableName: tableName,
      Key: key,
    });
    const result = await dynamoDBClient.send(command);
    return result.Item as T | null;
  }

  /**
   * Update item in DynamoDB table
   */
  static async update(
    tableName: string,
    key: any,
    updates: Record<string, any>,
    returnValues: 'ALL_NEW' | 'ALL_OLD' | 'UPDATED_NEW' | 'UPDATED_OLD' = 'ALL_NEW'
  ): Promise<any> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.keys(updates).forEach((field, index) => {
      const placeholder = `#field${index}`;
      const valuePlaceholder = `:value${index}`;
      updateExpressions.push(`${placeholder} = ${valuePlaceholder}`);
      expressionAttributeNames[placeholder] = field;
      expressionAttributeValues[valuePlaceholder] = updates[field];
    });

    const command = new UpdateCommand({
      TableName: tableName,
      Key: key,
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: returnValues,
    });

    const result = await dynamoDBClient.send(command);
    return result.Attributes;
  }

  /**
   * Delete item from DynamoDB table
   */
  static async delete(tableName: string, key: any): Promise<void> {
    const command = new DeleteCommand({
      TableName: tableName,
      Key: key,
    });
    await dynamoDBClient.send(command);
  }

  /**
   * Query items from DynamoDB table
   */
  static async query<T>(
    tableName: string,
    keyConditionExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>,
    indexName?: string,
    limit?: number
  ): Promise<T[]> {
    const command = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      IndexName: indexName,
      Limit: limit,
    });

    const result = await dynamoDBClient.send(command);
    return (result.Items || []) as T[];
  }

  /**
   * Scan items from DynamoDB table
   */
  static async scan<T>(tableName: string, filterExpression?: string, expressionAttributeValues?: Record<string, any>): Promise<T[]> {
    const command = new ScanCommand({
      TableName: tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    const result = await dynamoDBClient.send(command);
    return (result.Items || []) as T[];
  }

  /**
   * Generate a unique ID with prefix
   */
  static generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get current ISO timestamp
   */
  static getTimestamp(): string {
    return new Date().toISOString();
  }
}


