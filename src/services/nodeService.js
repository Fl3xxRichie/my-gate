import axios from 'axios';
import { randomUUID } from 'crypto';
import log from '../utils/logger.js';
import { headers } from '../config/headers.js';
import { newAgent } from '../utils/proxyAgent.js';

export async function registerNode(token, proxy = null) {
  const agent = newAgent(proxy)
  const maxRetries = 5;
  let retries = 0;
  const uuid = randomUUID();
  const activationDate = new Date().toISOString();
  const payload = {
    id: uuid,
    status: "Good",
    activationDate: activationDate,
  };

  log.info("Registering new node", '', true);
  while (retries < maxRetries) {
    try {
      const response = await axios.post(
        "https://api.mygate.network/api/front/nodes",
        payload,
        {
          headers: {
            ...headers,
            "Authorization": `Bearer ${token}`,
          },
          agent: agent,
        }
      );

      log.success("Node registration successful", uuid);
      return uuid;
    } catch (error) {
      retries++;
      if (retries < maxRetries) {
        log.warn(`Registration attempt ${retries}/${maxRetries} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      } else {
        log.error("Node registration failed", error.message);
        return null;
      }
    }
  }
}

export async function getUserNode(token, proxy = null) {
  const maxRetries = 5;
  let retries = 0;
  const agent = newAgent(proxy)

  log.info("Fetching user nodes", '', true);
  while (retries < maxRetries) {
    try {
      const response = await axios.get(
        "https://api.mygate.network/api/front/nodes?limit=10&page=1",
        {
          headers: {
            ...headers,
            "Authorization": `Bearer ${token}`,
          },
          agent: agent,
        }
      );
      const nodes = response.data.data.items.map(item => item.id);
      log.success("Nodes fetched", `${nodes.length} active nodes`);
      return nodes;
    } catch (error) {
      retries++;
      if (retries < maxRetries) {
        log.warn(`Fetch attempt ${retries}/${maxRetries} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      } else {
        log.error("Failed to fetch nodes", error.message);
        return [];
      }
    }
  }
}
