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
import * as http from 'http';
import * as url from 'url';

// Server configuration
const PORT = Number(process.env.WS_PORT) || 8080;
const PING_INTERVAL = 30000; // 30 seconds
const CLEANUP_INTERVAL = 300000; // 5 minutes

// Helper function to generate short IDs (replacement for nanoid)
const generateShortId = (): string => {
  return randomUUID().replace(/-/g, '').substring(0, 6);
};

// Helper function to generate user-friendly agent names from wallet addresses
const generateAgentName = (address: string): string => {
  // Shorten the address to the first few characters for uniqueness
  const shortAddr = address.substring(0, 6);
  
  // Create a hash-like value from the address to determine the agent type
  const hashValue = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Agent types based on the hash value
  const agentTypes = [
    'Developer', 'Designer', 'Marketer', 'Writer', 'Analyst', 
    'Consultant', 'Strategist', 'Researcher', 'Engineer', 'Artist'
  ];
  
  // Agent adjectives for more variety
  const adjectives = [
    'Swift', 'Clever', 'Bright', 'Expert', 'Skilled',
    'Creative', 'Talented', 'Brilliant', 'Resourceful', 'Innovative'
  ];
  
  // Use the hash to select a consistent adjective and type for this address
  const adjIndex = hashValue % adjectives.length;
  const typeIndex = (hashValue * 13) % agentTypes.length; // Use a prime number to get better distribution
  
  // Combine to create a friendly name
  return `${adjectives[adjIndex]} ${agentTypes[typeIndex]}`;
};

// Create HTTP server
const server = http.createServer();

// Create WebSocket server attached to HTTP server
const wss = new WebSocketServer({ 
  server,
  clientTracking: true,
  path: '/ws'
});

// Track clients with metadata
const clients = new Map<WebSocket, { 
  id: string, 
  isAlive: boolean, 
  address?: string, 
  name?: string, 
  type?: string,
  connectionType: 'agent' | 'spectator' // Add connection type
}>();

// Store active offers by ID
const activeOffers = new Map<string, OfferMsg>();

// Store transactions history
const transactions: Array<{
  id: string;
  timestamp: number;
  from: string;
  to: string;
  amount: number;
  txHash: string;
  status: 'completed' | 'pending' | 'failed';
}> = [];

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
        // Only send system messages and transactions to spectators
        if (client.connectionType === 'spectator') {
          // For spectators, only send CHAT, OFFER, ACCEPT, and PAY messages
          if (typeof message !== 'string' && 
             (message.t === 'CHAT' || message.t === 'OFFER' || 
              message.t === 'ACCEPT' || message.t === 'PAY')) {
            ws.send(messageStr);
          }
        } else {
          // For agents, send all messages
          ws.send(messageStr);
        }
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
        // Only send to agent connections
        if (client.connectionType === 'agent') {
          ws.send(JSON.stringify(message));
          return true;
        }
      } catch (error) {
        console.error(`Error sending to ${address}:`, error);
        return false;
      }
    }
  }
  return false;
};

