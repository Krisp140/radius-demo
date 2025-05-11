// Message types from protocol
export type MessageType = 'OFFER' | 'ACCEPT' | 'PAY' | 'CHAT' | 'INVOICE';

export interface BaseMessage {
  t: MessageType;
  from: string;
}

export interface OfferMessage extends BaseMessage {
  t: 'OFFER';
  id: string;
  price: number;
  skill: string;
}

export interface AcceptMessage extends BaseMessage {
  t: 'ACCEPT';
  id: string;
}

export interface PayMessage extends BaseMessage {
  t: 'PAY';
  id: string;
  tx: string;
}

export interface ChatMessage extends BaseMessage {
  t: 'CHAT';
  text: string;
}

export interface InvoiceMessage extends BaseMessage {
  t: 'INVOICE';
  id: string;
  buyer: string;
  seller: string;
  price: number;
}

export type Message = OfferMessage | AcceptMessage | PayMessage | ChatMessage | InvoiceMessage;

// Agent data types
export interface Agent {
  id: string;
  name: string;
  address: string;
  fullAddress?: string;
  balance: number;
  type: string;
  balanceDisplay?: string;
  totalEarned?: number;
  totalSpent?: number;
  skills?: string[];
}

// Transaction data
export interface Transaction {
  id: string;
  timestamp: number;
  from: string;
  to: string;
  amount: number;
  txHash: string;
  status: 'completed' | 'pending' | 'failed';
}

// Negotiation data
export interface Negotiation {
  id: string;
  buyer: string;
  seller: string;
  skill: string;
  price: number;
  status: 'offered' | 'accepted' | 'paid' | 'rejected';
  timestamp: number;
  messages: Message[];
} 