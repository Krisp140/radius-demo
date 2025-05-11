import 'dotenv/config';
import { 
  NewClient, 
  AddressFromHex
} from '@radiustechsystems/sdk';

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

async function debugAddress() {
  try {
    // Get configuration from environment
    const privateKey = process.env.PRIV_KEY_AGENT1;
    const rpcUrl = process.env.RPC_URL;
    
    if (!privateKey) throw new Error('Set PRIV_KEY_AGENT1 in .env');
    if (!rpcUrl) throw new Error('Set RPC_URL in .env');
    
    const sanitizedKey = sanitizePrivateKey(privateKey);
    console.log('Private key (first 6 chars):', sanitizedKey.substring(0, 6));
    
    // Derive address using our mock function
    const derivedHexAddress = deriveAddress(sanitizedKey);
    console.log('Derived hex address:', derivedHexAddress);
    
    // Create a proper Radius address object and store it for later use
    const addressObj = AddressFromHex(derivedHexAddress);
    console.log('Address object:', addressObj);
    console.log('Address toString():', addressObj.toString());
    
    // Common mistake of using toString() on Address objects directly
    console.log('IMPORTANT: Do not use addressObj.toString() for balanceAt()');
    
    // Create a client with the RPC URL
    console.log('Connecting to RPC:', rpcUrl);
    const client = await NewClient(rpcUrl);
    console.log('Client connected');
    
    // Correct way - use the Address object directly
    console.log('\nTesting CORRECT approach:');
    console.log('Using address object directly...');
    const balance = await client.balanceAt(addressObj);
    console.log('Raw balance result:', balance);
    console.log('Balance as string:', balance.toString());
    console.log('Balance as number:', parseFloat(balance.toString()));
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    console.error('Full error object:', error);
  }
}

// Run the debug function
debugAddress()
  .then(() => console.log('Debug complete'))
  .catch(err => console.error('Debug failed:', err)); 