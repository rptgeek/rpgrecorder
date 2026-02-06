import bcrypt from "bcrypt";
import { Pool } from "pg";

// Connection pool (reused across invocations)
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1, // Lambda should use minimal connections
      idleTimeoutMillis: 120000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

interface CognitoUserMigrationEvent {
  triggerSource: "UserMigration_Authentication" | "UserMigration_ForgotPassword";
  userName: string;
  request: {
    password?: string;
    userAttributes?: Record<string, string>;
  };
  response: {
    userAttributes?: { Name: string; Value: string }[] | null;
    finalUserStatus?: string;
    messageAction?: string;
    forceAliasCreation?: boolean;
  };
}

export async function handler(event: CognitoUserMigrationEvent): Promise<CognitoUserMigrationEvent> {
  console.log("Trigger source:", event.triggerSource);
  console.log("Username (email):", event.userName);

  const email = event.userName;

  try {
    const db = getPool();
    const result = await db.query(
      'SELECT id, email, name, password FROM "User" WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log("User not found in legacy database");
      throw new Error("User not found");
    }

    const user = result.rows[0];

    if (event.triggerSource === "UserMigration_Authentication") {
      // Validate password for sign-in
      const password = event.request.password;
      if (!password) {
        throw new Error("Password not provided");
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        console.log("Invalid password for user:", email);
        throw new Error("Invalid credentials");
      }

      console.log("Password validated, migrating user:", email);
    } else if (event.triggerSource === "UserMigration_ForgotPassword") {
      // Allow password reset for existing users
      console.log("Forgot password flow, migrating user:", email);
    }

    // Return user attributes for Cognito to create the user
    event.response = {
      userAttributes: [
        { Name: "email", Value: user.email },
        { Name: "email_verified", Value: "true" },
        { Name: "name", Value: user.name || "" },
        { Name: "custom:legacy_id", Value: user.id }, // PostgreSQL UUID for data mapping
      ],
      finalUserStatus: "CONFIRMED",
      messageAction: "SUPPRESS", // Don't send welcome email
      forceAliasCreation: false,
    };

    console.log("User migration successful:", email);
    return event;
  } catch (error) {
    console.error("Migration error:", error);
    throw error; // Cognito will show "Incorrect username or password"
  }
}
