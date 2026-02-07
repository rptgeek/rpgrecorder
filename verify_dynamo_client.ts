import { docClient, DYNAMODB_TABLE_NAME, dynamoClient } from './src/lib/aws/dynamo';

async function verify() {
    console.log("DynamoDB Table Name:", DYNAMODB_TABLE_NAME);
    // @ts-ignore
    console.log("Region:", await dynamoClient.config.region());
    
    if (docClient) {
        console.log("Document Client initialized.");
    }
}

verify().catch(console.error);
