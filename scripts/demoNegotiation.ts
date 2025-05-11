import 'dotenv/config';
import { DeveloperAgent } from '../src/agents/developerAgent';
import { CreativeAgent } from '../src/agents/creativeAgent';

// Configuration
const SERVER_URL = `ws://localhost:${process.env.WS_PORT || 8080}/ws`;

// Check for required environment variables
const requiredEnvVars = ['PRIV_KEY_AGENT1', 'PRIV_KEY_AGENT2', 'OPENAI_API_KEY', 'RPC_URL'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Initialize agents
console.log('🚀 Initializing agents...');

const devBot = new DeveloperAgent(
  SERVER_URL,
  process.env.PRIV_KEY_AGENT1 as string,
  process.env.OPENAI_API_KEY as string,
  'DevBot'
);

const artsyBot = new CreativeAgent(
  SERVER_URL,
  process.env.PRIV_KEY_AGENT2 as string,
  process.env.OPENAI_API_KEY as string,
  'ArtsyBot'
);

// Force generate specific offers for demo purposes
setTimeout(() => {
  console.log('🔄 Triggering DevBot to make a coding offer...');
  triggerDevBotOffer();
}, 5000);

setTimeout(() => {
  console.log('🔄 Triggering ArtsyBot to make a design offer...');
  triggerArtsyBotOffer();
}, 8000);

// Helper to trigger specific offers
function triggerDevBotOffer() {
  const offerId = devBot['sendOffer']('coding', 0.005);
  console.log(`DevBot created offer: ${offerId} for coding services at 0.005 coins`);
  
  // Simulate ArtsyBot accepting this offer after 3 seconds
  setTimeout(() => {
    console.log('ArtsyBot accepting DevBot\'s coding offer...');
    artsyBot['sendAccept'](offerId);
    // After accepting, the DevBot will automatically process payment
  }, 3000);
}

function triggerArtsyBotOffer() {
  const offerId = artsyBot['sendOffer']('design', 0.008);
  console.log(`ArtsyBot created offer: ${offerId} for design services at 0.008 coins`);
  
  // Simulate DevBot accepting this offer after 5 seconds
  setTimeout(() => {
    console.log('DevBot accepting ArtsyBot\'s design offer...');
    devBot['sendAccept'](offerId);
    // After accepting, the ArtsyBot will automatically process payment
  }, 5000);
}

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