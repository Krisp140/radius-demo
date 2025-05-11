import { OfferMsg, AcceptMsg, PayMsg } from '../protocol/messages';

export interface Invoice {
  id: string;
  buyer: string;
  seller: string;
  price: number;
  skill: string;
  timestamp: number;
}

// Store active invoices by ID
const activeInvoices = new Map<string, Invoice>();

/**
 * Validate an offer message
 */
export function validateOffer(offer: OfferMsg): boolean {
  // Basic validation
  if (!offer.id || !offer.skill || offer.price <= 0 || !offer.from) {
    return false;
  }
  
  return true;
}

/**
 * Validate an accept message
 */
export function validateAccept(accept: AcceptMsg, offer: OfferMsg | undefined): boolean {
  // Check if the offer exists
  if (!offer) {
    return false;
  }
  
  // Can't accept your own offer
  if (accept.from === offer.from) {
    return false;
  }
  
  return true;
}

/**
 * Create an invoice when an offer is accepted
 */
export function createInvoice(offer: OfferMsg, acceptedBy: string): Invoice {
  const invoice: Invoice = {
    id: offer.id,
    buyer: offer.from,
    seller: acceptedBy,
    price: offer.price,
    skill: offer.skill,
    timestamp: Date.now()
  };
  
  activeInvoices.set(offer.id, invoice);
  return invoice;
}

/**
 * Validate a payment message
 */
export function validatePayment(pay: PayMsg, invoice: Invoice | undefined): boolean {
  // Check if the invoice exists
  if (!invoice) {
    return false;
  }
  
  // Check if the payment is from the buyer
  if (pay.from !== invoice.buyer) {
    return false;
  }
  
  // Check if a transaction hash is included
  if (!pay.tx) {
    return false;
  }
  
  return true;
}

/**
 * Complete an invoice after payment
 */
export function completeInvoice(invoiceId: string): Invoice | undefined {
  const invoice = activeInvoices.get(invoiceId);
  if (invoice) {
    activeInvoices.delete(invoiceId);
  }
  return invoice;
}

/**
 * Get an active invoice by ID
 */
export function getInvoice(id: string): Invoice | undefined {
  return activeInvoices.get(id);
}

/**
 * Get all active invoices
 */
export function getAllInvoices(): Invoice[] {
  return Array.from(activeInvoices.values());
}

/**
 * Clean up expired invoices (older than 10 minutes)
 */
export function cleanupExpiredInvoices(): void {
  const now = Date.now();
  const expiryTime = 10 * 60 * 1000; // 10 minutes
  
  for (const [id, invoice] of activeInvoices.entries()) {
    if (now - invoice.timestamp > expiryTime) {
      activeInvoices.delete(id);
    }
  }
} 