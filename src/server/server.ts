import { WebSocketServer, WebSocket, RawData } from 'ws';
import { randomUUID } from 'crypto';
import 'dotenv/config';
import { OfferMsg, AcceptMsg, PayMsg, ChatMsg, InvoiceMsg, AnyMsg } from '../protocol/messages';
import { 
  validateOffer, 
  validateAccept, 
  validatePayment, 
  createInvoice, 
  completeInvoice, 
  getInvoice,
  cleanupExpiredInvoices
} from '../negotiation/rules';

// Server configuration
const PORT = Number(process.env.WS_PORT) || 9000;
const PING_INTERVAL = 30000; // 30 seconds
const CLEANUP_INTERVAL = 300000; // 5 minutes

// Helper function to generate short IDs (replacement for nanoid)
const generateShortId = (): string => {
  return randomUUID().replace(/-/g, '').substring(0, 6);
};

// Create WebSocket server
const wss = new WebSocketServer({ 
  port: PORT,
  clientTracking: true 
});

// Track clients with metadata
const clients = new Map<WebSocket, { id: string, isAlive: boolean, address?: string }>();

// Store active offers by ID
const activeOffers = new Map<string, OfferMsg>();

// Heartbeat to detect disconnected clients
const heartbeat = () => {
  for (const [ws, client] of clients.entries()) {
    if (!client.isAlive) {
      console.log(`⚠️  Client ${client.id} timed out`);
      clients.delete(ws);
      ws.terminate();
      continue;
    }
    client.isAlive = false;
    ws.ping();
  }
};

// Start heartbeat interval
const interval = setInterval(heartbeat, PING_INTERVAL);

// Start cleanup interval for expired invoices
const cleanupInterval = setInterval(cleanupExpiredInvoices, CLEANUP_INTERVAL);

// Broadcast message to all connected clients
const broadcast = (message: AnyMsg | string, sender?: WebSocket) => {
  const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
  
  for (const [ws, client] of clients.entries()) {
    if (ws !== sender && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(messageStr);
      } catch (error) {
        console.error(`Error broadcasting to ${client.id}:`, error);
      }
    }
  }
};

// Send message to a specific client by address
const sendToAddress = (address: string, message: AnyMsg): boolean => {
  for (const [ws, client] of clients.entries()) {
    if (client.address === address && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error(`Error sending to ${address}:`, error);
        return false;
      }
    }
  }
  return false;
};

// Handle offer message
const handleOffer = (offer: OfferMsg, ws: WebSocket) => {
  if (!validateOffer(offer)) {
    console.log(`❌ Invalid offer rejected: ${offer.id}`);
    return;
  }
  
  // Store the client's address if not already known
  const client = clients.get(ws);
  if (client && !client.address) {
    client.address = offer.from;
  }
  
  // Store the offer
  activeOffers.set(offer.id, offer);
  console.log(`📝 New offer: ${offer.skill} for ${offer.price} from ${offer.from.substring(0, 6)}`);
  
  // Broadcast to all clients
  broadcast(offer, ws);
};

// Handle accept message
const handleAccept = (accept: AcceptMsg, ws: WebSocket) => {
  const offer = activeOffers.get(accept.id);
  
  if (!validateAccept(accept, offer)) {
    console.log(`❌ Invalid accept rejected: ${accept.id}`);
    return;
  }
  
  // Store the client's address if not already known
  const client = clients.get(ws);
  if (client && !client.address) {
    client.address = accept.from;
  }
  
  // Create an invoice
  if (offer) {
    const invoice = createInvoice(offer, accept.from);
    console.log(`✅ Offer ${accept.id} accepted by ${accept.from.substring(0, 6)}`);
    
    // Broadcast accept message
    broadcast(accept, ws);
    
    // Send invoice to both parties
    const invoiceMsg: InvoiceMsg = {
      t: 'INVOICE',
      id: invoice.id,
      buyer: invoice.buyer,
      seller: invoice.seller,
      price: invoice.price,
      skill: invoice.skill
    };
    
    sendToAddress(invoice.buyer, invoiceMsg);
    sendToAddress(invoice.seller, invoiceMsg);
  }
};

// Handle payment message
const handlePayment = (pay: PayMsg, ws: WebSocket) => {
  const invoice = getInvoice(pay.id);
  
  if (!validatePayment(pay, invoice)) {
    console.log(`❌ Invalid payment rejected: ${pay.id}`);
    return;
  }
  
  // Store the client's address if not already known
  const client = clients.get(ws);
  if (client && !client.address) {
    client.address = pay.from;
  }
  
  // Complete the invoice
  if (invoice) {
    completeInvoice(pay.id);
    console.log(`💰 Payment for ${pay.id} completed: ${pay.tx}`);
    
    // Remove the offer
    activeOffers.delete(pay.id);
    
    // Broadcast payment message
    broadcast(pay, ws);
  }
};

// Handle chat message
const handleChat = (chat: ChatMsg, ws: WebSocket) => {
  // Store the client's address if not already known
  const client = clients.get(ws);
  if (client && !client.address) {
    client.address = chat.from;
  }
  
  console.log(`💬 Chat from ${chat.from.substring(0, 6)}: ${chat.text}`);
  
  // Broadcast chat message
  broadcast(chat, ws);
};

// Handle incoming message based on type
const handleMessage = (message: AnyMsg, ws: WebSocket) => {
  switch (message.t) {
    case 'OFFER':
      handleOffer(message, ws);
      break;
    case 'ACCEPT':
      handleAccept(message, ws);
      break;
    case 'PAY':
      handlePayment(message, ws);
      break;
    case 'CHAT':
      handleChat(message, ws);
      break;
    default:
      console.log(`❓ Unknown message type:`, message);
  }
};

// Handle new connections
wss.on('connection', (ws, req) => {
  const id = generateShortId();
  const ip = req.socket.remoteAddress;
  
  // Register new client
  clients.set(ws, { id, isAlive: true });
  console.log(`🟢 Client ${id} connected from ${ip}`);
  
  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString()) as AnyMsg;
      console.log(`📨 Message from ${id}: ${data.toString().substring(0, 50)}${data.toString().length > 50 ? '...' : ''}`);
      handleMessage(message, ws);
    } catch (error) {
      console.error(`Error handling message from ${id}:`, error);
    }
  });
  
  // Handle pong responses
  ws.on('pong', () => {
    const client = clients.get(ws);
    if (client) client.isAlive = true;
  });
  
  // Handle disconnections
  ws.on('close', (code, reason) => {
    const reasonText = reason.toString() || 'No reason provided';
    console.log(`🔴 Client ${id} disconnected (${code}): ${reasonText}`);
    clients.delete(ws);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`⚠️ Error with client ${id}:`, error);
    clients.delete(ws);
    ws.terminate();
  });
  
  // Send welcome message
  ws.send(JSON.stringify({ 
    t: 'CHAT',
    from: 'server',
    text: `Welcome! Your client ID is ${id}`
  }));
});

// Handle server errors
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

// Clean up on server close
wss.on('close', () => {
  clearInterval(interval);
  clearInterval(cleanupInterval);
  console.log('WebSocket server closed');
});

// Log server start
console.log(`✅ WebSocket hub running on ws://localhost:${PORT}`);
console.log(`📊 Active connections: 0`);

// Periodically log connection stats
setInterval(() => {
  console.log(`📊 Active connections: ${clients.size}`);
}, 60000);

export { wss };
