import { useState, useEffect, useCallback, useRef } from 'react';
import { Message } from '../types';

interface WebSocketHook {
  messages: Message[];
  isConnected: boolean;
  sendMessage: (message: Message) => void;
  error: string | null;
}

export function useWebSocket(url: string): WebSocketHook {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connection established');
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data) as Message;
          setMessages(prev => [...prev, parsedData]);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setIsConnected(false);
        
        // Attempt reconnection after a delay
        setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.CLOSED) {
            connectWebSocket();
          }
        }, 2000);
      };
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [url]);

  // Function to send messages
  const sendMessage = useCallback((message: Message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      setError('WebSocket is not connected');
    }
  }, []);

  return { messages, isConnected, sendMessage, error };
} 