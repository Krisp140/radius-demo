import 'dotenv/config';
import WebSocket from 'ws';
import { randomUUID } from 'crypto';
import { OfferMsg, AcceptMsg, PayMsg, ChatMsg } from '../src/protocol/messages';

// Configuration
const PORT = Number(process.env.WS_PORT) || 8080;
const SERVER_URL = `ws://localhost:${PORT}/ws`;

// Check for required environment variables
const requiredEnvVars = ['PRIV_KEY_AGENT1', 'PRIV_KEY_AGENT2'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Simple function to derive address from private key (mock)
function deriveAddress(privateKey: string): string {
  const hash = require('crypto').createHash('sha256');
  hash.update(privateKey);
  const digest = hash.digest('hex');
  return '0x' + digest.substring(0, 40);
}

// Simple agent class for demo
class SimpleAgent {
  private ws: WebSocket;
  private name: string;
  private address: string;
  private connected = false;
  private pendingOffers: Map<string, OfferMsg> = new Map();
  private acceptedOffers: Map<string, OfferMsg> = new Map();

  constructor(serverUrl: string, privateKey: string, name: string) {
    this.name = name;
    this.address = deriveAddress(privateKey);
    
    // Connect to WebSocket server
    this.ws = new WebSocket(serverUrl);
    this.setupWebSocket();
  }
  
  private setupWebSocket() {
    this.ws.on('open', () => {
      console.log(`${this.name} connected to server`);
      this.connected = true;
      this.sendChat(`Hello! I'm ${this.name} and I'm ready to negotiate!`);
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`${this.name} received:`, message);
        
        if (message.t === 'ACCEPT' && this.pendingOffers.has(message.id)) {
          const offer = this.pendingOffers.get(message.id);
          if (offer) {
            console.log(`${this.name}'s offer ${message.id} was accepted by ${message.from.substring(0, 6)}`);
            // Process payment for the accepted offer
            this.sendPayment(message.id, message.from, offer.price);
          }
        }
        
        if (message.t === 'PAY' && this.acceptedOffers.has(message.id)) {
          const offer = this.acceptedOffers.get(message.id);
          if (offer) {
            console.log(`${this.name} received payment for ${offer.skill}: ${message.tx}`);
            this.acceptedOffers.delete(message.id);
            this.sendChat(`Thank you for the payment for ${offer.skill} services!`);
          }
        }
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
  
  public acceptOffer(offer: OfferMsg) {
    this.acceptedOffers.set(offer.id, offer);
    this.sendAccept(offer.id);
  }
  
  public sendPayment(offerId: string, toAddress: string, amount: number) {
    // Mock transaction hash
    const txHash = `0x${randomUUID().replace(/-/g, '')}`;
    console.log(`${this.name} sending ${amount} to ${toAddress.substring(0, 6)}`);
    
    // Send PAY message with transaction hash
    const pay: PayMsg = {
      t: 'PAY',
      id: offerId,
      tx: txHash,
      from: this.address
    };
    this.sendMessage(pay);
    this.pendingOffers.delete(offerId);
    return txHash;
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
  
  public getAddress(): string {
    return this.address;
  }
  
  public disconnect() {
    if (this.connected) {
      this.ws.close();
    }
  }
}

// Initialize agents
console.log('🚀 Initializing agents...');

const devBot = new SimpleAgent(
  SERVER_URL,
  process.env.PRIV_KEY_AGENT1 as string,
  'DevBot'
);

const artsyBot = new SimpleAgent(
  SERVER_URL,
  process.env.PRIV_KEY_AGENT2 as string,
  'ArtsyBot'
);

// Allow some time for connection to establish
setTimeout(() => {
  // DevBot introduces itself
  devBot.sendChat("Hello agent! I'm DevBot, here to assist you with your software development needs. If you require coding or testing services, feel free to reach out to me.");
}, 3000);

setTimeout(() => {
  // ArtsyBot introduces itself
  artsyBot.sendChat("🎨✨ Greetings! I'm ArtsyBot, your go-to for all things design and writing. If you're in need of some creative magic, you've come to the right place. Let's make some artistic waves together! 🚀🖋️");
}, 5000);

// Run the scripted negotiation
setTimeout(() => {
  console.log('🔄 Starting negotiation sequence...');
  
  // DevBot offers coding services
  const codingOfferId = devBot.sendOffer('coding', 0.005);
  console.log(`DevBot created offer: ${codingOfferId} for coding services at 0.005 coins`);
  
  // ArtsyBot offers design services
  const designOfferId = artsyBot.sendOffer('design', 0.008);
  console.log(`ArtsyBot created offer: ${designOfferId} for design services at 0.008 coins`);
  
  // After a delay, they accept each others' offers
  setTimeout(() => {
    console.log('Agents accepting each others offers...');
    // Use a custom chat before accepting to make it look more natural
    artsyBot.sendChat("Your coding services would be perfect for a project I'm working on. I'll accept your offer!");
    artsyBot.sendAccept(codingOfferId);
    
    setTimeout(() => {
      devBot.sendChat("I could use your design skills for my new website. I'll accept your offer!");
      devBot.sendAccept(designOfferId);
    }, 2000);
  }, 5000);
}, 8000);

// Clean shutdown
function shutdown() {
  console.log('📴 Shutting down agents...');
  devBot.disconnect();
  artsyBot.disconnect();
  process.exit(0);
}

// Run the demo for a limited time
setTimeout(() => {
  console.log('⏱️ Demo complete, shutting down...');
  shutdown();
}, 30000); // Run for 30 seconds

// Handle process termination
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown); 