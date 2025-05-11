import React from 'react';
import styled from 'styled-components';
import useSWR from 'swr';
import { Agent, Transaction } from '../types';

const HeaderContainer = styled.header`
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  padding: 16px 24px;
`;

const HeaderContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  
  h1 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--dark);
  }
`;

const LogoIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border-radius: 50%;
  color: white;
  font-weight: bold;
  font-size: 18px;
`;

const StatsContainer = styled.div`
  display: flex;
  gap: 24px;
`;

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  
  .label {
    font-size: 0.75rem;
    color: #666;
    margin-bottom: 2px;
  }
  
  .value {
    font-size: 1rem;
    font-weight: 600;
  }
`;

const fetcher = (url: string) => fetch(url).then(res => res.json());

const Header: React.FC = () => {
  const { data: agents } = useSWR<Agent[]>('/api/agents', fetcher, { 
    refreshInterval: 5000 
  });
  
  const { data: transactions } = useSWR<Transaction[]>('/api/transactions', fetcher, { 
    refreshInterval: 5000 
  });
  
  // Calculate stats
  const activeAgents = agents?.length || 0;
  const totalTransactions = transactions?.length || 0;
  
  // Calculate total value of all transactions
  const totalValue = transactions?.reduce((sum, tx) => sum + tx.amount, 0) || 0;
  
  // Calculate total wallet balance of all agents
  const totalBalance = agents?.reduce((sum, agent) => sum + agent.balance, 0) || 0;
  
  // Format balance for display
  const formatBalance = (balance: number): string => {
    if (balance > 1e15) {
      return `${(balance / 1e18).toFixed(4)} ETH`;
    } else {
      return `${balance.toLocaleString()} wei`;
    }
  };

  return (
    <HeaderContainer>
      <HeaderContent>
        <Logo>
          <LogoIcon>R</LogoIcon>
          <h1>Radius Negotiation Dashboard</h1>
        </Logo>
        <StatsContainer>
          <Stat>
            <div className="label">Total Transactions</div>
            <div className="value">{totalTransactions}</div>
          </Stat>
          <Stat>
            <div className="label">Active Agents</div>
            <div className="value">{activeAgents}</div>
          </Stat>
          <Stat>
            <div className="label">Total Balance</div>
            <div className="value">{formatBalance(totalBalance)}</div>
          </Stat>
        </StatsContainer>
      </HeaderContent>
    </HeaderContainer>
  );
};

export default Header; 