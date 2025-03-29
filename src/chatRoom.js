// src/chatRoom.js

export class ChatRoom {
    constructor(state, env) {
      this.state = state;
      this.env = env;
      this.sessions = [];
      this.messageHistory = [];
      this.maxHistory = 50;
      // Carga historial al iniciar
      this.state.blockConcurrencyWhile(async () => {
        this.messageHistory = await this.state.storage.get('messageHistory') || [];
      });
    }
  
    async fetch(request) {
      const upgradeHeader = request.headers.get('Upgrade');
      if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }
      const [client, server] = Object.values(new WebSocketPair());
      await this.handleSession(server);
      return new Response(null, { status: 101, webSocket: client });
    }
  
    async handleSession(webSocket) {
      webSocket.accept();
      this.sessions.push(webSocket);
      webSocket.send(JSON.stringify({ type: 'history', payload: this.messageHistory }));
  
      webSocket.addEventListener('message', async event => {
        try {
          const messageData = JSON.parse(event.data);
          if (!messageData.user || (!messageData.content && !messageData.image)) { throw new Error("Invalid message"); }
          if (messageData.image && messageData.image.length > 1024 * 1024 * 1) { throw new Error("Image too large (~1MB max)"); }
  
          messageData.timestamp = new Date().toISOString();
          this.messageHistory.unshift(messageData);
          if (this.messageHistory.length > this.maxHistory) { this.messageHistory.pop(); }
          this.state.storage.put('messageHistory', this.messageHistory); // Guarda persistentemente
          this.broadcast(JSON.stringify({ type: 'message', payload: messageData }));
        } catch (error) {
          console.error("Message processing error:", error.message);
          webSocket.send(JSON.stringify({ type: 'error', payload: `Error: ${error.message}` }));
        }
      });
  
      const closeOrErrorHandler = () => { this.removeSession(webSocket); };
      webSocket.addEventListener('close', closeOrErrorHandler);
      webSocket.addEventListener('error', closeOrErrorHandler);
    }
  
    broadcast(message) {
      this.sessions = this.sessions.filter(session => {
        try { session.send(message); return true; }
        catch (err) { return false; } // Sesión muerta, la eliminamos
      });
    }
  
    removeSession(webSocket) {
      this.sessions = this.sessions.filter(session => session !== webSocket);
    }
  }