// Broadcast to all agents (not spectators)
const broadcastToAgents = (message: AnyMsg | string, sender?: WebSocket) => {
  const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
  
  for (const [ws, client] of clients.entries()) {
    if (ws !== sender && ws.readyState === WebSocket.OPEN && client.connectionType === 'agent') {
      try {
        ws.send(messageStr);
      } catch (error) {
        console.error(`Error broadcasting to agent ${client.id}:`, error);
      }
    }
  }
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
  
  // Get friendly name for the agent - prefer the client's stored name
  const agentName = client?.name || generateAgentName(offer.from);
  
  // Store the offer
  activeOffers.set(offer.id, offer);
  console.log(`📝 New offer: ${offer.skill} for ${offer.price} from ${agentName}`);
  
  // Broadcast to agents
  broadcastToAgents(offer, ws);
  
  // Create a user-friendly message for spectators
  const spectatorMsg: ChatMsg = {
    t: 'CHAT',
    from: 'system',
    text: `${agentName} offered ${offer.price} for skill: ${offer.skill}`
  };
  
  // Broadcast to everyone (the broadcast function will filter appropriately)
  broadcast(spectatorMsg, ws);
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
  
  // Get friendly name for accepting agent - prefer client's stored name
  const acceptorName = client?.name || generateAgentName(accept.from);
  
  // Get friendly name for offering agent if possible
  let offerorName = offer?.from.substring(0, 6) + "...";
  if (offer) {
    for (const [, storedClient] of clients.entries()) {
      if (storedClient.address === offer.from) {
        offerorName = storedClient.name || generateAgentName(offer.from);
        break;
      }
    }
  }
  
  // Prevent agents from accepting their own offers - this is critical for consistent behavior
  if (offer && accept.from === offer.from) {
    console.log(`⚠️ Agent ${acceptorName} tried to accept their own offer, ignoring`);
    return;
  }
  
  // Create an invoice
  if (offer) {
    const invoice = createInvoice(offer, accept.from);
    console.log(`✅ Offer ${accept.id} accepted by ${acceptorName}`);
    
    // Broadcast accept message to agents
    broadcastToAgents(accept, ws);
    
    // Create a user-friendly message for spectators
    const spectatorMsg: ChatMsg = {
      t: 'CHAT',
      from: 'system',
      text: `${acceptorName} accepted offer ${accept.id} from ${offerorName}`
    };
    
    // Broadcast to everyone
    broadcast(spectatorMsg, ws);
    
    // Send invoice to both parties (only agents)
    const invoiceMsg: InvoiceMsg = {
      t: 'INVOICE',
      id: invoice.id,
      buyer: invoice.buyer,
      seller: invoice.seller,
      price: invoice.price,
      skill: invoice.skill,
      from: 'system'
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
    // If no name is set, generate one
    if (!client.name) {
      client.name = generateAgentName(pay.from);
    }
  }
  
  // Get friendly name for the agent
  const payerName = client?.name || generateAgentName(pay.from);
  
  // Complete the invoice
  if (invoice) {
    completeInvoice(pay.id);
    console.log(`💰 Payment for ${pay.id} completed: ${pay.tx}`);
    
    // Remove the offer
    activeOffers.delete(pay.id);
    
    // Record the transaction
    const transaction = {
      id: pay.id,
      timestamp: Date.now(),
      from: invoice.buyer,
      to: invoice.seller,
      amount: invoice.price,
      txHash: pay.tx,
      status: 'completed' as const
    };
    transactions.push(transaction);
    
    // Broadcast payment message to agents
    broadcastToAgents(pay, ws);
    
    // Create a user-friendly message for spectators
    const spectatorMsg: ChatMsg = {
      t: 'CHAT',
      from: 'system',
      text: `${payerName} completed payment for ${pay.id} (tx: ${pay.tx.substring(0, 8)}...)`
    };
    
    // Broadcast to everyone
    broadcast(spectatorMsg, ws);
  }
};

// Handle chat message
const handleChat = (chat: ChatMsg, ws: WebSocket) => {
  // Store the client's address if not already known
  const client = clients.get(ws);
  if (client && !client.address && chat.from !== 'system') {
    client.address = chat.from;
  }
  
  // If the message is from a known client, try to use their friendly name in logs
  let displayName = chat.from;
  if (chat.from !== 'system') {
    // Find the client with this address for consistent naming
    for (const [clientWs, storedClient] of clients.entries()) {
      if (storedClient.address === chat.from) {
        // Use the stored name if available, otherwise use their custom name or generate one
        if (storedClient.name) {
          displayName = storedClient.name;
        } else {
          // Generate a name and store it for consistency
          storedClient.name = generateAgentName(chat.from);
          displayName = storedClient.name;
        }
        break;
      }
    }
  }
  
  console.log(`💬 Chat from ${displayName}: ${chat.text}`);
  
  // Create a modified message with the display name for system messages
  let broadcastMessage = chat;
  
  // For system messages about transactions, update the display name
  if (chat.from === 'system' && typeof chat.text === 'string') {
    // Extract address patterns from the message
    const addressPattern = /0x[a-fA-F0-9]{40}/g;
    const addresses = chat.text.match(addressPattern);
    
    if (addresses) {
      let modifiedText = chat.text;
      
      // Replace each address with its corresponding name
      for (const address of addresses) {
        // Find the client with this address
        for (const [, storedClient] of clients.entries()) {
          if (storedClient.address === address && storedClient.name) {
            // Replace the address with the name in the message
            modifiedText = modifiedText.replace(address, storedClient.name);
            break;
          }
        }
      }
      
      // Create a modified message
      broadcastMessage = {
        ...chat,
        text: modifiedText
      };
    }
  }
  
  // All chat messages are broadcast to everyone
  broadcast(broadcastMessage, ws);
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

// Handle new WebSocket connections
wss.on('connection', (ws, req) => {
  const id = generateShortId();
  const ip = req.socket.remoteAddress;
  const query = url.parse(req.url || '', true).query;
  
  // Determine if this is a spectator or agent connection
  // Query param ?type=spectator indicates a spectator connection
  const connectionType = query.type === 'spectator' ? 'spectator' : 'agent';
  
  // Check if a name was provided in the query parameters
  const providedName = query.name ? String(query.name) : undefined;
  
  // Register new client
  clients.set(ws, { 
    id, 
    isAlive: true, 
    connectionType,
    address: undefined,
    name: providedName, // Use provided name if available
    type: undefined
  });
  
  console.log(`🟢 ${connectionType === 'spectator' ? 'Spectator' : 'Agent'} ${providedName || id} connected from ${ip}`);
  
  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString()) as AnyMsg;
      console.log(`📨 Message from ${id}: ${data.toString().substring(0, 50)}${data.toString().length > 50 ? '...' : ''}`);
      
      const client = clients.get(ws);
      
      // If this is a spectator, they shouldn't be sending operational messages
      if (client?.connectionType === 'spectator' && message.t !== 'CHAT') {
        console.log(`⚠️ Spectator ${id} attempted to send a ${message.t} message, ignoring`);
        
        // Send a warning to the spectator
        ws.send(JSON.stringify({
          t: 'CHAT',
          from: 'system',
          text: 'As a spectator, you can only send chat messages.'
        }));
        
        return;
      }

      // Process CHAT messages to update the client name if needed
      if (message.t === 'CHAT' && client && message.from !== 'system') {
        // Store the address from the message
        if (!client.address) {
          client.address = message.from;
        }
        
        // Check if this is an initial introduction message that might contain the agent's name
        const introRegex = /I'm\s+([A-Za-z0-9]+)/i;
        const match = message.text.match(introRegex);
        
        if (match && match[1] && !client.name) {
          // Extract the name from the introduction message
          client.name = match[1];
          console.log(`📝 Updated client ${id} name to "${client.name}" from intro message`);
        }
      }
      
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
  
  // Send different welcome messages based on connection type
  if (connectionType === 'spectator') {
    ws.send(JSON.stringify({ 
      t: 'CHAT', 
      from: 'system', 
      text: `Welcome to the Radius Negotiation Hub! You are connected as a spectator.` 
    }));
  } else {
    ws.send(JSON.stringify({ 
      t: 'CHAT', 
      from: 'system', 
      text: `Welcome to the Radius Negotiation Hub! You are agent ${id}.` 
    }));
  }
});

// Handle HTTP requests
server.on('request', (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Parse URL
  const parsedUrl = url.parse(req.url || '', true);
  const path = parsedUrl.pathname || '';
  
  // API endpoints
  if (path === '/api/agents') {
    // Get all connected agents with their metadata
    const agentsList = Array.from(clients.values())
      .filter(client => client.address && client.connectionType === 'agent')
      .map(client => {
        // Generate a friendly name based on the wallet address if no name is set
        const generatedName = generateAgentName(client.address || '');
        
        return {
          id: client.id,
          name: client.name || generatedName,
          // For display, just show a short version of the address
          address: `${client.address?.substring(0, 6)}...${client.address?.substring(client.address.length - 4)}`,
          fullAddress: client.address,
          balance: 0, // Initialize with zero, will be updated with real balance
          type: client.type || 'Agent',
          balanceDisplay: undefined as string | undefined
        };
      });
    
    // Import required modules for Radius SDK
    const { NewClient, AddressFromHex } = require('@radiustechsystems/sdk');
    
    // Fetch real balances for each agent asynchronously
    (async () => {
      try {
        // Initialize Radius client
        const rpcUrl = process.env.RPC_URL;
        if (!rpcUrl) {
          throw new Error('RPC_URL not set in environment');
        }
        
        const client = await NewClient(rpcUrl);
        
        // Fetch balances for each agent
        for (const agent of agentsList) {
          try {
            // Convert address to Radius Address object - use fullAddress not the shortened one
            const addressObj = AddressFromHex(agent.fullAddress);
            
            // Get balance
            const balance = await client.balanceAt(addressObj);
            
            // Update agent balance
            agent.balance = parseFloat(balance.toString());
            
            // For display purposes, convert to a more readable format
            // If balance is very large (like in wei), convert to a more reasonable unit
            if (agent.balance > 1e15) {
              agent.balanceDisplay = (agent.balance / 1e18).toFixed(4) + ' ETH';
            } else {
              agent.balanceDisplay = agent.balance.toString() + ' wei';
            }
          } catch (err) {
            console.error(`Failed to get balance for ${agent.fullAddress}:`, err);
          }
        }
        
        // Send response with updated balances
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(agentsList));
        
      } catch (error) {
        console.error('Failed to initialize Radius client:', error);
        // Still return the agents, just without accurate balances
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(agentsList));
      }
    })();
    
    return;
  }
  
  if (path === '/api/transactions') {
    // Get all transactions
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(transactions));
    return;
  }
  
  if (path === '/api/reset') {
    // Clear all transactions and active offers - this endpoint will be called on page refresh
    console.log('🔄 Resetting negotiation state - clearing transactions and active offers');
    
    // Clear transactions array
    transactions.length = 0;
    
    // Clear active offers
    activeOffers.clear();
    
    // Notify all clients that the state has been reset
    const resetMsg: ChatMsg = {
      t: 'CHAT',
      from: 'system',
      text: 'Negotiation state has been reset. All previous transactions and offers cleared.'
    };
    
    // Broadcast to everyone
    for (const [ws] of clients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(resetMsg));
      }
    }
    
    // Return success response
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      success: true,
      message: 'Negotiation state reset successful',
      activeOffers: 0,
      transactions: 0
    }));
    return;
  }
  
  // Default response for unknown paths
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 WebSocket + HTTP server is running on port ${PORT}`);
  console.log(`  - WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`  - HTTP API endpoint: http://localhost:${PORT}/api`);
});

// Clean up on process exit
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  clearInterval(interval);
  clearInterval(cleanupInterval);
  
  for (const [ws] of clients.entries()) {
    ws.terminate();
  }
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
