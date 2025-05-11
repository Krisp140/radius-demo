export type OfferMsg   = { t:'OFFER';    id:string; price:number; skill:string; from:string };
export type AcceptMsg  = { t:'ACCEPT';   id:string;                from:string };
export type PayMsg     = { t:'PAY';      id:string; tx:string;     from:string };
export type ChatMsg    = { t:'CHAT';     text:string;              from:string };
export type InvoiceMsg = { t:'INVOICE';  id:string; buyer:string; seller:string; price:number; skill:string; from:string };
export type AnyMsg = OfferMsg | AcceptMsg | PayMsg | ChatMsg | InvoiceMsg;
