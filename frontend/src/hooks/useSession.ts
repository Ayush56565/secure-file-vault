import { useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useSession = () => {
  const { isAuthenticated, logout } = useAuth();

  // Session activity tracking
  const trackActivity = useCallback(() => {
    // Update last activity timestamp
    localStorage.setItem('lastActivity', Date.now().toString());
  }, []);

  // Check if user has been inactive
  const isInactive = useCallback((inactiveMinutes: number = 30): boolean => {
    const lastActivity = localStorage.getItem('lastActivity');
    if (!lastActivity) return false;
    
    const lastActivityTime = parseInt(lastActivity);
    const inactiveTime = inactiveMinutes * 60 * 1000; // Convert to milliseconds
    return Date.now() - lastActivityTime > inactiveTime;
  }, []);

  // Auto-logout on inactivity
  const setupInactivityLogout = useCallback((inactiveMinutes: number = 30) => {
    const checkInactivity = () => {
      if (isAuthenticated && isInactive(inactiveMinutes)) {
        console.log('User inactive, logging out');
        logout();
      }
    };

    // Check every minute
    const interval = setInterval(checkInactivity, 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, isInactive, logout]);

  // Track user activity
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      trackActivity();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initial activity
    trackActivity();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [isAuthenticated, trackActivity]);

  return {
    trackActivity,
    isInactive,
    setupInactivityLogout,
  };
};