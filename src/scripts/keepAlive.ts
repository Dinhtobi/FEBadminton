import axios from 'axios';

const RENDER_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:8080';
const PING_INTERVAL = parseInt(process.env.KEEP_ALIVE_INTERVAL || '840000');

const keepAlive = (): void => {
  console.log('🕐 Keep-alive started');
  console.log(`⏰ Interval: ${PING_INTERVAL}ms (${PING_INTERVAL / 1000}s)`);
  console.log(`🎯 Target URL: ${RENDER_URL}/api/health`);

  pingServer();
  setInterval(pingServer, PING_INTERVAL);
};

const pingServer = async (): Promise<void> => {
  const url = `${RENDER_URL}/api/health`;

  try {
    console.log(`📡 About to ping: ${url}`);
    const startTime = Date.now();
    const response = await axios.get(url, {
      timeout: 10000
    });
    const duration = Date.now() - startTime;
    console.log(`✅ Ping successful: ${new Date().toISOString()} | Status: ${response.status} | ${duration}ms`);
  } catch (error) {
    console.log(`❌ Failed URL was: ${url}`);
    if (axios.isAxiosError(error)) {
      console.error(`❌ Ping failed: ${error.message}`);
      console.error(`❌ Error config URL: ${error.config?.url}`);
    } else {
      console.error(`❌ Ping failed:`, error);
    }
  }
};

export default keepAlive;