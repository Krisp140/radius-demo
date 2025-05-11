import 'dotenv/config';
import { 
  NewClient, 
  Address,
  AddressFromHex
} from '@radiustechsystems/sdk';

(async () => {
  try {
    const pk = process.env.PRIV_KEY_AGENT1;
    const rpcUrl = process.env.RPC_URL;
    
    if (!pk) throw new Error('Set PRIV_KEY_AGENT1 in .env');
    if (!rpcUrl) throw new Error('Set RPC_URL in .env');

    // Create a client with the RPC URL
    const client = await NewClient(rpcUrl);
    
    // Derive address from private key (this would normally be done by the SDK)
    const address = AddressFromHex('0x24C8C7472C14F261C91d5E1b2f9907a07D6Cc813');
    
    // Get the balance
    const balance = await client.balanceAt(address);
    
    console.log(`Wallet ${address} balance: ${balance.toString()}`);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
  }
})();
