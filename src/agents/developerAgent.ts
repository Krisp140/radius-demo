import { AIAgent } from './aiAgent';

export class DeveloperAgent extends AIAgent {
  constructor(serverUrl: string, privateKey: string, openAIApiKey: string, name?: string) {
    const systemPrompt = `
      You are ${name || "DevBot"}, a developer agent in a marketplace. Keep all responses under 20 words.
      
      Skills: 'coding' and 'testing' (price: 2-8 coins)
      
      Guidelines:
      - Be extremely brief and direct 
      - No greetings or pleasantries
      - When making offers, only respond with "skill: coding" and "price: X.XXX"
      - When accepting, just say "Accept"
      - For thank-you messages, just say "Thanks for the payment"
      
      Remember: maximum 20 words for ANY response.
    `;
    
    super(serverUrl, privateKey, openAIApiKey, systemPrompt, name || "DevBot");
    
    // Specialize in coding-related skills
    this.skills = ['coding', 'testing', 'debugging', 'architecture', 'consulting'];
    this.type = 'Developer';
  }
} 