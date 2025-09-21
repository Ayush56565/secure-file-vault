import React, { useState, useEffect } from 'react';
import { useSession } from '../hooks/useSession';
import { useAuth } from '../contexts/AuthContext';
import { Clock, AlertTriangle } from 'lucide-react';

interface SessionTimeoutWarningProps {
  warningMinutes?: number;
  inactiveMinutes?: number;
}

const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  warningMinutes = 5,
  inactiveMinutes = 30,
}) => {
  const { isInactive, trackActivity } = useSession();
  const { logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const checkInactivity = () => {
      const warningThreshold = inactiveMinutes - warningMinutes;
      const isInWarningZone = isInactive(warningThreshold);
      const isInactiveNow = isInactive(inactiveMinutes);

      if (isInactiveNow) {
        // User is completely inactive, logout immediately
        logout();
        return;
      }

      if (isInWarningZone && !showWarning) {
        // User is in warning zone, show warning
        setShowWarning(true);
        setTimeLeft(warningMinutes * 60); // Convert to seconds
      } else if (!isInWarningZone && showWarning) {
        // User became active again, hide warning
        setShowWarning(false);
        setTimeLeft(0);
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkInactivity, 30 * 1000);
    return () => clearInterval(interval);
  }, [isInactive, showWarning, warningMinutes, inactiveMinutes, logout]);

  // Countdown timer
  useEffect(() => {
    if (!showWarning || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          logout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showWarning, timeLeft, logout]);

  const handleStayActive = () => {
    trackActivity();
    setShowWarning(false);
    setTimeLeft(0);
  };

  const handleLogout = () => {
    logout();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Session Timeout Warning</h3>
            <p className="text-sm text-gray-600">You'll be logged out due to inactivity</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Time remaining:</span>
          </div>
          <div className="text-2xl font-mono font-bold text-red-600">
            {formatTime(timeLeft)}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleStayActive}
            className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            Stay Active
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeoutWarning;
