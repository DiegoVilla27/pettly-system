import { startNotificationWorker } from '@pettly/notifications-runtime';
async function bootstrap() {
  const stop = await startNotificationWorker();
  process.stdout.write(
    JSON.stringify({ level: 'info', event: 'notification_worker_started' }) +
      '\n',
  );
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    await stop();
    process.exit(0);
  };
  process.once('SIGTERM', () => void shutdown());
  process.once('SIGINT', () => void shutdown());
}
void bootstrap();
