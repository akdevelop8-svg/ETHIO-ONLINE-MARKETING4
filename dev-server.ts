import { getEomApp, flushEomWrites } from './src/server/eomApp.js';
import { pool, requestLockPool } from './src/db/pg.js';

const parsedPort = Number.parseInt(process.env.PORT || '3000', 10);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3000;

getEomApp()
  .then((app) => {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log('EOM Server running on port ' + port + ' [Mode: ' + (process.env.NODE_ENV || 'development') + ']');
    });

    const shutdown = (signal: string) => {
      console.log('\\nReceived ' + signal + '. Initiating EOM graceful shutdown...');
      server.close(() => {
        void (async () => {
          try {
            await flushEomWrites();
          } catch (error: any) {
            console.error('Failed to flush pending database writes:', error?.message || error);
          }
          await Promise.all([
            pool?.end().catch((error) => console.error('PostgreSQL pool shutdown failed:', error?.message || error)),
            requestLockPool?.end().catch((error) => console.error('Request-lock pool shutdown failed:', error?.message || error))
          ]);
          process.exit(0);
        })();
      });
    };

    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((error: any) => {
    console.error('EOM startup failed:', error?.message || error);
    process.exitCode = 1;
  });
