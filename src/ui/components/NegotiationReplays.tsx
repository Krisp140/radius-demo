import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { Negotiation, Transaction } from '../types';
import useSWR from 'swr';

const Container = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--dark);
  margin: 0;
`;

const ResetButton = styled.button`
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: #e5e5e5;
    border-color: #ccc;
  }
`;

const NegotiationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
  overflow-y: auto;
`;

const NegotiationCard = styled.div<{ isSelected?: boolean }>`
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid ${props => props.isSelected ? 'var(--primary)' : 'var(--border)'};
  background-color: ${props => props.isSelected ? 'rgba(58, 134, 255, 0.05)' : 'white'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
`;

const NegotiationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const NegotiationTitle = styled.div`
  font-weight: 600;
  font-size: 14px;
`;

const NegotiationStatus = styled.div<{ status: string }>`
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background-color: ${props => 
    props.status === 'paid' ? 'rgba(56, 176, 0, 0.1)' : 
    props.status === 'accepted' ? 'rgba(255, 190, 11, 0.1)' :
    props.status === 'offered' ? 'rgba(58, 134, 255, 0.1)' :
    'rgba(255, 84, 0, 0.1)'
  };
  color: ${props => 
    props.status === 'paid' ? 'var(--success)' : 
    props.status === 'accepted' ? 'var(--warning)' :
    props.status === 'offered' ? 'var(--primary)' :
    'var(--danger)'
  };
`;

const NegotiationInfo = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
`;

const NegotiationDetail = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background-color: var(--background);
  border-radius: 8px;
  margin-top: 16px;
`;

const Step = styled.div`
  display: flex;
  gap: 16px;
  align-items: flex-start;
`;

const StepNumber = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
`;

const StepContent = styled.div`
  flex: 1;
`;

const StepHeader = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
`;

const StepDescription = styled.div`
  font-size: 14px;
  color: #444;
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

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

interface NegotiationReplaysProps {
  onResetState?: () => Promise<boolean>;
}

const NegotiationReplays: React.FC<NegotiationReplaysProps> = ({ onResetState }) => {
  const [selectedNegotiation, setSelectedNegotiation] = useState<string | null>(null);
  
  // Fetch transactions from API
  const { data: transactions, error, isLoading, mutate } = useSWR<Transaction[]>('/api/transactions', fetcher, { 
    refreshInterval: 5000 
  });
  
  // Handle manual reset
  const handleReset = async () => {
    if (onResetState) {
      const success = await onResetState();
      if (success) {
        // Reset selected negotiation
        setSelectedNegotiation(null);
        // Trigger a refetch of transactions
        mutate();
      }
    }
  };
  
  // Transform transactions into negotiations
  const negotiations = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    
    // Group transactions by ID to create negotiations
    const negotiationMap = new Map<string, Negotiation>();
    
    transactions.forEach(tx => {
      // Create or update negotiation
      if (!negotiationMap.has(tx.id)) {
        negotiationMap.set(tx.id, {
          id: tx.id,
          buyer: tx.from,
          seller: tx.to,
          skill: 'Service', // Default since we don't have this info
          price: tx.amount,
          status: tx.status === 'completed' ? 'paid' : 'accepted',
          timestamp: tx.timestamp,
          messages: []
        });
      }
    });
    
    return Array.from(negotiationMap.values());
  }, [transactions]);

  if (isLoading) {
    return (
      <Container>
        <HeaderContainer>
          <Title>Negotiation Replays</Title>
          {onResetState && <ResetButton onClick={handleReset}>Reset</ResetButton>}
        </HeaderContainer>
        <Loading>Loading negotiations...</Loading>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container>
        <HeaderContainer>
          <Title>Negotiation Replays</Title>
          {onResetState && <ResetButton onClick={handleReset}>Reset</ResetButton>}
        </HeaderContainer>
        <Error>Error loading negotiations</Error>
      </Container>
    );
  }
  
  if (negotiations.length === 0) {
    return (
      <Container>
        <HeaderContainer>
          <Title>Negotiation Replays</Title>
          {onResetState && <ResetButton onClick={handleReset}>Reset</ResetButton>}
        </HeaderContainer>
        <Loading>No negotiations yet</Loading>
      </Container>
    );
  }
  
  const selectedNeg = negotiations.find(n => n.id === selectedNegotiation);
  
  return (
    <Container>
      <HeaderContainer>
        <Title>Negotiation Replays</Title>
        {onResetState && <ResetButton onClick={handleReset}>Reset</ResetButton>}
      </HeaderContainer>
      <NegotiationList>
        {negotiations.map(negotiation => (
          <NegotiationCard 
            key={negotiation.id}
            isSelected={selectedNegotiation === negotiation.id}
            onClick={() => setSelectedNegotiation(negotiation.id === selectedNegotiation ? null : negotiation.id)}
          >
            <NegotiationHeader>
              <NegotiationTitle>{negotiation.skill || 'Service'}</NegotiationTitle>
              <NegotiationStatus status={negotiation.status}>
                {negotiation.status.toUpperCase()}
              </NegotiationStatus>
            </NegotiationHeader>
            <NegotiationInfo>
              <div>From: {negotiation.buyer}</div>
              <div>To: {negotiation.seller}</div>
              <div>{negotiation.price} ETH</div>
              <div>{formatTime(negotiation.timestamp)}</div>
            </NegotiationInfo>
          </NegotiationCard>
        ))}
      </NegotiationList>
      
      {selectedNeg && (
        <NegotiationDetail>
          <Step>
            <StepNumber>1</StepNumber>
            <StepContent>
              <StepHeader>Offer Made</StepHeader>
              <StepDescription>
                {selectedNeg.buyer} offered {selectedNeg.price} ETH for {selectedNeg.skill || 'service'}
              </StepDescription>
            </StepContent>
          </Step>
          <Step>
            <StepNumber>2</StepNumber>
            <StepContent>
              <StepHeader>Offer Accepted</StepHeader>
              <StepDescription>
                {selectedNeg.seller} accepted the offer
              </StepDescription>
            </StepContent>
          </Step>
          {selectedNeg.status === 'paid' && (
            <Step>
              <StepNumber>3</StepNumber>
              <StepContent>
                <StepHeader>Payment Made</StepHeader>
                <StepDescription>
                  {selectedNeg.buyer} paid {selectedNeg.price} ETH to {selectedNeg.seller}
                </StepDescription>
              </StepContent>
            </Step>
          )}
        </NegotiationDetail>
      )}
    </Container>
  );
};

export default NegotiationReplays; 