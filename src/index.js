// src/worker.js (o src/index.js si así se llama tu archivo)

import { ChatRoom } from './chatRoom'; // Importa la clase que crearemos

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    // Ruta WebSocket: /chat/{token}
    if (pathSegments.length === 2 && pathSegments[0] === 'chat') {
      const chatToken = pathSegments[1];
      if (!chatToken) {
        return new Response("Chat token required: /chat/{token}", { status: 400 });
      }
      // Obtiene ID y stub del Durable Object
      const id = env.CHAT_ROOM.idFromName(chatToken);
      const stub = env.CHAT_ROOM.get(id);
      // Reenvía la petición al DO
      return stub.fetch(request);
    }
    return new Response("Not found. Use /chat/{token}", { status: 404 });
  }
};
// Exporta la clase DO para que Wrangler la encuentre
export { ChatRoom };