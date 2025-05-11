import 'dotenv/config';
import { DeveloperAgent } from '../src/agents/developerAgent';
import { CreativeAgent } from '../src/agents/creativeAgent';
import { BaseAgent } from '../src/agents/baseAgent';
import { AddressFromHex, NewClient } from '@radiustechsystems/sdk';

// Configuration
const SERVER_URL = process.env.WS_SERVER_URL || 'ws://localhost:8080/ws';
const AGENT_KEY_PREFIX = 'PRIV_KEY_AGENT';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const RPC_URL = process.env.RPC_URL || '';

// Negotiation settings
const INIT_NEGOTIATION_DELAY = 15000; // 15 seconds after startup
const OFFER_INTERVAL = 60000; // 60 seconds between automated offers (increased from 30s)
const AUTO_NEGOTIATION = process.env.AUTO_NEGOTIATION !== 'false'; // Enable by default, disable with AUTO_NEGOTIATION=false
const LOW_TOKEN_MODE = process.env.LOW_TOKEN_MODE === 'true'; // Set to true to further reduce token usage

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

// Agent configuration
type AgentConfig = {
  privateKey: string;
  type: 'developer' | 'creative';
  name?: string;
};

// Store agents for access
const agents: BaseAgent[] = [];

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

// Function to generate an agent config array from environment variables
function getAgentConfigsFromEnv(): AgentConfig[] {
  const configs: AgentConfig[] = [];
  
  // Find agent private keys in environment variables
  for (const key in process.env) {
    if (key.startsWith(AGENT_KEY_PREFIX)) {
      const privateKey = process.env[key];
      if (privateKey) {
        try {
          const sanitizedKey = sanitizePrivateKey(privateKey);
          
          // Alternate between developer and creative types based on key number
          // Extract the number from the environment variable name
          const keyNumMatch = key.match(/(\d+)$/);
          const keyNum = keyNumMatch ? parseInt(keyNumMatch[1]) : 0;
          const type = keyNum % 2 === 1 ? 'developer' : 'creative';
          
          // Create default name based on type
          const name = type === 'developer' ? `DevBot${keyNum}` : `ArtsyBot${keyNum}`;
          
          configs.push({
            privateKey: sanitizedKey,
            type,
            name
          });
        } catch (error) {
          console.error(`${colors.red}Invalid private key format for ${key}:${colors.reset}`, error);
        }
      }
    }
  }
  
  return configs;
}

// Function to create an agent based on configuration
async function createAgent(config: AgentConfig): Promise<BaseAgent | null> {
  try {
    console.log(`${colors.green}🚀 Starting ${config.name}...${colors.reset}`);
    console.log(`${colors.blue}Private key: ${config.privateKey.substring(0, 6)}...${config.privateKey.substring(config.privateKey.length - 4)}${colors.reset}`);
    
    // Derive address for display
    const hash = require('crypto').createHash('sha256');
    hash.update(config.privateKey);
    const digest = hash.digest('hex');
    const derivedAddress = '0x' + digest.substring(0, 40);
    
    // Check balance directly before agent creation
    console.log(`${colors.blue}Checking wallet balance directly...${colors.reset}`);
    const directBalance = await checkBalance(derivedAddress);
    console.log(`${colors.yellow}Pre-init balance check: ${directBalance} coins${colors.reset}`);
    
    // Create the appropriate agent type
    let agent: BaseAgent;
    
    if (config.type === 'developer') {
      agent = new DeveloperAgent(SERVER_URL, config.privateKey, OPENAI_API_KEY, config.name);
    } else {
      agent = new CreativeAgent(SERVER_URL, config.privateKey, OPENAI_API_KEY, config.name);
    }
    
    const address = agent.getAddress();
    console.log(`${colors.green}✅ ${config.name} started successfully${colors.reset}`);
    console.log(`${colors.blue}Address: ${address}${colors.reset}`);
    
    // Test getting the balance via agent
    console.log(`${colors.blue}Checking balance via agent...${colors.reset}`);
    try {
      const balance = await agent.getBalance();
      console.log(`${colors.magenta}${config.name} balance: ${balance} coins${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}❌ Failed to get balance for ${config.name}:${colors.reset}`, error);
    }
    
    console.log(`${colors.cyan}════════════════════════════════════${colors.reset}\n`);
    return agent;
  } catch (error) {
    console.error(`${colors.red}❌ Failed to start ${config.type} agent:${colors.reset}`, error);
    return null;
  }
}

// Setup autonomous negotiation between agents
function setupNegotiation() {
  if (!AUTO_NEGOTIATION) {
    console.log(`${colors.yellow}Autonomous negotiation is disabled. Set AUTO_NEGOTIATION=true in .env to enable.${colors.reset}`);
    return;
  }

  if (agents.length < 2) {
    console.log(`${colors.yellow}Autonomous negotiation requires at least 2 agents.${colors.reset}`);
    return;
  }

  console.log(`${colors.green}Setting up autonomous negotiation between agents...${colors.reset}`);
  
  // Start the negotiation cycle after initial delay
  setTimeout(() => {
    triggerInitialNegotiation();
    
    // Set up recurring offers at regular intervals
    setInterval(() => {
      triggerRandomOffer();
    }, OFFER_INTERVAL);
  }, INIT_NEGOTIATION_DELAY);
}

