import 'dotenv/config';
import { wss } from './server/server';
import { DeveloperAgent } from './agents/developerAgent';
import { CreativeAgent } from './agents/creativeAgent';
import { AddressFromHex, NewClient } from '@radiustechsystems/sdk';

// Configuration
const AGENT_KEY_PREFIX = 'PRIV_KEY_AGENT';
const SERVER_URL = 'ws://localhost:9000';
const STARTUP_DELAY = 2000; // 2 seconds
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const RPC_URL = process.env.RPC_URL || '';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

// Validate necessary environment variables
if (!OPENAI_API_KEY) {
  console.error(`${colors.red}❌ OPENAI_API_KEY environment variable is required. Please add it to your .env file.${colors.reset}`);
  process.exit(1);
}

if (!RPC_URL) {
  console.error(`${colors.red}❌ RPC_URL environment variable is required. Please add it to your .env file.${colors.reset}`);
  process.exit(1);
}

// Function to sanitize private key format
function sanitizePrivateKey(privateKey: string): string {
  // Remove leading 0x if present
  if (privateKey.startsWith('0x')) {
    privateKey = privateKey.substring(2);
  }
  
  // Ensure it's a valid hex string
  if (!/^[0-9a-fA-F]+$/.test(privateKey)) {
    throw new Error('Private key must be a valid hex string');
  }
  
  // Ensure it's 64 characters (32 bytes)
  if (privateKey.length !== 64) {
    throw new Error('Private key must be 32 bytes (64 hex characters)');
  }
  
  return privateKey;
}

// Function to check balance directly using Radius SDK
async function checkBalance(address: string): Promise<string> {
  try {
    const client = await NewClient(RPC_URL);
    const addressObj = AddressFromHex(address);
    const balance = await client.balanceAt(addressObj);
    return balance.toString();
  } catch (error) {
    console.error(`${colors.red}Error checking balance:${colors.reset}`, error);
    return "Error";
  }
}

console.log(`${colors.green}🚀 Starting Radius Negotiation Demo${colors.reset}`);
console.log(`${colors.green}✅ WebSocket hub is running${colors.reset}`);

// Find all agent private keys in environment variables
const agentKeys: string[] = [];
for (const key in process.env) {
  if (key.startsWith(AGENT_KEY_PREFIX)) {
    const privateKey = process.env[key];
    if (privateKey) {
      try {
        agentKeys.push(sanitizePrivateKey(privateKey));
      } catch (error) {
        console.error(`${colors.red}Invalid private key format for ${key}:${colors.reset}`, error);
      }
    }
  }
}

console.log(`${colors.blue}Found ${agentKeys.length} agent private keys in environment variables${colors.reset}`);

if (agentKeys.length < 2) {
  console.error(`${colors.red}❌ At least 2 agent private keys are required. Add them to .env as PRIV_KEY_AGENT1, PRIV_KEY_AGENT2, etc.${colors.reset}`);
  process.exit(1);
}

// Start agents after a short delay to ensure the server is ready
setTimeout(async () => {
  const agents: (DeveloperAgent | CreativeAgent)[] = [];

  // Create a developer agent with the first key
  try {
    const developerKey = agentKeys[0];
    console.log(`${colors.green}🚀 Starting DevBot...${colors.reset}`);
    // Don't log the full private key for security reasons
    console.log(`${colors.blue}Private key: ${developerKey.substring(0, 6)}...${developerKey.substring(developerKey.length - 4)}${colors.reset}`);
    
    // Derive address for display before agent creation
    const hash = require('crypto').createHash('sha256');
    hash.update(developerKey);
    const digest = hash.digest('hex');
    const derivedAddress = '0x' + digest.substring(0, 40);
    
    // Check balance directly before agent creation
    console.log(`${colors.blue}Checking wallet balance directly...${colors.reset}`);
    const directBalance = await checkBalance(derivedAddress);
    console.log(`${colors.yellow}Pre-init balance check: ${directBalance} coins${colors.reset}`);
    
    const devAgent = new DeveloperAgent(SERVER_URL, developerKey, OPENAI_API_KEY, "DevBot");
    agents.push(devAgent);
    
    const devAddress = devAgent.getAddress();
    console.log(`${colors.green}✅ DevBot started successfully${colors.reset}`);
    console.log(`${colors.blue}Address: ${devAddress}${colors.reset}`);
    
    // Test getting the balance via agent
    console.log(`${colors.blue}Checking balance via agent...${colors.reset}`);
    try {
      const balance = await devAgent.getBalance();
      console.log(`${colors.magenta}DevBot balance: ${balance} coins${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}❌ Failed to get balance for DevBot:${colors.reset}`, error);
    }
  } catch (error) {
    console.error(`${colors.red}❌ Failed to start developer agent:${colors.reset}`, error);
  }

  // Create a creative agent with the second key
  try {
    const creativeKey = agentKeys[1];
    console.log(`${colors.green}🚀 Starting ArtsyBot...${colors.reset}`);
    // Don't log the full private key for security reasons
    console.log(`${colors.blue}Private key: ${creativeKey.substring(0, 6)}...${creativeKey.substring(creativeKey.length - 4)}${colors.reset}`);
    
    // Derive address for display before agent creation
    const hash = require('crypto').createHash('sha256');
    hash.update(creativeKey);
    const digest = hash.digest('hex');
    const derivedAddress = '0x' + digest.substring(0, 40);
    
    // Check balance directly before agent creation
    console.log(`${colors.blue}Checking wallet balance directly...${colors.reset}`);
    const directBalance = await checkBalance(derivedAddress);
    console.log(`${colors.yellow}Pre-init balance check: ${directBalance} coins${colors.reset}`);
    
    const creativeAgent = new CreativeAgent(SERVER_URL, creativeKey, OPENAI_API_KEY, "ArtsyBot");
    agents.push(creativeAgent);
    
    const creativeAddress = creativeAgent.getAddress();
    console.log(`${colors.green}✅ ArtsyBot started successfully${colors.reset}`);
    console.log(`${colors.blue}Address: ${creativeAddress}${colors.reset}`);
    
    // Test getting the balance
    console.log(`${colors.blue}Checking balance via agent...${colors.reset}`);
    try {
      const balance = await creativeAgent.getBalance();
      console.log(`${colors.magenta}ArtsyBot balance: ${balance} coins${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}❌ Failed to get balance for ArtsyBot:${colors.reset}`, error);
    }
  } catch (error) {
    console.error(`${colors.red}❌ Failed to start creative agent:${colors.reset}`, error);
  }

  console.log(`${colors.green}Started ${agents.length} AI agents${colors.reset}`);

  if (agents.length === 0) {
    console.error(`${colors.red}❌ No agents could be started. Check errors above and fix environment variables.${colors.reset}`);
    process.exit(1);
  }

  // Handle process termination
  const cleanup = () => {
    console.log(`${colors.yellow}Shutting down agents and server...${colors.reset}`);
    agents.forEach(agent => agent.disconnect());
    wss.close();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}, STARTUP_DELAY);

// Print instructions
console.log('\n📝 Instructions:');
console.log('- View real-time logs above for agent activity');
console.log('- AI Agents will autonomously negotiate and make payments');
console.log('- Press Ctrl+C to stop the demo\n'); 