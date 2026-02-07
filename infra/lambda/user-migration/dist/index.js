"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const bcrypt_1 = __importDefault(require("bcrypt"));
const pg_1 = require("pg");
// Connection pool (reused across invocations)
let pool = null;
function getPool() {
    if (!pool) {
        pool = new pg_1.Pool({
            connectionString: process.env.DATABASE_URL,
            max: 1, // Lambda should use minimal connections
            idleTimeoutMillis: 120000,
            connectionTimeoutMillis: 10000,
        });
    }
    return pool;
}
async function handler(event) {
    console.log("Trigger source:", event.triggerSource);
    console.log("Username (email):", event.userName);
    const email = event.userName;
    try {
        const db = getPool();
        const result = await db.query('SELECT id, email, name, password FROM "User" WHERE email = $1', [email]);
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
            const isValid = await bcrypt_1.default.compare(password, user.password);
            if (!isValid) {
                console.log("Invalid password for user:", email);
                throw new Error("Invalid credentials");
            }
            console.log("Password validated, migrating user:", email);
        }
        else if (event.triggerSource === "UserMigration_ForgotPassword") {
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
    }
    catch (error) {
        console.error("Migration error:", error);
        throw error; // Cognito will show "Incorrect username or password"
    }
}
