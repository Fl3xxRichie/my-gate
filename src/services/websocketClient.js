import WebSocket from 'ws';
import log from '../utils/logger.js';
import { newAgent } from '../utils/proxyAgent.js';

export class WebSocketClient {
  constructor(token, proxy = null, uuid, reconnectInterval = 5000) {
    this.token = token;
    this.proxy = proxy;
    this.socket = null;
    this.reconnectInterval = reconnectInterval;
    this.shouldReconnect = true;
    this.agent = newAgent(proxy);
    this.uuid = uuid;
    this.url = `wss://api.mygate.network/socket.io/?nodeId=${this.uuid}&EIO=4&transport=websocket`;
    this.regNode = `40{ "token":"Bearer ${this.token}"}`;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.connected = false;
  }

  async connect() {
    if (!this.uuid || !this.url) {
      log.error("Cannot connect: Node is not registered.");
      return;
    }

    if (this.retryCount >= this.maxRetries) {
      log.error(`Max reconnection attempts (${this.maxRetries}) reached for node ${this.uuid}`);
      this.shouldReconnect = false;
      return;
    }

    try {
      log.info(`Connecting to node: ${this.uuid}`, '', true);
      
      // Create WebSocket with timeout
      this.socket = new WebSocket(this.url, {
        agent: this.agent,
        handshakeTimeout: 10000, // 10 seconds timeout
        timeout: 10000
      });

      this.socket.onopen = async () => {
        this.connected = true;
        this.retryCount = 0; // Reset retry count on successful connection
        log.success(`Node connected`, this.uuid);
        await new Promise(resolve => setTimeout(resolve, 3000));
        this.reply(this.regNode);
      };

      this.socket.onmessage = (event) => {
        if (event.data === "2" || event.data === "41") {
          this.socket.send("3");
        } else {
          log.debug(`Node message`, `${this.uuid}: ${event.data}`);
        }
      };

      this.socket.onclose = () => {
        this.connected = false;
        if (!this.shouldReconnect) {
          log.warn(`Node connection closed`, this.uuid);
          return;
        }
        
        this.retryCount++;
        if (this.retryCount < this.maxRetries) {
          log.warn(`Node disconnected (attempt ${this.retryCount}/${this.maxRetries})`, this.uuid);
          log.info(`Reconnecting node in ${this.reconnectInterval / 1000}s`, this.uuid);
          setTimeout(() => this.connect(), this.reconnectInterval);
        } else {
          log.error(`Max reconnection attempts reached for node ${this.uuid}`);
          this.shouldReconnect = false;
        }
      };

      this.socket.onerror = (error) => {
        log.error(`WebSocket error: ${this.uuid}`, error.message);
        if (this.socket) {
          this.socket.close();
        }
      };

    } catch (error) {
      log.error(`Connection error: ${this.uuid}`, error.message);
      this.retryCount++;
      if (this.shouldReconnect && this.retryCount < this.maxRetries) {
        setTimeout(() => this.connect(), this.reconnectInterval);
      }
    }
  }

  reply(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(String(message));
        log.debug("Node reply", message);
      } catch (error) {
        log.error(`Failed to send message: ${error.message}`);
      }
    } else {
      log.error("Cannot send message; WebSocket is not open.");
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.socket) {
      try {
        this.socket.close();
      } catch (error) {
        log.error(`Error closing socket: ${error.message}`);
      }
    }
  }

  isConnected() {
    return this.connected && this.socket?.readyState === WebSocket.OPEN;
  }
}
