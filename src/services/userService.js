import axios from 'axios';
import log from '../utils/logger.js';
import { headers } from '../config/headers.js';
import { newAgent } from '../utils/proxyAgent.js';

export async function confirmUser(token, proxy = null) {
  const agent = newAgent(proxy);
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      log.info("Confirming user referral", '', true);
      await axios.post(
        "https://api.mygate.network/api/front/referrals/referral/LfBWAQ?",
        {},
        {
          headers: {
            ...headers,
            "Authorization": `Bearer ${token}`,
          },
          agent: agent,
        }
      );
      log.success("User referral confirmed");
      return true;
    } catch (error) {
      retries++;
      if (error.response?.status === 400) {
        log.info("Referral already confirmed or not needed");
        return true;
      }
      if (retries < maxRetries) {
        log.warn(`Referral confirmation attempt ${retries}/${maxRetries} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        log.error("Referral confirmation failed", error.message);
        return false;
      }
    }
  }
}

export async function getUserInfo(token, proxy = null) {
  const maxRetries = 5;
  let retries = 0;
  const agent = newAgent(proxy)

  log.info("Fetching user info", '', true);
  while (retries < maxRetries) {
    try {
      const response = await axios.get("https://api.mygate.network/api/front/users/me", {
        headers: {
          ...headers,
          "Authorization": `Bearer ${token}`,
        },
        agent: agent,
        validateStatus: status => status < 500 // Accept any status code less than 500
      });

      if (response.status === 401) {
        log.error("Invalid or expired token");
        return null;
      }

      if (!response.data?.data) {
        log.error("Invalid response format", JSON.stringify(response.data));
        return null;
      }

      const userData = response.data.data;
      const userInfo = {
        name: userData.name || 'Unknown',
        status: userData.status || 'Unknown',
        _id: userData._id || 'Unknown',
        level: userData.levels?.[0]?.name || 'Unknown',
        points: userData.currentPoint || 0
      };

      log.success("User info fetched", userInfo);
      return userInfo;
    } catch (error) {
      retries++;
      const errorMessage = error.response?.data?.message || error.message;
      
      if (error.response?.status === 401) {
        log.error("Invalid or expired token", errorMessage);
        return null;
      }

      if (retries < maxRetries) {
        log.warn(`Fetch attempt ${retries}/${maxRetries} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        log.error("Failed to fetch user info", errorMessage);
        return null;
      }
    }
  }
  return null;
}
