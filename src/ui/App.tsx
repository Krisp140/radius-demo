import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Header from './components/Header';
import Leaderboard from './components/Leaderboard';
import TransactionFlow from './components/TransactionFlow';
import ChatLog from './components/ChatLog';
import NegotiationReplays from './components/NegotiationReplays';

const AppContainer = styled.div`
  min-height: 100vh;
`;

const MainContent = styled.main`
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
`;

const Dashboard = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 20px;
  margin-bottom: 20px;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const BottomSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const App: React.FC = () => {
  const [hasError, setHasError] = useState(false);
  
  // Function to reset server state
  const resetServerState = async () => {
    try {
      const response = await fetch('/api/reset');
      const data = await response.json();
      console.log('Reset server state:', data);
      return data.success;
    } catch (err) {
      console.error('Error resetting server state:', err);
      return false;
    }
  };
  
  useEffect(() => {
    console.log('App component mounted');
    
    // Reset server state on page load
    resetServerState();
    
    // Test API endpoints
    fetch('/api/agents')
      .then(res => res.json())
      .then(data => console.log('Agents data:', data))
      .catch(err => {
        console.error('Error fetching agents:', err);
        setHasError(true);
      });
      
    fetch('/api/transactions')
      .then(res => res.json())
      .then(data => console.log('Transactions data:', data))
      .catch(err => {
        console.error('Error fetching transactions:', err);
        setHasError(true);
      });
      
    // Add event listener for beforeunload to detect page refreshes
    const handleBeforeUnload = () => {
      // Note: We can't use async functions with beforeunload
      // so we just log the intent here
      console.log('Page is being refreshed or closed');
      // The actual reset happens when the page loads again
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  if (hasError) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Dashboard Error</h1>
        <p>There was an error loading the dashboard. Please check the console for details.</p>
        <p>Make sure the server is running: <code>npm run server</code></p>
      </div>
    );
  }

  return (
    <AppContainer>
      <Header />
      <MainContent>
        <Dashboard>
          <Leaderboard />
          <TransactionFlow />
        </Dashboard>
        <BottomSection>
          <ChatLog />
          <NegotiationReplays onResetState={resetServerState} />
        </BottomSection>
      </MainContent>
    </AppContainer>
  );
};

export default App; 