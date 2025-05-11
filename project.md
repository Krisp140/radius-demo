# Radius Negotiation Demo 🟢⚡

A weekend hack that showcases **autonomous AI agents** chatting in a WebSocket hub
and settling every deal on the **Radius testnet** in < 1 second for
~\(10^{-6}\) USD per payment.

---

## ✨ Features

* Pure TypeScript / Node – no heavy frameworks.
* Pluggable transport (WebSocket hub now, libp2p later).
* AI agents own Radius wallets and sign real on‑chain transactions.
* Skill‑based bargaining game (OFFER → ACCEPT → PAY).
* Optional React dashboard for live leaderboard.

---

## 🧑‍💻 Tech stack

| Layer | Choice | Why |
| ----- | ------ | --- |
| Transport | **`ws`** WebSocket hub | Fast to stand up, easy to debug |
| Wallet / chain | **`@radiustechsystems/sdk`** | One‑liner wallet, sub‑second finality |
| Scripts | **`ts-node`** | Zero‑build dev loop |
| AI Agents | **`@langchain/openai`** | AI-powered negotiation strategies |
| UI *(opt.)* | Vite + React + SWR | 5‑min scaffolding, hot‑reload |

---

## ⚙️ Prerequisites

* Node ≥ 18 + pnpm *(or npm/yarn)*
* A Radius testnet RPC endpoint – e.g. `https://rpc.testnet.radius.xyz`
* ≥ 2 private keys funded from the Radius faucet  
  (MetaMask › Account details › **Show private key** works fine)
* OpenAI API key for the AI agents

---

## 🚀 Quick start

```bash
pnpm install                     # deps
cp .env.example .env             # fill RPC_URL + keys + OPENAI_API_KEY
pnpm ts-node scripts/pingWallet  # sanity‑check: prints balance
pnpm server                      # start WebSocket hub
pnpm start-agents                # spawn AI agents (one per PRIV_KEY_AGENT*)
```

radius-negotiation-demo
├─ .env.example         # ← copy to .env
├─ scripts/             # one‑off helpers
│  ├─ pingWallet.ts
│  ├─ faucet.ts
│  ├─ startAIAgents.ts
│  └─ debugTransact.ts
├─ src/
│  ├─ index.ts          # boots hub + AI agents (handy for demos)
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
│  └─ ui/               # (optional) dashboard
└─ README.md

Message Protocol (v.01)

type Offer   = { t:'OFFER';  id:string; price:number; skill:string; from:string };
type Accept  = { t:'ACCEPT'; id:string;                   from:string };
type Pay     = { t:'PAY';    id:string; tx:string;        from:string };
type Chat    = { t:'CHAT';   text:string;                 from:string };
type Invoice = { t:'INVOICE'; id:string; buyer:string; seller:string; price:number };

🗺️ Roadmap / TODO
ID	Label	Description	ETA
#1	todo-setup	Finalise repo scaffold & env scripts	done
#2	todo-hub	WebSocket hub broadcast + logging	done
#3	todo-wallet	Radius wallet integration in BaseAgent	done
#4	todo-logic	RandomBot offer/accept behaviour	Sun 11 AM
#5	todo-pay	Invoice → PAY flow w/ tx hash echo	Sun 12 PM
#6	todo-ui	React leaderboard polling balances	Sun 3 PM
#7	todo-load	Containerise 1000‑bot stress test	Sun 5 PM
#8	todo-p2p	Swap hub for libp2p mesh	later
#9	todo-escrow	Solidity escrow for multi‑step jobs	later

References

    Radius docs – https://www.radiustech.xyz/about

    Radius testnet faucet – https://testnet.tryradi.us/dashboard/faucet

    @radiustechsystems/sdk README – NPM registry

    ws (WebSocket) docs – https://github.com/websockets/ws


## 📝 Changelog

**v0.1.0** - Initial Setup (completed)
- [x] Project scaffold created
- [x] Environment scripts configured
- [x] Basic documentation added

**v0.2.0** - WebSocket Hub (completed)
- [x] WebSocket server implementation
- [x] Message broadcasting
- [x] Client connection tracking
- [x] System message handling

**v0.3.0** - Wallet Integration (completed)
- [x] Radius SDK integration
- [x] Wallet management in BaseAgent
- [x] Transaction signing capabilities
- [x] Balance checking functionality

**v0.4.0** - Negotiation Logic (completed)
- [x] Agent-to-agent communication
- [x] Offer/Accept protocol implementation
- [x] AI-powered negotiation strategies
- [x] Random bot behavior implementation

**v0.5.0** - Payment System (completed)
- [x] Invoice generation flow
- [x] Payment validation
- [x] Transaction hash verification
- [x] On-chain settlement

**v0.6.0** - UI & Monitoring (in progress)
- [x] React dashboard scaffold
- [x] Leaderboard implementation
- [x] Balance polling
- [x] Transaction history display
- [ ] Real-time analytics

**v0.7.0** - Spectator Mode (completed)
- [x] Connection type differentiation (agent vs spectator)
- [x] Selective message broadcasting
- [x] Read-only interface for spectators
- [x] User-friendly agent name generation

**v0.8.0** - Performance Testing (planned)
- [ ] Containerization setup
- [ ] Multi-agent environment
- [ ] 1000-bot stress test
- [ ] Performance metrics capture

**Future Plans**
- [ ] P2P mesh network (replace centralized hub)
- [ ] Smart contract escrow for multi-step jobs
- [ ] Mobile-friendly interface
- [ ] Custom agent personalities

✅ Milestones checklist

Ping wallet balance

Two‑bot deal end‑to‑end

Scale to 10+ bots

Leaderboard UI

Stress‑test > 500 tx/s

Blog‑post wrap‑up