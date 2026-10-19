import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '../../store';
import { consumerAuthService } from '../../services/consumerAuthService';

interface ConsumerRouteProps {
  children: React.ReactNode;
}

export const ConsumerRoute: React.FC<ConsumerRouteProps> = ({ children }) => {
  const storeConsumerSession = useStore((state) => state.consumerSession);
  const location = useLocation();

  const consumerSession = storeConsumerSession || consumerAuthService.getSession();
  if (consumerSession && !storeConsumerSession) {
    useStore.setState({ consumerSession });
  }

  // If no consumer session exists, redirect strictly to consumer login
  if (!consumerSession || consumerSession.userType !== 'consumer') {
    return <Navigate to="/app/login" state={{ from: location }} replace />;
  }

  // Inactive consumer cannot access app
  if (consumerSession.consumer.status === 'inactive') {
    return <Navigate to="/app/login" state={{ error: 'Account is inactive' }} replace />;
  }

  return <>{children}</>;
};

export const ConsumerPublicOnlyRoute: React.FC<ConsumerRouteProps> = ({ children }) => {
  const storeConsumerSession = useStore((state) => state.consumerSession);
  const consumerSession = storeConsumerSession || consumerAuthService.getSession();
  if (consumerSession && !storeConsumerSession) {
    useStore.setState({ consumerSession });
  }

  // If already logged in as consumer, redirect to consumer home
  if (consumerSession && consumerSession.userType === 'consumer') {
    return <Navigate to="/app/home" replace />;
  }

  return <>{children}</>;
};
