import 'dotenv/config';
import { 
  NewClient, 
  AddressFromHex,
  NewAccount,
  withPrivateKey
} from '@radiustechsystems/sdk';

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

// Mock function to derive an address from a private key
function deriveAddress(privateKey: string): string {
  // For demo purposes, we'll use a deterministic but fake derivation
  const hash = require('crypto').createHash('sha256');
  hash.update(privateKey);
  const digest = hash.digest('hex');
  return '0x' + digest.substring(0, 40); // Return first 20 bytes with 0x prefix
}

async function getBalance(client: any, address: string): Promise<string> {
  try {
    const addressObj = AddressFromHex(address);
    const balance = await client.balanceAt(addressObj);
    return balance.toString();
  } catch (error) {
    console.error(`${colors.red}Error checking balance:${colors.reset}`, error);
    return "Error";
  }
}

async function debugTransact() {
  try {
    // Get configuration from environment
    const sender_key = process.env.PRIV_KEY_AGENT1;
    const receiver_key = process.env.PRIV_KEY_AGENT2;
    const rpcUrl = process.env.RPC_URL;
    
    if (!sender_key || !receiver_key) {
      throw new Error('Set PRIV_KEY_AGENT1 and PRIV_KEY_AGENT2 in .env');
    }
    if (!rpcUrl) {
      throw new Error('Set RPC_URL in .env');
    }
    
    console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}    RADIUS TRANSACTION DEBUG TOOL           ${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}\n`);
    
    // Sanitize keys
    console.log(`${colors.blue}Sanitizing private keys...${colors.reset}`);
    const sanitizedSenderKey = sanitizePrivateKey(sender_key);
    const sanitizedReceiverKey = sanitizePrivateKey(receiver_key);
    
    // Derive addresses
    console.log(`${colors.blue}Deriving addresses...${colors.reset}`);
    const senderAddress = deriveAddress(sanitizedSenderKey);
    const receiverAddress = deriveAddress(sanitizedReceiverKey);
    
    console.log(`${colors.green}Sender Address:   ${senderAddress}${colors.reset}`);
    console.log(`${colors.magenta}Receiver Address: ${receiverAddress}${colors.reset}`);
    
    // Create a client with the RPC URL
    console.log(`\n${colors.blue}Connecting to RPC: ${rpcUrl}${colors.reset}`);
    const client = await NewClient(rpcUrl);
    console.log(`${colors.green}Client connected${colors.reset}`);
    
    // Check initial balances
    console.log(`\n${colors.yellow}INITIAL BALANCES:${colors.reset}`);
    
    const senderInitialBalance = await getBalance(client, senderAddress);
    console.log(`${colors.green}Sender balance:   ${senderInitialBalance} coins${colors.reset}`);
    
    const receiverInitialBalance = await getBalance(client, receiverAddress);
    console.log(`${colors.magenta}Receiver balance: ${receiverInitialBalance} coins${colors.reset}`);
    
    // Ask user if they want to proceed with the transaction
    console.log(`\n${colors.yellow}Do you want to transfer funds? (y/n)${colors.reset}`);
    // This isn't going to work in an automated environment, but for interactive use it's fine
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('> ', async (answer: string) => {
      if (answer.toLowerCase() !== 'y') {
        console.log(`${colors.red}Transaction cancelled${colors.reset}`);
        readline.close();
        return;
      }
      
      // Ask for amount to transfer
      readline.question(`${colors.yellow}Enter amount to transfer (e.g. 0.001): ${colors.reset}`, async (amountStr: string) => {
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) {
          console.log(`${colors.red}Invalid amount${colors.reset}`);
          readline.close();
          return;
        }
        
        console.log(`\n${colors.blue}Preparing to transfer ${amount} coins from Sender to Receiver...${colors.reset}`);
        
        // Create the transaction using SDK
        try {
          console.log(`${colors.blue}Creating account from private key...${colors.reset}`);
          
          // Create an account using a private key
          const account = await NewAccount(withPrivateKey(sanitizedSenderKey, client));
          
          // Create receiver address object
          const receiverAddressObj = AddressFromHex(receiverAddress);
          
          console.log(`${colors.blue}Executing transfer...${colors.reset}`);
          
          // Send tokens from account to receiver
          const amountBigInt = BigInt(Math.floor(amount * 1000)) / BigInt(1000); // Convert to BigInt
          const receipt = await account.send(client, receiverAddressObj, amountBigInt);
          
          console.log(`${colors.green}Transaction successful!${colors.reset}`);
          console.log(`${colors.green}Transaction hash: ${receipt.txHash.hex()}${colors.reset}`);
          
          // Wait a moment for the transaction to process
          console.log(`\n${colors.blue}Waiting for transaction to be processed...${colors.reset}`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Check updated balances
          console.log(`\n${colors.yellow}UPDATED BALANCES:${colors.reset}`);
          
          const senderUpdatedBalance = await getBalance(client, senderAddress);
          console.log(`${colors.green}Sender balance:   ${senderUpdatedBalance} coins${colors.reset}`);
          
          const receiverUpdatedBalance = await getBalance(client, receiverAddress);
          console.log(`${colors.magenta}Receiver balance: ${receiverUpdatedBalance} coins${colors.reset}`);
          
          console.log(`\n${colors.green}Transaction complete!${colors.reset}`);
        } catch (error) {
          console.error(`${colors.red}Transaction failed:${colors.reset}`, error);
        }
        
        readline.close();
      });
    });
    
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error instanceof Error ? error.message : String(error));
    console.error(`${colors.red}Full error object:${colors.reset}`, error);
  }
}

// Run the debug function
debugTransact()
  .then(() => console.log(`\n${colors.blue}Debug script execution complete${colors.reset}`))
  .catch(err => console.error(`${colors.red}Debug failed:${colors.reset}`, err)); 