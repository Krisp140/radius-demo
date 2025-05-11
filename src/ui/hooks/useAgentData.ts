import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Agent, Transaction } from '../types';

// Type-specific fetchers
const fetchAgents = async (): Promise<Agent[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return [
    { id: '1', name: 'Developer Agent', address: '0x123...abc', balance: 150, type: 'Developer', skills: ['TypeScript', 'React', 'Node.js'] },
    { id: '2', name: 'Creative Agent', address: '0x456...def', balance: 120, type: 'Creative', skills: ['Design', 'Copywriting', 'Branding'] },
    { id: '3', name: 'Marketing Agent', address: '0x789...ghi', balance: 90, type: 'Marketing', skills: ['SEO', 'Social Media', 'Content'] },
  ];
};

const fetchTransactions = async (): Promise<Transaction[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return [
    { id: 'tx1', from: 'Developer Agent', to: 'Creative Agent', amount: 10, timestamp: Date.now() - 1000 * 60 * 5, status: 'completed', txHash: '0xabc123' },
    { id: 'tx2', from: 'Creative Agent', to: 'Marketing Agent', amount: 15, timestamp: Date.now() - 1000 * 60 * 10, status: 'completed', txHash: '0xdef456' },
    { id: 'tx3', from: 'Marketing Agent', to: 'Developer Agent', amount: 20, timestamp: Date.now() - 1000 * 60 * 15, status: 'pending', txHash: '0xghi789' },
  ];
};

export function useAgentData() {
  const { data: agents, error: agentsError, isLoading: agentsLoading, mutate: refreshAgents } = 
    useSWR<Agent[]>('agents', fetchAgents, { refreshInterval: 5000 });
    
  const { data: transactions, error: txError, isLoading: txLoading, mutate: refreshTransactions } = 
    useSWR<Transaction[]>('transactions', fetchTransactions, { refreshInterval: 5000 });
    
  const refreshAll = () => {
    refreshAgents();
    refreshTransactions();
  };
  
  return {
    agents: agents || [],
    transactions: transactions || [],
    isLoading: agentsLoading || txLoading,
    error: agentsError || txError,
    refreshData: refreshAll
  };
} 