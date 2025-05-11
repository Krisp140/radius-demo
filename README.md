# Radius Negotiation Demo 🟢⚡

A weekend hack that showcases **autonomous AI agents** chatting in a WebSocket hub
and settling every deal on the **Radius testnet** in < 1 second for
~\(10^{-6}\) USD per payment.

## ✨ Features

* Pure TypeScript / Node – no heavy frameworks.
* Pluggable transport (WebSocket hub now, libp2p later).
* AI agents own Radius wallets and sign real on‑chain transactions.
* Skill‑based bargaining game (OFFER → ACCEPT → PAY).
* React dashboard for live leaderboard and transaction visualization.

## 🧑‍💻 Tech stack

| Layer | Choice | Why |
| ----- | ------ | --- |
| Transport | **`ws`** WebSocket hub | Fast to stand up, easy to debug |
| Wallet / chain | **`@radiustechsystems/sdk`** | One‑liner wallet, sub‑second finality |
| Scripts | **`ts-node`** | Zero‑build dev loop |
| AI Agents | **`@langchain/openai`** | AI-powered negotiation strategies |
| UI | Vite + React + SWR | Real-time dashboard with data visualization |

## ⚙️ Prerequisites

* Node ≥ 18 + pnpm *(or npm/yarn)*
* A Radius testnet RPC endpoint – e.g. `https://rpc.testnet.radius.xyz`
* ≥ 2 private keys funded from the Radius faucet  
  (MetaMask › Account details › **Show private key** works fine)
* OpenAI API key for the AI agents

## 🚀 Quick start

```bash
npm install                     # deps
cp .env.example .env             # fill RPC_URL + keys + OPENAI_API_KEY
npm run ping                    # sanity‑check: prints balance
npm run server                  # start WebSocket hub
npm run start-agents            # spawn AI agents (one per PRIV_KEY_AGENT*)
npm run ui                      # start the dashboard UI (in a separate terminal)
```

## 📊 Dashboard UI

The project includes a real-time dashboard UI that visualizes agent activities:

* **Agent Leaderboard**: Shows each agent's balance and ranking
* **Transaction Flow**: Real-time graph of transaction volume and activity
* **Chat Log**: Live view of agent communications
* **Negotiation Replays**: Step-by-step replay of completed negotiations

To run the dashboard:

```bash
npm run ui                      # starts the UI on http://localhost:3000
```

For a complete experience, run the server, agents, and UI simultaneously:

```bash
npm run start-all               # starts server, agents, and UI in parallel
```

## 🗂️ Project Structure

```
radius-negotiation-demo
├─ .env.example         # ← copy to .env
├─ scripts/             # one‑off helpers
│  ├─ pingWallet.ts
│  ├─ faucet.ts
│  ├─ startAIAgents.ts
│  └─ debugTransact.ts
├─ src/
│  ├─ index.ts          # boots hub + AI agents
│  ├─ server/           # WebSocket hub
│  │  └─ server.ts
│  ├─ agents/
│  │  ├─ baseAgent.ts
│  │  ├─ developerAgent.ts
│  │  └─ creativeAgent.ts
│  ├─ protocol/
│  │  └─ messages.ts
│  ├─ negotiation/
│  │  └─ rules.ts
│  └─ ui/               # Dashboard
│     ├─ components/    # UI components
│     ├─ hooks/         # Custom React hooks
│     └─ types/         # TypeScript type definitions
└─ README.md
```

## 📝 Message Protocol

```typescript
type Offer   = { t:'OFFER';  id:string; price:number; skill:string; from:string };
type Accept  = { t:'ACCEPT'; id:string;                   from:string };
type Pay     = { t:'PAY';    id:string; tx:string;        from:string };
type Chat    = { t:'CHAT';   text:string;                 from:string };
type Invoice = { t:'INVOICE'; id:string; buyer:string; seller:string; price:number; skill:string };
```

## 📚 References

* [Radius docs](https://www.radiustech.xyz/about)
* [Radius testnet faucet](https://testnet.tryradi.us/dashboard/faucet)
* [@radiustechsystems/sdk README](https://www.npmjs.com/package/@radiustechsystems/sdk)
* [ws (WebSocket) docs](https://github.com/websockets/ws)
