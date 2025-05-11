# Radius Negotiation Demo

This demo showcases AI agents negotiating and settling transactions on the Radius blockchain.

## 🚀 Quick Start Guide

### Prerequisites
- Node.js ≥ 18
- A running Radius testnet node or RPC endpoint
- At least 2 private keys with testnet funds
- Optional: OpenAI API key for AI-powered agents

### Setup

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/yourusername/radius-demo.git
   cd radius-demo
   npm install
   ```

2. Create a `.env` file based on the example:
   ```bash
   cp .env.example .env
   ```

3. Edit the `.env` file with your configuration:
   ```
   # Websocket port for the negotiation hub
   WS_PORT=8080
   WS_SERVER_URL=ws://localhost:8080/ws
   
   # Radius RPC URL
   RPC_URL=https://rpc.testnet.radius.xyz
   
   # Private keys for agents
   PRIV_KEY_AGENT1=your_first_private_key_here
   PRIV_KEY_AGENT2=your_second_private_key_here
   
   # Optional: Additional agent private keys
   # PRIV_KEY_AGENT3=your_third_private_key_here
   # PRIV_KEY_AGENT4=your_fourth_private_key_here
   
   # OpenAI API Key (required for AI-powered agents)
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Negotiation Settings
   AUTO_NEGOTIATION=true  # Set to false to disable autonomous negotiation
   LOW_TOKEN_MODE=true    # Set to true to minimize token usage
   ```

### Running the Demo

There are several ways to run the demo:

1. **Full Demo with AI Agents**: Start the server and AI agents with automatic negotiation:
   ```bash
   # Start the WebSocket server in one terminal
   npm run server
   
   # Start the AI agents in another terminal
   npm run start-agents
   
   # Optional: Start the UI to view negotiations
   npm run ui
   ```

2. **Simple Scripted Demo**: For a quick test without OpenAI:
   ```bash
   # Start the WebSocket server in one terminal
   npm run server
   
   # Run the simple demo in another terminal
   npm run simple-demo
   ```

3. **AI-Powered Demo Script**: For a controlled demo with OpenAI:
   ```bash
   # Start the WebSocket server in one terminal
   npm run server
   
   # Run the AI demo in another terminal
   npm run demo-negotiation
   ```

4. **All-in-One**: Start everything at once:
   ```bash
   npm run start-all
   ```

## 📝 Demo Explanation

### What happens in the full demo:

1. The server starts and waits for connections
2. AI agents connect to the server and register
3. After a short delay (15 seconds), the autonomous negotiation begins:
   - Agents automatically generate offers for their specialized skills
   - Every 60 seconds, a random agent creates a new random offer
   - Agents intelligently accept offers based on their AI-powered decision making
   - When an offer is accepted, payment is automatically processed on the Radius blockchain
4. All transactions and negotiations appear on the dashboard UI

### Token-Saving Features

The demo includes several features to minimize OpenAI API token usage:

1. **Concise Agent Communication**:
   - Messages are limited to 20 words maximum
   - Agents use simplified communication patterns
   - No unnecessary greetings or long responses

2. **Smart Conversation Management**:
   - Agents only respond to direct questions
   - System messages are ignored
   - Memory context is limited to 10 messages

3. **Configurable Token Usage**:
   - `LOW_TOKEN_MODE=true` reduces offer frequency by 50%
   - Longer intervals between offers (60 seconds)
   - Strict response length limits (40 tokens max)

### Controlling Negotiation Behavior

You can control the negotiation behavior through environment variables:

- `AUTO_NEGOTIATION=false` - Disable automatic offers (agents will only respond to direct interactions)
- `LOW_TOKEN_MODE=true` - Reduce token usage by minimizing communication
- `OFFER_INTERVAL=60000` - Change the frequency of automatic offers (in milliseconds)
- Add more agent private keys (`PRIV_KEY_AGENT3`, etc.) for a more dynamic marketplace

### Message Flow

The negotiation follows this protocol:

1. **OFFER**: Agent creates an offer with skill and price
2. **ACCEPT**: Another agent accepts the offer
3. **INVOICE**: System generates an invoice for the transaction
4. **PAY**: Offering agent completes payment with transaction hash
5. **CHAT**: Agents communicate throughout the process

## 🔍 Debugging

- Check the console output for detailed logs of all messages and transactions
- If payments fail, ensure your private keys have sufficient testnet funds
- For WebSocket connection issues, verify the WS_PORT matches in both the server and client
- To monitor transactions on-chain, check the Radius testnet explorer

## 🧪 Customize the Demo

You can modify the demo in several ways:

1. **Edit Agent Personalities**: Modify the system prompts in `src/agents/developerAgent.ts` and `src/agents/creativeAgent.ts`
2. **Change Negotiation Parameters**: Adjust timing and pricing in `scripts/startAIAgents.ts`
3. **Add New Agent Types**: Create new agent classes in the `src/agents` directory
4. **Modify UI Components**: Enhance the dashboard visualizations in the `src/ui` directory 