// Trigger initial negotiations between the first two agents
function triggerInitialNegotiation() {
  if (agents.length < 2) return;
  
  const devAgent = agents.find(a => a instanceof DeveloperAgent);
  const creativeAgent = agents.find(a => a instanceof CreativeAgent);
  
  if (!devAgent || !creativeAgent) {
    console.log(`${colors.yellow}Cannot start negotiation - need both developer and creative agent types${colors.reset}`);
    return;
  }
  
  console.log(`${colors.cyan}🔄 Triggering initial negotiation sequence...${colors.reset}`);
  
  // Developer agent offers coding services
  setTimeout(() => {
    const skill = 'coding';
    const price = 0.005;
    console.log(`${colors.magenta}${devAgent.constructor.name} is offering ${skill} services for ${price} coins${colors.reset}`);
    // Access the protected method using indexing
    const offerId = devAgent['sendOffer'](skill, price);
    console.log(`${colors.blue}Offer created: ${offerId}${colors.reset}`);
  }, 2000);
  
  // Creative agent offers design services
  setTimeout(() => {
    const skill = 'design';
    const price = 0.008;
    console.log(`${colors.magenta}${creativeAgent.constructor.name} is offering ${skill} services for ${price} coins${colors.reset}`);
    // Access the protected method using indexing
    const offerId = creativeAgent['sendOffer'](skill, price);
    console.log(`${colors.blue}Offer created: ${offerId}${colors.reset}`);
  }, 5000);
}

// Trigger a random offer from a random agent
function triggerRandomOffer() {
  if (agents.length === 0) return;
  
  // In low token mode, reduce the chance of making an offer
  if (LOW_TOKEN_MODE && Math.random() > 0.5) {
    console.log(`${colors.yellow}Skipping random offer to save tokens (LOW_TOKEN_MODE)${colors.reset}`);
    return;
  }
  
  // Select a random agent
  const randomAgent = agents[Math.floor(Math.random() * agents.length)];
  
  // Determine the agent type and skills
  const isDevAgent = randomAgent instanceof DeveloperAgent;
  const skills = isDevAgent ? 
    ['coding', 'testing', 'debugging'] : 
    ['design', 'writing', 'branding'];
  
  // Select a random skill and generate a price
  const skill = skills[Math.floor(Math.random() * skills.length)];
  const price = (0.003 + Math.random() * 0.008).toFixed(3);
  
  console.log(`${colors.cyan}🔄 Triggering random offer...${colors.reset}`);
  console.log(`${colors.magenta}${randomAgent.constructor.name} is offering ${skill} services for ${price} coins${colors.reset}`);
  
  // Access the protected method using indexing
  const offerId = randomAgent['sendOffer'](skill, parseFloat(price));
  console.log(`${colors.blue}Offer created: ${offerId}${colors.reset}`);
}

// Start agents based on configuration
async function startAgents() {
  console.log(`\n${colors.cyan}════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}    STARTING AI AGENTS ON RADIUS    ${colors.reset}`);
  console.log(`${colors.cyan}════════════════════════════════════${colors.reset}\n`);
  
  console.log(`${colors.blue}RPC URL: ${RPC_URL}${colors.reset}`);
  console.log(`${colors.blue}Server URL: ${SERVER_URL}${colors.reset}`);
  console.log(`${colors.blue}Auto Negotiation: ${AUTO_NEGOTIATION ? 'Enabled' : 'Disabled'}${colors.reset}`);
  console.log(`${colors.blue}Low Token Mode: ${LOW_TOKEN_MODE ? 'Enabled' : 'Disabled'}${colors.reset}\n`);
  
  // Get agent configurations from environment variables
  const agentConfigs = getAgentConfigsFromEnv();
  
  if (agentConfigs.length < 2) {
    console.error(`${colors.red}❌ At least 2 agent private keys are required. Add them to .env as PRIV_KEY_AGENT1, PRIV_KEY_AGENT2, etc.${colors.reset}`);
    process.exit(1);
  }
  
  console.log(`${colors.blue}Found ${agentConfigs.length} agent configurations${colors.reset}`);
  
  // Create agents based on configuration
  for (const config of agentConfigs) {
    const agent = await createAgent(config);
    if (agent) {
      agents.push(agent);
    }
  }
  
  console.log(`${colors.green}Started ${agents.length} AI agents${colors.reset}`);

  if (agents.length === 0) {
    console.error(`${colors.red}❌ No agents could be started. Check errors above and fix environment variables.${colors.reset}`);
    process.exit(1);
  }
  
  // Set up autonomous negotiation if enabled
  setupNegotiation();
}

// Handle process termination
const cleanup = () => {
  console.log(`${colors.yellow}Shutting down agents...${colors.reset}`);
  agents.forEach(agent => agent.disconnect());
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start the agents
startAgents().catch(error => {
  console.error(`${colors.red}Failed to start agents:${colors.reset}`, error);
  process.exit(1);
}); 