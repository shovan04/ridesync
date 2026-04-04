import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

const db = drizzle({
  connection: {
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
  },
  schema, // 🔥 important
});

export default db;