import WebSocket from 'ws';
import { randomUUID } from 'crypto';
import { NewClient, AddressFromHex } from '@radiustechsystems/sdk';
import { OfferMsg, AcceptMsg, PayMsg, ChatMsg, AnyMsg } from '../protocol/messages';

// Mock function to derive an address from a private key
// In a real implementation, this would use proper cryptography
function deriveAddress(privateKey: string): string {
  // For demo purposes, we'll use a deterministic but fake derivation
  // This should be replaced with proper derivation in production
  const hash = require('crypto').createHash('sha256');
  hash.update(privateKey);
  const digest = hash.digest('hex');
  return '0x' + digest.substring(0, 40); // Return first 20 bytes (40 hex chars) with 0x prefix
}

export class BaseAgent {
  protected ws: WebSocket;
  protected client: any; // Radius client
  protected privateKey: string;
  protected address: string;      // Address as a hex string
  protected addressObj: any;      // Address as a Radius Address object
  protected name: string;
  protected skills: string[] = ['coding', 'design', 'writing', 'testing', 'consulting'];
  protected connected = false;
  protected pendingOffers: Map<string, OfferMsg> = new Map();
  protected acceptedOffers: Map<string, OfferMsg> = new Map();
  protected previousPartners: Set<string> = new Set(); // Track previous trading partners

  constructor(serverUrl: string, privateKey: string, name?: string) {
    // Store private key
    this.privateKey = privateKey;
    
    // Derive address from private key
    // In a real implementation, we would use proper cryptography
    // For the demo, we'll use our mock function
    const derivedAddress = deriveAddress(privateKey);
    
    // Store both the address as a hex string and as an Address object
    this.address = derivedAddress;
    this.addressObj = AddressFromHex(derivedAddress);
    
    // Extract readable address format for display
    const shortAddr = derivedAddress.substring(0, 10);
    this.name = name || `Agent-${shortAddr}`;
    
    // Initialize Radius client
    this.initClient();
    
    // Append the agent name to the server URL
    const connectionUrl = new URL(serverUrl);
    connectionUrl.searchParams.append('name', this.name);
    
    // Connect to WebSocket server with the name parameter
    this.ws = new WebSocket(connectionUrl.toString());
    this.setupWebSocket();
  }

  // Public getter for address as a hex string
  public getAddress(): string {
    return this.address;
  }

  // Public getter for agent name
  public getName(): string {
    return this.name;
  }

  protected async initClient() {
    try {
      const rpcUrl = process.env.RPC_URL;
      if (!rpcUrl) {
        throw new Error('RPC_URL not set in environment');
      }
      this.client = await NewClient(rpcUrl);
      console.log(`${this.name} connected to Radius at ${rpcUrl}`);
    } catch (error) {
      console.error(`${this.name} failed to initialize Radius client:`, error);
    }
  }

