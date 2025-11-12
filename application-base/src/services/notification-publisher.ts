// application-base/src/services/notification-publisher.ts
import PgBoss from 'pg-boss';
import { env } from '@/lib/env'; // Assuming env is available for DATABASE_URL

let boss: PgBoss | null = null;

/**
 * Initializes and returns a singleton instance of PgBoss.
 * Configures PgBoss to use the public schema with default prefixing.
 */
export async function getNotificationPublisher(): Promise<PgBoss> {
  if (!boss) {
    boss = new PgBoss({
      connectionString: env.DATABASE_URL,
      schema: 'public', // pg-boss tables will be prefixed with pgboss_ in the public schema
    });

    // Start the boss instance. This connects to the database and ensures schema is up-to-date.
    // It's important to call start() before sending or working on jobs.
    await boss.start();
    console.log('PgBoss initialized and started for NotificationPublisher.');
  }
  return boss;
}

// Placeholder for the publishNotificationEvent method (to be implemented in T04.2)
// export async function publishNotificationEvent(eventName: string, channel: string, payload: any) {
//   const publisher = await getNotificationPublisher();
//   // Logic to insert into notification_events and send job via pg-boss
// }
