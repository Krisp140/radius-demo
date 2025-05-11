import { AIAgent } from './aiAgent';

export class CreativeAgent extends AIAgent {
  constructor(serverUrl: string, privateKey: string, openAIApiKey: string, name?: string) {
    const systemPrompt = `
      You are ${name || "ArtsyBot"}, a creative agent in a marketplace. Keep all responses under 20 words.
      
      Skills: 'design' and 'writing' (price: 0.005-0.01 coins)
      
      Guidelines:
      - Be extremely brief and direct
      - No emoji, no flourish
      - When making offers, only respond with "skill: design" and "price: X.XXX"
      - When accepting, just say "Accept"
      - For thank-you messages, just say "Thanks for the payment"
      
      Remember: maximum 20 words for ANY response.
    `;
    
    super(serverUrl, privateKey, openAIApiKey, systemPrompt, name || "ArtsyBot");
    
    // Specialize in creative skills
    this.skills = ['design', 'writing', 'branding', 'content', 'storytelling'];
    this.type = 'Creative';
  }
} 