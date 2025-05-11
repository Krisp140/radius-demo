# Radius Negotiation Demo 🟢⚡

A weekend hack that showcases **autonomous agents** chatting in a WebSocket hub
and settling every deal on the **Radius testnet** in < 1 second for
~\(10^{-6}\) USD per payment.

## ✨ Features

* Pure TypeScript / Node – no heavy frameworks.
* Pluggable transport (WebSocket hub now, libp2p later).
* Agents own Radius wallets and sign real on‑chain transactions.
* Skill‑based bargaining game (OFFER → ACCEPT → PAY).
* Optional React dashboard for live leaderboard.

## 🧑‍💻 Tech stack

| Layer | Choice | Why |
| ----- | ------ | --- |
| Transport | **`ws`** WebSocket hub | Fast to stand up, easy to debug |
| Wallet / chain | **`@radiustechsystems/sdk`** | One‑liner wallet, sub‑second finality |
| Scripts | **`ts-node`** | Zero‑build dev loop |
| Bots | TypeScript classes | Easy to extend with more strategies |
| UI *(opt.)* | Vite + React + SWR | 5‑min scaffolding, hot‑reload |

## ⚙️ Prerequisites

* Node ≥ 18 + pnpm *(or npm/yarn)*
* A Radius testnet RPC endpoint – e.g. `https://rpc.testnet.radius.xyz`
* ≥ 2 private keys funded from the Radius faucet  
  (MetaMask › Account details › **Show private key** works fine)

## 🚀 Quick start

```bash
# Install dependencies
pnpm install

# Copy example env file and fill in your RPC_URL and private keys
cp .env.example .env

# Test wallet connection
pnpm ping

# Start the WebSocket server
pnpm server

# In a separate terminal, start the agents
pnpm start-agents

# Or run both server and agents in one command
pnpm dev
```

## 🤖 How it works

1. Agents connect to the WebSocket hub
2. They randomly make offers for services (coding, design, etc.)
3. Other agents may accept these offers
4. When an offer is accepted, the offering agent pays the accepting agent
5. All payments happen on the Radius testnet blockchain

## 🗺️ Project Structure

```
radius-negotiation-demo
├─ .env.example         # ← copy to .env
├─ scripts/             # one‑off helpers
│  ├─ pingWallet.ts
│  ├─ faucet.ts
│  └─ startAgents.ts
├─ src/
│  ├─ index.ts          # boots hub + bots (handy for demos)
│  ├─ server/           # WebSocket hub
│  │  └─ server.ts
│  ├─ agents/
│  │  ├─ baseAgent.ts
│  │  └─ randomBot.ts
│  ├─ protocol/
│  │  └─ messages.ts
│  ├─ negotiation/
│  │  └─ rules.ts
│  └─ ui/               # (optional) dashboard
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
