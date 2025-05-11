import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { ChatMessage } from '../types';

const Container = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--dark);
`;

const ChatContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-right: 8px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--background);
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 10px;
  }
`;

const MessageBubble = styled.div<{ isSystem?: boolean }>`
  padding: 12px 16px;
  border-radius: 16px;
  max-width: 80%;
  align-self: ${props => props.isSystem ? 'center' : 'flex-start'};
  background-color: ${props => props.isSystem ? 'var(--background)' : 'var(--primary)'};
  color: ${props => props.isSystem ? 'var(--dark)' : 'white'};
  position: relative;
  margin-left: ${props => props.isSystem ? '0' : '36px'};
  
  &::before {
    content: '';
    display: ${props => props.isSystem ? 'none' : 'block'};
    position: absolute;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background-color: var(--secondary);
    top: 0;
    left: -36px;
  }
`;

const AgentName = styled.div`
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
`;

const MessageTime = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  text-align: right;
  margin-top: 4px;
`;

const MessageText = styled.div`
  word-break: break-word;
`;

const SystemTag = styled.span`
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background-color: var(--warning);
  color: black;
  margin-right: 6px;
`;

const Loading = styled.div`
  padding: 20px;
  text-align: center;
  color: #666;
`;

const ConnectionStatus = styled.div<{ connected: boolean }>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  background-color: ${props => props.connected ? 'rgba(56, 176, 0, 0.1)' : 'rgba(255, 84, 0, 0.1)'};
  color: ${props => props.connected ? 'var(--success)' : 'var(--danger)'};
  position: absolute;
  top: 20px;
  right: 20px;
`;

const SystemMessage = styled(MessageBubble)`
  background-color: var(--background);
  border-left: 3px solid var(--primary);
  color: var(--dark);
  font-style: italic;
  max-width: 90%;
  margin-left: 0;
  margin-bottom: 8px;
`;

const TransactionMessage = styled(SystemMessage)`
  border-left: 3px solid var(--success);
  background-color: rgba(56, 176, 0, 0.05);
`;

interface ChatMessageWithTimestamp extends ChatMessage {
  timestamp: number;
  t: 'CHAT';
  from: string;
  text: string;
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

const ChatLog: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageWithTimestamp[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Connect to WebSocket
  useEffect(() => {
    const connectWebSocket = () => {
      // Connect as a spectator by appending ?type=spectator to the URL
      const ws = new WebSocket(`ws://${window.location.hostname}:8080/ws?type=spectator`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected as spectator');
        setIsConnected(true);
        // Connection message will come from the server
      };

      ws.onmessage = (event) => {
        try {
          console.log('WebSocket message received:', event.data);
          const data = JSON.parse(event.data);
          
          // Handle chat messages
          if (data.t === 'CHAT') {
            const chatMessage: ChatMessageWithTimestamp = {
              ...data,
              timestamp: Date.now()
            };
            setMessages(prev => [...prev, chatMessage]);
          } 
          // Handle offer messages as system notifications
          else if (data.t === 'OFFER') {
            const offerMessage: ChatMessageWithTimestamp = {
              t: 'CHAT',
              from: 'system',
              text: `${data.from} offered ${data.price} ETH for ${data.skill}`,
              timestamp: Date.now()
            };
            setMessages(prev => [...prev, offerMessage]);
          }
          // Handle accept messages as system notifications
          else if (data.t === 'ACCEPT') {
            const acceptMessage: ChatMessageWithTimestamp = {
              t: 'CHAT',
              from: 'system',
              text: `${data.from} accepted an offer`,
              timestamp: Date.now()
            };
            setMessages(prev => [...prev, acceptMessage]);
          }
          // Handle pay messages as system notifications
          else if (data.t === 'PAY') {
            const payMessage: ChatMessageWithTimestamp = {
              t: 'CHAT',
              from: 'system',
              text: `${data.from} made a payment: ${data.tx}`,
              timestamp: Date.now()
            };
            setMessages(prev => [...prev, payMessage]);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        // Try to reconnect after delay
        setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            connectWebSocket();
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    };

    connectWebSocket();

    // Cleanup
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Container>
      <Title>Chat Log</Title>
      <ConnectionStatus connected={isConnected}>
        {isConnected ? 'Connected as Spectator' : 'Disconnected'}
      </ConnectionStatus>
      <ChatContainer ref={chatContainerRef}>
        {messages.length === 0 ? (
          <Loading>No messages yet</Loading>
        ) : (
          messages.map((msg, index) => {
            // Determine if this is a transaction-related system message
            const isTransactionMsg = msg.from === 'system' && 
              (msg.text.includes('offered') || 
               msg.text.includes('accepted') || 
               msg.text.includes('payment'));
            
            // Choose appropriate message style
            if (msg.from === 'system') {
              if (isTransactionMsg) {
                return (
                  <TransactionMessage key={index}>
                    <MessageText>{msg.text}</MessageText>
                    <MessageTime style={{color: 'rgba(0, 0, 0, 0.5)'}}>{formatTime(msg.timestamp)}</MessageTime>
                  </TransactionMessage>
                );
              } else {
                return (
                  <SystemMessage key={index}>
                    <MessageText>{msg.text}</MessageText>
                    <MessageTime style={{color: 'rgba(0, 0, 0, 0.5)'}}>{formatTime(msg.timestamp)}</MessageTime>
                  </SystemMessage>
                );
              }
            }
            
            // Regular user message
            return (
              <MessageBubble key={index} isSystem={false}>
                <AgentName>{msg.from}</AgentName>
                <MessageText>{msg.text}</MessageText>
                <MessageTime>{formatTime(msg.timestamp)}</MessageTime>
              </MessageBubble>
            );
          })
        )}
      </ChatContainer>
    </Container>
  );
};

export default ChatLog; 