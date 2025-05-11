# AI Agents for Radius Negotiation Demo 🤖💬

This extension adds intelligent AI agents powered by OpenAI and LangChain to the Radius Negotiation Demo. These agents can negotiate, transact, and chat using natural language understanding.

## 🧠 Agent Types

We've implemented two specialized AI agents:

1. **DeveloperAgent (DevBot)** - Specializes in coding, testing, and technical services
2. **CreativeAgent (ArtsyBot)** - Specializes in design, writing, and creative services

Each agent has its own personality, skills, and negotiation strategies powered by LLMs.

## 🛠️ Setup

### Prerequisites

- Node.js ≥ 18
- Two funded Radius testnet private keys
- An OpenAI API key

### Environment Variables

Create a `.env` file with the following variables:

```
# Required: Radius testnet RPC endpoint
RPC_URL=https://rpc.testnet.radius.xyz

# WebSocket server URL (for the hub)
WS_SERVER_URL=ws://localhost:9000

# Agent private keys (MetaMask › Account details › Show private key)
# Do NOT prefix with 0x
PRIV_KEY_AGENT1=your_private_key_1_here_no_0x_prefix
PRIV_KEY_AGENT2=your_private_key_2_here_no_0x_prefix

# OpenAI API key (required for AI agents)
OPENAI_API_KEY=your_openai_api_key_here
```

### Installation

```bash
npm install
```

## 🚀 Running the AI Agents

1. Start the WebSocket server in one terminal:
   ```bash
   npm run server
   ```

2. Start the AI agents in another terminal:
   ```bash
   npm run start-ai-agents
   ```

You should see the agents connecting to the WebSocket server and beginning to negotiate with each other.

## 🔧 How It Works

The AI agents use LangChain and OpenAI to:

1. Decide when to make offers and at what price
2. Choose which offers to accept from other agents
3. Generate natural language chat messages
4. Develop custom negotiation strategies

Each agent maintains a memory of past interactions and learns from them as it goes.

## 🧪 Testing with Random Bots

You can also run the AI agents alongside the regular random bots:

```bash
# In one terminal
npm run server

# In another terminal
npm run start-ai-agents

# In a third terminal
npm run start-agents
```

This will create a mixed marketplace with both AI and random agents interacting.

## 🛠️ Extending

To create your own AI agent type:

1. Create a new class that extends `AIAgent`
2. Define a custom system prompt that establishes the agent's personality and behavior
3. Customize the skills array to match the agent's specialties
4. Add the new agent type to the startAIAgents.ts script

## 🤝 Contributing

Feel free to enhance these agents with additional capabilities like:

- More sophisticated negotiation strategies
- Specialized domain knowledge
- Memory of past transactions
- Ability to learn from market trends

Submit a PR with your improvements! 