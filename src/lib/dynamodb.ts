import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Load environment variables if running outside of a framework that does it automatically
// (e.g., in a standalone script, though Next.js usually handles this)
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const AWS_REGION = process.env.AWS_REGION || "us-east-1"; // Fallback to 'us-east-1' if not set

const client = new DynamoDBClient({ region: AWS_REGION });
const documentClient = DynamoDBDocumentClient.from(client);

export { documentClient };