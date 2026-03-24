import "dotenv/config";

if (!process.env.DATABASE_URL && process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "integration-test-secret";
}
