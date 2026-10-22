import { createApp } from './app.js';
import { config } from './config.js';
import { getProvider } from './services/ai/index.js';

const app = createApp();

const server = app.listen(config.port, () => {
  const provider = getProvider();
  console.log(`Eventra AI API listening on http://localhost:${config.port} (${config.nodeEnv})`);
  console.log(`CORS origins: ${config.clientOrigins.join(', ') || '(none)'}`);
  console.log(`AI model: ${provider.model}`);
  if (!provider.configured) {
    console.warn(
      'GEMINI_API_KEY is not set. AI endpoints will serve results from the built-in local template engine (source: "local").',
    );
  }
});

function shutdown(signal: string): void {
  console.log(`\nReceived ${signal}. Shutting down...`);
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
