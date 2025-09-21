import React, { createContext, useContext, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useQueryClient } from 'react-query';

interface RealTimeContextType {
  isConnected: boolean;
  lastMessage: any;
  sendMessage: (message: any) => void;
}

const RealTimeContext = createContext<RealTimeContextType | undefined>(undefined);

export const useRealTime = () => {
  const context = useContext(RealTimeContext);
  if (!context) {
    throw new Error('useRealTime must be used within a RealTimeProvider');
  }
  return context;
};

interface RealTimeProviderProps {
  children: React.ReactNode;
}

export const RealTimeProvider: React.FC<RealTimeProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const [lastMessage, setLastMessage] = useState<any>(null);

  const wsUrl = process.env.REACT_APP_WS_URL || `ws://localhost:8080/ws`;

  const { isConnected, sendMessage } = useWebSocket(wsUrl, {
    onMessage: (message) => {
      setLastMessage(message);
      handleRealTimeMessage(message);
    },
    onOpen: () => {
      console.log('WebSocket connected');
    },
    onClose: () => {
      console.log('WebSocket disconnected');
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    },
  });

  const handleRealTimeMessage = (message: any) => {
    switch (message.type) {
      case 'file_uploaded':
        // Invalidate file queries to refresh the file list
        queryClient.invalidateQueries({ queryKey: ['files'] });
        queryClient.invalidateQueries({ queryKey: ['userStats'] });
        queryClient.invalidateQueries({ queryKey: ['storageStats'] });
        queryClient.invalidateQueries({ queryKey: ['deduplicationStats'] });
        break;

      case 'file_deleted':
        // Invalidate file queries to refresh the file list
        queryClient.invalidateQueries({ queryKey: ['files'] });
        queryClient.invalidateQueries({ queryKey: ['userStats'] });
        queryClient.invalidateQueries({ queryKey: ['storageStats'] });
        queryClient.invalidateQueries({ queryKey: ['deduplicationStats'] });
        break;

      case 'file_downloaded':
        // Invalidate file queries to update download counts
        queryClient.invalidateQueries({ queryKey: ['files'] });
        queryClient.invalidateQueries({ queryKey: ['userStats'] });
        queryClient.invalidateQueries({ queryKey: ['fileStats'] });
        break;

      case 'folder_created':
      case 'folder_updated':
      case 'folder_deleted':
        // Invalidate folder queries
        queryClient.invalidateQueries({ queryKey: ['folders'] });
        break;

      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  };

  const contextValue: RealTimeContextType = {
    isConnected,
    lastMessage,
    sendMessage,
  };

  return (
    <RealTimeContext.Provider value={contextValue}>
      {children}
    </RealTimeContext.Provider>
  );
};