  protected setupWebSocket() {
    this.ws.on('open', () => {
      console.log(`${this.name} connected to server`);
      this.connected = true;
      this.onConnect();
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString()) as AnyMsg;
        this.handleMessage(message);
      } catch (err) {
        console.error(`${this.name} failed to parse message:`, err);
      }
    });

    this.ws.on('close', () => {
      console.log(`${this.name} disconnected from server`);
      this.connected = false;
      // Try to reconnect after a delay
      setTimeout(() => this.reconnect(), 5000);
    });

    this.ws.on('error', (error) => {
      console.error(`${this.name} WebSocket error:`, error);
    });
  }

  protected reconnect() {
    if (!this.connected) {
      console.log(`${this.name} attempting to reconnect...`);
      // Ensure we include the name parameter when reconnecting
      const reconnectUrl = new URL(this.ws.url);
      reconnectUrl.searchParams.set('name', this.name);
      this.ws = new WebSocket(reconnectUrl.toString());
      this.setupWebSocket();
    }
  }

  protected handleMessage(message: AnyMsg) {
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
      case 'CHAT':
        this.handleChat(message);
        break;
      default:
        console.log(`${this.name} received unknown message type:`, message);
    }
  }

  protected handleOffer(offer: OfferMsg) {
    // Skip our own offers
    if (offer.from === this.address) return;
    
    // Check if we've already dealt with this agent
    if (this.previousPartners.has(offer.from)) {
      console.log(`${this.name} is ignoring offer from ${offer.from.substring(0, 6)}... (previous partner)`);
      return;
    }
    
    // Subclasses should override this method for specific logic
  }

  protected handleAccept(accept: AcceptMsg) {
    // Check if this is accepting our offer
    const offer = this.pendingOffers.get(accept.id);
    if (!offer) return;
    
    // Don't accept our own offers
    if (accept.from === this.address) return;
    
    console.log(`${this.name}'s offer ${accept.id} was accepted by ${accept.from.substring(0, 6)}...`);
    
    // Add the acceptor to previous partners
    this.previousPartners.add(accept.from);
    
    // Subclasses should override this method for specific payment logic
  }

  protected handlePay(pay: PayMsg) {
    // Check if this payment is for an offer we accepted
    const offer = this.acceptedOffers.get(pay.id);
    if (!offer) return;
    
    console.log(`${this.name} received payment for offer ${pay.id}: ${pay.tx}`);
    
    // Subclasses should override this method for specific handling
  }

  protected handleChat(chat: ChatMsg) {
    // To be implemented by subclasses
  }

  protected sendMessage(message: AnyMsg) {
    if (this.connected) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error(`${this.name} tried to send message while disconnected`);
    }
  }

  protected sendOffer(skill: string, price: number) {
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

  protected sendAccept(offerId: string) {
    const accept: AcceptMsg = {
      t: 'ACCEPT',
      id: offerId,
      from: this.address
    };
    this.sendMessage(accept);
    
    // Get the offer and add partner to previously traded list
    const offer = this.pendingOffers.get(offerId);
    if (offer) {
      this.previousPartners.add(offer.from);
    }
  }

  protected async sendPayment(offerId: string, toAddress: string, amount: number) {
    try {
      if (!this.client) {
        await this.initClient();
      }
      
      console.log(`${this.name} sending ${amount} to ${toAddress}`);
      
      // Convert toAddress to a proper Radius address if it's not already
      const to = toAddress.startsWith("0x") ? AddressFromHex(toAddress) : AddressFromHex("0x" + toAddress);
      
      // In a real implementation, we would sign and send a transaction using the private key
      // For this demo, we're just mocking the transaction
      
      // Mock transaction hash for demo purposes
      const txHash = `0x${randomUUID().replace(/-/g, '')}`;
      
      // Log the transaction details
      console.log(`${this.name} transaction details:`, {
        from: this.address,
        to: toAddress,
        amount
      });
      
      // Send PAY message with transaction hash
      const pay: PayMsg = {
        t: 'PAY',
        id: offerId,
        tx: txHash,
        from: this.address
      };
      this.sendMessage(pay);
      return txHash;
    } catch (error) {
      console.error(`${this.name} payment failed:`, error);
      return null;
    }
  }

  protected sendChat(text: string) {
    const chat: ChatMsg = {
      t: 'CHAT',
      text,
      from: this.address
    };
    this.sendMessage(chat);
  }

  protected onConnect() {
    // To be implemented by subclasses
    // When implementing, include the agent name in the introduction message
    // Example: this.sendChat(`Hello! I'm ${this.name} and I'm ready to negotiate!`);
  }

  public async getBalance(): Promise<number> {
    try {
      if (!this.client) {
        await this.initClient();
      }
      
      // Use the stored Address object to get the balance
      // This avoids converting between string and Address object which was causing problems
      console.log(`${this.name} getting balance for address: ${this.address}`);
      const balance = await this.client.balanceAt(this.addressObj);
      console.log(`${this.name} balance: ${balance.toString()}`);
      
      return parseFloat(balance.toString());
    } catch (error) {
      console.error(`${this.name} failed to get balance:`, error);
      console.error(error); // Log full error for debugging
      return 0;
    }
  }

  public disconnect() {
    if (this.connected) {
      this.ws.close();
    }
  }

  // Helper to check if an address is a previous partner
  protected hasTradedWith(address: string): boolean {
    return this.previousPartners.has(address);
  }

  // Add a partner to the previously traded list
  protected addPreviousPartner(address: string): void {
    this.previousPartners.add(address);
  }
} 