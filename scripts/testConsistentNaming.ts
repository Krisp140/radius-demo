import 'dotenv/config';
import WebSocket from 'ws';
import { randomUUID } from 'crypto';
import { OfferMsg, AcceptMsg, PayMsg, ChatMsg, AnyMsg } from '../src/protocol/messages';

// Configuration
const PORT = Number(process.env.WS_PORT) || 8080;
const SERVER_URL = `ws://localhost:${PORT}/ws`;

// Simple function to derive address from private key (mock)
function deriveAddress(privateKey: string): string {
  const hash = require('crypto').createHash('sha256');
  hash.update(privateKey);
  const digest = hash.digest('hex');
  return '0x' + digest.substring(0, 40);
}

// Agent class with consistent naming
class NamedAgent {
  private ws: WebSocket;
  private name: string;
  private address: string;
  private connected = false;
  private pendingOffers: Map<string, OfferMsg> = new Map();
  private acceptedOffers: Map<string, OfferMsg> = new Map();
  private previousPartners: Set<string> = new Set(); // Track previous trading partners by address

  constructor(serverUrl: string, privateKey: string, name: string) {
    this.name = name;
    this.address = deriveAddress(privateKey);
    
    // Include name in connection URL
    const connectionUrl = new URL(serverUrl);
    connectionUrl.searchParams.append('name', this.name);
    
    // Connect to WebSocket server
    this.ws = new WebSocket(connectionUrl.toString());
    this.setupWebSocket();
  }
  
  private setupWebSocket() {
    this.ws.on('open', () => {
      console.log(`${this.name} connected to server`);
      this.connected = true;
      // Introduce with consistent name
      this.sendChat(`${this.name} ready.`);
      
      // Test sequence
      setTimeout(() => this.testSequence(), 2000);
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString()) as AnyMsg;
        console.log(`${this.name} received:`, message);
        
        // Handle incoming messages based on type
        this.handleMessage(message);
      } catch (err) {
        console.error(`${this.name} failed to parse message:`, err);
      }
    });

    this.ws.on('close', () => {
      console.log(`${this.name} disconnected from server`);
      this.connected = false;
    });

    this.ws.on('error', (error) => {
      console.error(`${this.name} WebSocket error:`, error);
    });
  }
  
  private handleMessage(message: AnyMsg) {
    switch (message.t) {
      case 'OFFER':
        this.handleOffer(message);
        break;
      case 'ACCEPT':
        this.handleAccept(message);
        break;
      case 'PAY':
        this.handlePay(message);
        break;
      default:
        // Just log other message types
        break;
    }
  }
  
  private handleOffer(offer: OfferMsg) {
    // Skip our own offers
    if (offer.from === this.address) return;
    
    // Check if we've already dealt with this agent
    if (this.previousPartners.has(offer.from)) {
      console.log(`🚫 ${this.name} ignoring offer from ${offer.from.substring(0, 6)}... (previous partner)`);
      
      // Send a chat message to inform about the policy
      this.sendChat(`Sorry, I've already done business with you. Looking for new partners.`);
      return;
    }
    
    // Random decision to accept (50% chance)
    const shouldAccept = Math.random() > 0.5;
    
    if (shouldAccept) {
      console.log(`✅ ${this.name} accepting offer ${offer.id} from ${offer.from.substring(0, 6)}...`);
      this.sendAccept(offer.id);
      this.acceptedOffers.set(offer.id, offer);
      
      // Add this address to previous partners
      this.previousPartners.add(offer.from);
      
      // Send confirmation chat
      this.sendChat(`I accept your offer. This is our first and only deal!`);
    } else {
      console.log(`❌ ${this.name} declining offer ${offer.id} (random choice)`);
      this.sendChat(`I decline your offer, but may accept a different one.`);
    }
  }
  
  private handleAccept(accept: AcceptMsg) {
    // Check if this is accepting our offer
    const offer = this.pendingOffers.get(accept.id);
    if (!offer) return;
    
    console.log(`${this.name}'s offer ${accept.id} was accepted by ${accept.from.substring(0, 6)}...`);
    
    // Add the acceptor to previous partners
    this.previousPartners.add(accept.from);
    
    // In a real implementation, we would process payment here
    // For the test, just log it
    console.log(`${this.name} would now pay ${accept.from.substring(0, 6)}... for offer ${accept.id}`);
  }
  
  private handlePay(pay: PayMsg) {
    // Check if this payment is for an offer we accepted
    const offer = this.acceptedOffers.get(pay.id);
    if (!offer) return;
    
    console.log(`${this.name} received payment for offer ${pay.id}: ${pay.tx}`);
    
    // Remove from accepted offers after receiving payment
    this.acceptedOffers.delete(pay.id);
  }
  
  private testSequence() {
    // Send a chat message
    setTimeout(() => {
      this.sendChat(`Hello from ${this.name}! I provide professional services and only work with each partner once.`);
    }, 1000);
    
    // Create offers at different intervals - repeated offers to show the one-time partner feature
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const skill = this.name.includes('Dev') ? 'coding' : 'design';
        const price = this.name.includes('Dev') ? 0.005 + (i * 0.001) : 0.008 + (i * 0.001);
        console.log(`📝 ${this.name} creating offer #${i+1} for ${skill} at price ${price}`);
        this.sendOffer(skill, price);
      }, 3000 + (i * 2500)); // Space out offers by 2.5 seconds
    }
  }
  
  public sendOffer(skill: string, price: number): string {
    const id = randomUUID();
    const offer: OfferMsg = {
      t: 'OFFER',
      id,
      skill,
      price,
      from: this.address
    };
    this.pendingOffers.set(id, offer);
    this.sendMessage(offer);
    return id;
  }
  
  public sendAccept(offerId: string) {
    const accept: AcceptMsg = {
      t: 'ACCEPT',
      id: offerId,
      from: this.address
    };
    this.sendMessage(accept);
  }
  
  public sendChat(text: string) {
    const chat: ChatMsg = {
      t: 'CHAT',
      text,
      from: this.address
    };
    this.sendMessage(chat);
  }
  
  private sendMessage(message: any) {
    if (this.connected) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error(`${this.name} tried to send message while disconnected`);
    }
  }
  
  public disconnect() {
    if (this.connected) {
      this.ws.close();
    }
  }
}

// Main test function
async function testConsistentNaming() {
  console.log('🧪 Testing consistent agent naming and one-time partner trading...');
  
  if (!process.env.PRIV_KEY_AGENT1 || !process.env.PRIV_KEY_AGENT2) {
    console.error('❌ Missing PRIV_KEY_AGENT1 or PRIV_KEY_AGENT2 in environment variables');
    process.exit(1);
  }
  
  // Create agents with consistent names
  const agent1 = new NamedAgent(
    SERVER_URL,
    process.env.PRIV_KEY_AGENT1,
    'DevBot1'
  );
  
  const agent2 = new NamedAgent(
    SERVER_URL,
    process.env.PRIV_KEY_AGENT2,
    'ArtsyBot2'
  );
  
  // Run the test for 25 seconds (longer to see multiple offers)
  console.log('⏱️ Test will run for 25 seconds...');
  
  setTimeout(() => {
    console.log('✅ Test complete!');
    agent1.disconnect();
    agent2.disconnect();
    process.exit(0);
  }, 25000);
}

// Run the test
testConsistentNaming().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 