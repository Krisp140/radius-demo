import { BaseAgent } from './baseAgent';
import { OfferMsg, AcceptMsg, PayMsg, ChatMsg } from '../protocol/messages';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { AddressFromHex } from '@radiustechsystems/sdk';

// An AI agent that uses LangChain and OpenAI to make decisions
export class AIAgent extends BaseAgent {
  protected model: ChatOpenAI;
  protected memory: { role: string; content: string }[] = [];
  protected systemPrompt: string;
  protected chain: RunnableSequence;
  protected type: string = 'AI';
  private offerInterval: NodeJS.Timeout | null = null;
  private offerIntervalMs = 15000; // 15 seconds
  private maxMemoryLength = 10; // Limit memory to last 10 messages
  
  constructor(
    serverUrl: string, 
    privateKey: string, 
    openAIApiKey: string,
    systemPrompt: string,
    name?: string
  ) {
    super(serverUrl, privateKey, name);
    
    // Initialize the OpenAI model with token-saving settings
    this.model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY || openAIApiKey,
      modelName: "gpt-3.5-turbo", // Using 3.5 to save tokens
      temperature: 0.5, // Lower temperature for more predictable responses
      maxTokens: 40, // Strictly limit response length
    });
    
    this.systemPrompt = systemPrompt;
    
    // Initialize the LangChain chain
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", this.systemPrompt],
      new MessagesPlaceholder("history"),
      ["human", "{input}"]
    ]);
    
    this.chain = RunnableSequence.from([
      {
        input: (input) => input.input,
        history: () => this.memory.slice(-this.maxMemoryLength) // Only use last N messages
      },
      prompt,
      this.model,
      new StringOutputParser()
    ]);
  }
  
  protected async callAI(input: string): Promise<string> {
    try {
      // Trim the input to save tokens
      const trimmedInput = input.length > 100 ? input.substring(0, 100) + "..." : input;
      
      // Add the trimmed input to memory
      this.memory.push({ role: "human", content: trimmedInput });
      
      // Ensure memory doesn't exceed max length
      if (this.memory.length > this.maxMemoryLength * 2) {
        this.memory = this.memory.slice(-this.maxMemoryLength);
      }
      
      // Call the chain
      const response = await this.chain.invoke({ input: trimmedInput });
      
      // Limit response length regardless of what model returns
      const trimmedResponse = response.length > 100 ? response.substring(0, 100) : response;
      
      // Add the trimmed response to memory
      this.memory.push({ role: "assistant", content: trimmedResponse });
      
      return trimmedResponse;
    } catch (error) {
      console.error(`${this.name} AI call failed:`, error);
      return "I encountered an error.";
    }
  }
  
  protected onConnect() {
    // Start the offer loop
    this.startOfferLoop();
    
    // Announce presence with minimal message including the name
    this.sendChat(`${this.name} ready.`);
  }
  
  private startOfferLoop() {
    if (this.offerInterval) {
      clearInterval(this.offerInterval);
    }
    
    this.offerInterval = setInterval(async () => {
      await this.considerMakingOffer();
    }, this.offerIntervalMs);
  }
  
  private async considerMakingOffer() {
    try {
      // Simplified market state with minimal info
      const marketState = {
        skills: this.skills,
        balance: await this.getBalance()
      };
      
      const input = `Make offer? Respond with skill and price only.`;
      
      const response = await this.callAI(input);
      
      // Parse the response to see if the AI wants to make an offer
      if (response.toLowerCase().includes("skill") && response.toLowerCase().includes("price")) {
        // Extract the skill and price using regex
        const skillMatch = response.match(/skill[s]?:\s*["']?([a-zA-Z]+)["']?/i);
        const priceMatch = response.match(/price[s]?:\s*["']?(\d+\.?\d*)["']?/i);
        
        if (skillMatch && priceMatch) {
          const skill = skillMatch[1].toLowerCase();
          const price = parseFloat(priceMatch[1]);
          
          if (this.skills.includes(skill) && price > 0) {
            console.log(`${this.name} is offering ${skill} services for ${price}`);
            this.sendOffer(skill, price);
          }
        }
      }
    } catch (error) {
      console.error(`${this.name} failed to consider making offer:`, error);
    }
  }
  
  protected async handleOffer(offer: OfferMsg) {
    // First use the base class implementation to check for previous partners
    // If this returns, it means we should skip this offer
    if (super.handleOffer(offer) === undefined) return;
    
    // Don't respond to our own offers
    if (offer.from === this.address) return;
    
    console.log(`${this.name} received offer: ${offer.skill} for ${offer.price} from ${offer.from.substring(0, 6)}`);
    
    try {
      // Include previous partner information in the prompt
      const input = `Offered: ${offer.skill} for ${offer.price}. This is a new partner you haven't traded with before. Accept? (yes/no)`;
      
      const response = await this.callAI(input);
      
      if (response.toLowerCase().includes("yes") || response.toLowerCase().includes("accept")) {
        console.log(`${this.name} accepting offer ${offer.id}`);
        this.sendAccept(offer.id);
        this.acceptedOffers.set(offer.id, offer);
        // Add this address to previous partners - now handled in sendAccept
      }
    } catch (error) {
      console.error(`${this.name} failed to handle offer:`, error);
    }
  }
  
  protected handleAccept(accept: AcceptMsg) {
    // Leverage the base class implementation
    super.handleAccept(accept);
    
    // Check if this is accepting our offer
    const offer = this.pendingOffers.get(accept.id);
    if (!offer) return;
    
    // Don't accept our own offers
    if (accept.from === this.address) return;
    
    console.log(`${this.name}'s offer ${accept.id} was accepted by ${accept.from.substring(0, 6)}`);
    
    // Process payment for the accepted offer
    this.processPayment(accept.id, accept.from, offer.price);
  }
  
  private async processPayment(offerId: string, toAddress: string, amount: number) {
    console.log(`${this.name} sending payment of ${amount} to ${toAddress.substring(0, 6)}`);
    
    const txHash = await this.sendPayment(offerId, toAddress, amount);
    
    if (txHash) {
      console.log(`${this.name} payment successful: ${txHash}`);
      // Remove from pending offers after successful payment
      this.pendingOffers.delete(offerId);
    } else {
      console.error(`${this.name} payment failed for offer ${offerId}`);
    }
  }
  
  protected async handlePay(pay: PayMsg) {
    // Check if this payment is for an offer we accepted
    const offer = this.acceptedOffers.get(pay.id);
    if (!offer) return;
    
    console.log(`${this.name} received payment for offer ${pay.id}: ${pay.tx}`);
    
    // Remove from accepted offers after receiving payment
    this.acceptedOffers.delete(pay.id);
    
    // Use predefined message instead of AI to save tokens
    this.sendChat(`Thanks for the payment for ${offer.skill}.`);
  }
  
  protected async handleChat(chat: ChatMsg) {
    // Don't respond to our own chats
    if (chat.from === this.address) return;
    
    // Don't respond to system messages to save tokens
    if (chat.from === 'system') return;
    
    console.log(`${this.name} received chat: ${chat.text}`);
    
    // Limit chat interactions to save tokens
    // Only respond to messages that seem like direct questions
    if (chat.text.includes("?") || 
        chat.text.toLowerCase().includes("can you") ||
        chat.text.toLowerCase().includes("please")) {
      try {
        // Simplified input for minimal tokens
        const input = `Reply briefly: ${chat.text}`;
        const response = await this.callAI(input);
        
        // Send the AI's response
        this.sendChat(response);
      } catch (error) {
        console.error(`${this.name} failed to handle chat:`, error);
        // Even shorter fallback
        this.sendChat(`${this.name} here. Service available.`);
      }
    } else {
      // Don't respond to non-questions to save tokens
      console.log(`${this.name} ignoring non-question chat to save tokens`);
    }
  }
  
  public disconnect() {
    if (this.offerInterval) {
      clearInterval(this.offerInterval);
      this.offerInterval = null;
    }
    super.disconnect();
  }
} 