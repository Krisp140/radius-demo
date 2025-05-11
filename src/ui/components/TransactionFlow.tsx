import React, { useMemo } from 'react';
import styled from 'styled-components';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import useSWR from 'swr';
import { Transaction } from '../types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Container = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 20px;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--dark);
`;

const ChartContainer = styled.div`
  height: 300px;
  margin-bottom: 24px;
`;

const TransactionList = styled.div`
  margin-top: 20px;
`;

const TransactionItem = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  
  &:last-child {
    border-bottom: none;
  }
`;

const TransactionIcon = styled.div<{ status: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  background-color: ${props => 
    props.status === 'completed' ? 'rgba(56, 176, 0, 0.1)' : 
    props.status === 'pending' ? 'rgba(255, 190, 11, 0.1)' : 
    'rgba(255, 84, 0, 0.1)'
  };
  color: ${props => 
    props.status === 'completed' ? 'var(--success)' : 
    props.status === 'pending' ? 'var(--warning)' : 
    'var(--danger)'
  };
`;

const TransactionDetails = styled.div`
  flex: 1;
  
  .transaction-id {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 4px;
  }
  
  .transaction-parties {
    font-size: 12px;
    color: #666;
  }
`;

const TransactionAmount = styled.div`
  font-weight: 600;
  color: var(--success);
`;

const TimeStamp = styled.div`
  font-size: 12px;
  color: #666;
  margin-left: 16px;
  white-space: nowrap;
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

const formatTimestamp = (timestamp: number) => {
  const now = Date.now();
  const diffMs = now - timestamp;
  
  if (diffMs < 1000 * 60) {
    return 'Just now';
  } else if (diffMs < 1000 * 60 * 60) {
    return `${Math.floor(diffMs / (1000 * 60))}m ago`;
  } else {
    return `${Math.floor(diffMs / (1000 * 60 * 60))}h ago`;
  }
};

const TransactionFlow: React.FC = () => {
  const { data: transactions, error, isLoading } = useSWR<Transaction[]>('/api/transactions', fetcher, { 
    refreshInterval: 3000 
  });

  // Create chart data from transactions
  const chartData = useMemo(() => {
    const timeLabels = ['1h ago', '45m ago', '30m ago', '15m ago', 'Now'];
    
    // If we have no transactions, return default data
    if (!transactions || transactions.length === 0) {
      return {
        labels: timeLabels,
        datasets: [
          {
            label: 'Transaction Volume',
            data: [0, 0, 0, 0, 0],
            borderColor: 'rgb(58, 134, 255)',
            backgroundColor: 'rgba(58, 134, 255, 0.5)',
            tension: 0.4,
          }
        ]
      };
    }

    // Group transactions into time buckets
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const timeBuckets = [
      now - hour,       // 1h ago
      now - hour * 0.75, // 45m ago
      now - hour * 0.5,  // 30m ago
      now - hour * 0.25, // 15m ago
      now                // now
    ];

    // Count transactions in each bucket
    const transactionCounts = [0, 0, 0, 0, 0];
    const amounts = [0, 0, 0, 0, 0];

    transactions.forEach(tx => {
      for (let i = 0; i < timeBuckets.length - 1; i++) {
        if (tx.timestamp >= timeBuckets[i] && tx.timestamp < timeBuckets[i + 1]) {
          transactionCounts[i]++;
          amounts[i] += tx.amount;
          break;
        }
      }
    });

    return {
      labels: timeLabels,
      datasets: [
        {
          label: 'Transaction Volume',
          data: transactionCounts,
          borderColor: 'rgb(58, 134, 255)',
          backgroundColor: 'rgba(58, 134, 255, 0.5)',
          tension: 0.4,
        },
        {
          label: 'Value Transferred (ETH)',
          data: amounts,
          borderColor: 'rgb(255, 0, 110)',
          backgroundColor: 'rgba(255, 0, 110, 0.5)',
          tension: 0.4,
        }
      ]
    };
  }, [transactions]);

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (isLoading) {
    return (
      <Container>
        <SectionTitle>Transaction Activity</SectionTitle>
        <Loading>Loading transaction data...</Loading>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container>
        <SectionTitle>Transaction Activity</SectionTitle>
        <Error>Error loading transaction data</Error>
      </Container>
    );
  }

  return (
    <Container>
      <SectionTitle>Transaction Activity</SectionTitle>
      <ChartContainer>
        <Line options={chartOptions} data={chartData} />
      </ChartContainer>
      
      <SectionTitle>Recent Transactions</SectionTitle>
      <TransactionList>
        {transactions && transactions.length > 0 ? (
          [...transactions]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 5)  // Show only the 5 most recent transactions
            .map(tx => (
              <TransactionItem key={tx.id}>
                <TransactionIcon status={tx.status}>
                  {tx.status === 'completed' ? '✓' : tx.status === 'pending' ? '⏱' : '✗'}
                </TransactionIcon>
                <TransactionDetails>
                  <div className="transaction-id">Transaction #{tx.id}</div>
                  <div className="transaction-parties">From {tx.from} to {tx.to}</div>
                </TransactionDetails>
                <TransactionAmount>{tx.amount} ETH</TransactionAmount>
                <TimeStamp>{formatTimestamp(tx.timestamp)}</TimeStamp>
              </TransactionItem>
            ))
        ) : (
          <Loading>No transactions yet</Loading>
        )}
      </TransactionList>
    </Container>
  );
};

export default TransactionFlow; 