import axios from 'axios';
import log from '../utils/logger.js';
import { headers } from '../config/headers.js';
import { newAgent } from '../utils/proxyAgent.js';

export async function getQuestsList(token, proxy = null) {
  const maxRetries = 5;
  let retries = 0;
  const agent = newAgent(proxy)

  log.info("Fetching quests list", '', true);
  while (retries < maxRetries) {
    try {
      const response = await axios.get("https://api.mygate.network/api/front/achievements/ambassador", {
        headers: {
          ...headers,
          "Authorization": `Bearer ${token}`,
        },
        agent: agent,
      });
      const uncompletedIds = response.data.data.items
        .filter(item => item.status === "UNCOMPLETED")
        .map(item => item._id);
      log.success("Quests fetched", `${uncompletedIds.length} uncompleted`);
      return uncompletedIds;
    } catch (error) {
      retries++;
      if (retries < maxRetries) {
        log.warn(`Fetch attempt ${retries}/${maxRetries} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      } else {
        log.error("Failed to fetch quests", error.message);
        return { error: error.message };
      }
    }
  }
}

export async function submitQuest(token, proxy = null, questId) {
  const maxRetries = 5;
  let retries = 0;
  const agent = newAgent(proxy)

  log.info(`Submitting quest: ${questId}`, '', true);
  while (retries < maxRetries) {
    try {
      await axios.post(
        `https://api.mygate.network/api/front/achievements/ambassador/${questId}/submit?`,
        {},
        {
          headers: {
            ...headers,
            "Authorization": `Bearer ${token}`,
          },
          agent: agent,
        }
      );
      log.success("Quest submitted", questId);
      return true;
    } catch (error) {
      retries++;
      if (retries < maxRetries) {
        log.warn(`Submit attempt ${retries}/${maxRetries} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      } else {
        log.error("Quest submission failed", error.message);
        return false;
      }
    }
  }
}

export async function checkQuests(token, proxy = null) {
  const questsIds = await getQuestsList(token, proxy);

  if (questsIds && questsIds.length > 0) {
    log.info(`Processing ${questsIds.length} uncompleted quests`);
    for (const questId of questsIds) {
      await submitQuest(token, proxy, questId);
    }
  }
}
