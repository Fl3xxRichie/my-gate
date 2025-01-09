import { readFile } from './utils/fileReader.js';
import log from './utils/logger.js';
import bedduSalama from './utils/banner.js';
import { WebSocketClient } from './services/websocketClient.js';
import { registerNode, getUserNode } from './services/nodeService.js';
import { confirmUser, getUserInfo } from './services/userService.js';
import { checkQuests } from './services/questService.js';

async function main() {
  console.clear();
  console.log(bedduSalama);

  const tokens = readFile("tokens.txt");
  const proxies = readFile("proxy.txt");
  let proxyIndex = 0;

  log.info(`Starting MyGate Network Bot`, `${tokens.length} accounts loaded`);

  const activeClients = new Map(); // Store active WebSocket clients

  try {
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const proxy = proxies.length > 0 ? proxies[proxyIndex] : null;
      if (proxies.length > 0) {
        proxyIndex = (proxyIndex + 1) % proxies.length;
      }

      log.info(`Processing account #${i + 1}`, proxy ? `Using proxy: ${proxy}` : 'No proxy');
      
      // Validate token format
      if (!token || !token.trim()) {
        log.error(`Invalid token format for account #${i + 1}`);
        continue;
      }

      // Get user info first
      const userInfo = await getUserInfo(token, proxy);
      if (!userInfo) {
        log.error(`Skipping account #${i + 1} due to invalid token or user info fetch failure`);
        continue;
      }

      // Confirm referral
      await confirmUser(token, proxy);
      
      // Get or create node
      let nodes = await getUserNode(token, proxy);
      if (!nodes || nodes.length === 0) {
        const uuid = await registerNode(token, proxy);
        if (!uuid) {
          log.error(`Skipping account #${i + 1} due to node registration failure`);
          continue;
        }
        nodes = [uuid];
      }

      // Connect nodes
      const accountClients = [];
      for (const node of nodes) {
        const client = new WebSocketClient(token, proxy, node);
        client.connect();
        accountClients.push(client);
      }
      activeClients.set(token, accountClients);

      // Check quests
      await checkQuests(token, proxy);
      
      // Schedule periodic tasks for this account
      const userInfoInterval = setInterval(async () => {
        const updatedInfo = await getUserInfo(token, proxy);
        if (!updatedInfo) {
          log.error(`Account #${i + 1} may be invalid, stopping intervals`);
          clearInterval(userInfoInterval);
          clearInterval(questInterval);
          const clients = activeClients.get(token);
          if (clients) {
            clients.forEach(client => client.disconnect());
            activeClients.delete(token);
          }
        }
      }, 15 * 60 * 1000);

      const questInterval = setInterval(async () => {
        await checkQuests(token, proxy);
      }, 24 * 60 * 60 * 1000);

      // Add delay between accounts
      if (i < tokens.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    log.success("Bot initialization complete", "All accounts are running");

    // Global error handler
    process.on('uncaughtException', (error) => {
      log.error('Uncaught Exception:', error.message);
    });

    process.on('unhandledRejection', (reason, promise) => {
      log.error('Unhandled Rejection:', reason);
    });

    // Cleanup on exit
    process.on('SIGINT', () => {
      log.info('Shutting down...');
      activeClients.forEach((clients) => {
        clients.forEach(client => client.disconnect());
      });
      process.exit(0);
    });

  } catch (error) {
    log.error("Fatal error occurred", error.message);
  }
}

main();
