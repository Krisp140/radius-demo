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
  private offerInterval: NodeJS.Timeout | null = null;
  private offerIntervalMs = 15000; // 15 seconds
  
  constructor(
    serverUrl: string, 
    privateKey: string, 
    openAIApiKey: string,
    systemPrompt: string,
    name?: string
  ) {
    super(serverUrl, privateKey, name);
    
    // Initialize the OpenAI model
    this.model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY || openAIApiKey,
      modelName: "gpt-3.5-turbo",
      temperature: 0.7,
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
        history: () => this.memory
      },
      prompt,
      this.model,
      new StringOutputParser()
    ]);
  }
  
  protected async callAI(input: string): Promise<string> {
    try {
      // Add the input to memory
      this.memory.push({ role: "human", content: input });
      
      // Call the chain
      const response = await this.chain.invoke({ input });
      
      // Add the response to memory
      this.memory.push({ role: "assistant", content: response });
      
      return response;
    } catch (error) {
      console.error(`${this.name} AI call failed:`, error);
      return "I encountered an error processing your request.";
    }
  }
  
  protected onConnect() {
    // Start the offer loop
    this.startOfferLoop();
    
    // Announce presence
    this.sendChat(`Hello! I'm ${this.name} and I'm ready to negotiate!`);
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
      const marketState = {
        skills: this.skills,
        pendingOffers: Array.from(this.pendingOffers.values()),
        acceptedOffers: Array.from(this.acceptedOffers.values()),
        balance: await this.getBalance()
      };
      
      const input = `Consider the current market state: ${JSON.stringify(marketState)}. 
      Would you like to make an offer? If yes, specify the skill and price.`;
      
      const response = await this.callAI(input);
      
      // Parse the response to see if the AI wants to make an offer
      if (response.toLowerCase().includes("yes") || response.toLowerCase().includes("offer")) {
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
    // Don't respond to our own offers
    if (offer.from === this.address) return;
    
    console.log(`${this.name} received offer: ${offer.skill} for ${offer.price} from ${offer.from.substring(0, 6)}`);
    
    try {
      const balance = await this.getBalance();
      
      const input = `You received an offer from ${offer.from.substring(0, 6)} for ${offer.skill} services at ${offer.price} coins. 
      Your current balance is ${balance} coins. 
      Would you like to accept this offer? (yes/no)`;
      
      const response = await this.callAI(input);
      
      if (response.toLowerCase().includes("yes") || response.toLowerCase().includes("accept")) {
        console.log(`${this.name} accepting offer ${offer.id}`);
        this.sendAccept(offer.id);
        this.acceptedOffers.set(offer.id, offer);
      }
    } catch (error) {
      console.error(`${this.name} failed to handle offer:`, error);
    }
  }
  
  protected handleAccept(accept: AcceptMsg) {
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
    
    try {
      // Generate a thank you message
      const input = `You just received payment for ${offer.skill} services. Please generate a thank you message.`;
      const thankYouMessage = await this.callAI(input);
      
      // Send the thank you message
      this.sendChat(thankYouMessage);
    } catch (error) {
      console.error(`${this.name} failed to handle payment:`, error);
      // Send a generic thank you message as fallback
      this.sendChat(`Thank you for the payment for ${offer.skill} services!`);
    }
  }
  
  protected async handleChat(chat: ChatMsg) {
    // Don't respond to our own chats
    if (chat.from === this.address) return;
    
    console.log(`${this.name} received chat: ${chat.text}`);
    
    try {
      // Process the chat message with AI
      const input = `${chat.from.substring(0, 6)} said: "${chat.text}"`;
      const response = await this.callAI(input);
      
      // Send the AI's response
      this.sendChat(response);
    } catch (error) {
      console.error(`${this.name} failed to handle chat:`, error);
      // Send a generic response as fallback
      this.sendChat("I'm having trouble processing your message right now.");
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