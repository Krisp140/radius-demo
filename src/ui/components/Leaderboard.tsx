import React from 'react';
import styled from 'styled-components';
import { Agent } from '../types';
import useSWR from 'swr';

const LeaderboardContainer = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 20px;
`;

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--dark);
`;

const AgentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const AgentCard = styled.div`
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--border);
  transition: all 0.2s ease;
  background-color: #ffffff;
  
  &:hover {
    border-color: var(--primary);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
`;

const AgentRank = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--background);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  margin-right: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`;

const AgentAvatar = styled.div<{ seed: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 16px;
  background-color: ${props => {
    // Generate a consistent color based on the seed (agent name)
    const hashCode = props.seed.split('').reduce(
      (hash, char) => char.charCodeAt(0) + ((hash << 5) - hash), 0
    );
    const hue = hashCode % 360;
    return `hsl(${hue}, 70%, 65%)`;
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const AgentInfo = styled.div`
  flex: 1;
  
  .name {
    font-weight: 600;
    font-size: 16px;
    margin-bottom: 4px;
    color: var(--dark);
  }
  
  .address {
    font-size: 12px;
    color: #888;
    opacity: 0.8;
  }
`;

const AgentBalance = styled.div`
  font-weight: 600;
  color: var(--success);
  text-align: right;
  
  .amount {
    font-size: 1rem;
  }
  
  .unit {
    font-size: 0.75rem;
    opacity: 0.8;
  }
`;

const Loading = styled.div`
  padding: 20px;
  text-align: center;
  color: #666;
`;

const Error = styled.div`
  padding: 20px;
  text-align: center;
  color: var(--danger);
`;

const fetcher = (url: string) => fetch(url).then(res => res.json());

const Leaderboard: React.FC = () => {
  const { data: agents, error, isLoading } = useSWR<Agent[]>('/api/agents', fetcher, { 
    refreshInterval: 5000 
  });
  
  if (isLoading) {
    return (
      <LeaderboardContainer>
        <Title>AI Agent Leaderboard</Title>
        <Loading>Loading agent data...</Loading>
      </LeaderboardContainer>
    );
  }
  
  if (error) {
    return (
      <LeaderboardContainer>
        <Title>AI Agent Leaderboard</Title>
        <Error>Error loading agent data</Error>
      </LeaderboardContainer>
    );
  }
  
  return (
    <LeaderboardContainer>
      <Title>AI Agent Leaderboard</Title>
      <AgentList>
        {agents && agents.length > 0 ? (
          agents
            .sort((a, b) => b.balance - a.balance)
            .map((agent, index) => (
              <AgentCard key={agent.id}>
                <AgentRank>{index + 1}</AgentRank>
                <AgentAvatar seed={agent.name}>
                  {agent.name.split(' ').map(word => word[0]).join('')}
                </AgentAvatar>
                <AgentInfo>
                  <div className="name">{agent.name}</div>
                  <div className="address">{agent.address}</div>
                </AgentInfo>
                <AgentBalance>
                  {agent.balanceDisplay ? (
                    agent.balanceDisplay
                  ) : (
                    <>
                      <span className="amount">
                        {agent.balance > 1e15 
                          ? (agent.balance / 1e18).toFixed(4) 
                          : agent.balance.toLocaleString()}
                      </span>
                      <span className="unit"> {agent.balance > 1e15 ? 'ETH' : 'wei'}</span>
                    </>
                  )}
                </AgentBalance>
              </AgentCard>
            ))
        ) : (
          <Loading>No agents connected</Loading>
        )}
      </AgentList>
    </LeaderboardContainer>
  );
};

export default Leaderboard; 