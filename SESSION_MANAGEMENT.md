# Session Management Documentation

## Overview

The FileVault application now includes comprehensive session management features to maintain user authentication state securely and provide a smooth user experience.

## Features Implemented

### 1. **Automatic Session Validation**
- **Token Expiry Detection**: Automatically detects JWT token expiration
- **Server-side Validation**: Validates sessions with the backend server
- **Auto-logout**: Automatically logs out users when tokens expire
- **Session Refresh**: Periodically refreshes user data from the server

### 2. **Inactivity Management**
- **Activity Tracking**: Monitors user activity (mouse, keyboard, touch, scroll)
- **Inactivity Timeout**: Configurable inactivity timeout (default: 30 minutes)
- **Warning System**: Shows countdown warning before auto-logout
- **Graceful Logout**: Users can extend their session or logout gracefully

### 3. **Session Persistence**
- **LocalStorage**: Stores authentication tokens and user data
- **Automatic Restoration**: Restores sessions on app reload
- **Secure Storage**: Tokens are validated before use
- **Data Synchronization**: Keeps user data synchronized with server

### 4. **Real-time Session Monitoring**
- **Connection Status**: Shows real-time connection status
- **Session Health**: Provides session validation tools
- **Error Handling**: Graceful handling of network errors
- **User Feedback**: Toast notifications for session events

## Technical Implementation

### Frontend Components

#### AuthContext (`/frontend/src/contexts/AuthContext.tsx`)
- **State Management**: Manages authentication state globally
- **Token Validation**: Validates JWT tokens client-side
- **Auto-refresh**: Refreshes user data every 5 minutes
- **Session Monitoring**: Monitors token expiry every minute

#### Session Hook (`/frontend/src/hooks/useSession.ts`)
- **Activity Tracking**: Tracks user interactions
- **Inactivity Detection**: Detects user inactivity
- **Session Utilities**: Provides session management utilities

#### Session Timeout Warning (`/frontend/src/components/SessionTimeoutWarning.tsx`)
- **Warning Modal**: Shows countdown before logout
- **User Actions**: Allows users to stay active or logout
- **Configurable Timeouts**: Customizable warning and timeout periods

#### Auth Loading (`/frontend/src/components/AuthLoading.tsx`)
- **Loading State**: Shows loading screen during auth checks
- **User Feedback**: Provides visual feedback during session validation

### Backend Implementation

#### Session Validation Endpoint (`/api/auth/validate`)
- **Token Verification**: Validates JWT tokens server-side
- **User Data**: Returns current user information
- **Security**: Ensures tokens are valid and not expired

#### JWT Configuration
- **Expiry Time**: 24 hours (configurable)
- **Secret Key**: Secure secret key for token signing
- **Claims**: Includes user ID, username, and admin status

## Configuration

### Session Timeouts
```typescript
// Default configuration
const SESSION_CONFIG = {
  tokenExpiry: 24 * 60 * 60 * 1000, // 24 hours
  inactivityTimeout: 30 * 60 * 1000, // 30 minutes
  warningTime: 5 * 60 * 1000, // 5 minutes warning
  refreshInterval: 5 * 60 * 1000, // 5 minutes
  checkInterval: 60 * 1000, // 1 minute
};
```

### Environment Variables
```bash
# JWT Secret (Backend)
JWT_SECRET=your-secure-secret-key

# Session Timeout (Frontend)
REACT_APP_SESSION_TIMEOUT=1800000 # 30 minutes in milliseconds
REACT_APP_WARNING_TIME=300000 # 5 minutes in milliseconds
```

## Usage Examples

### Basic Session Management
```typescript
import { useAuth } from '../contexts/AuthContext';
import { useSession } from '../hooks/useSession';

function MyComponent() {
  const { isAuthenticated, user, logout } = useAuth();
  const { checkSession, isInactive } = useSession();

  // Check if user is inactive
  const inactive = isInactive(30); // 30 minutes

  // Validate session
  const validateSession = async () => {
    const isValid = await checkSession();
    if (!isValid) {
      console.log('Session invalid');
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <div>Welcome, {user?.username}!</div>
      ) : (
        <div>Please log in</div>
      )}
    </div>
  );
}
```

### Session Timeout Warning
```typescript
import SessionTimeoutWarning from '../components/SessionTimeoutWarning';

function App() {
  return (
    <div>
      <SessionTimeoutWarning 
        warningMinutes={5} 
        inactiveMinutes={30} 
      />
      {/* Your app content */}
    </div>
  );
}
```

## Security Features

### 1. **Token Security**
- JWT tokens are signed with a secret key
- Tokens include expiration time
- Client-side validation before server requests
- Automatic cleanup on logout

### 2. **Session Validation**
- Server-side token verification
- User data synchronization
- Automatic logout on invalid sessions
- Protection against token tampering

### 3. **Inactivity Protection**
- Activity tracking across all user interactions
- Configurable timeout periods
- Warning system before logout
- Graceful session termination

### 4. **Error Handling**
- Network error recovery
- Token refresh on failure
- Graceful degradation
- User-friendly error messages

## Monitoring and Debugging

### Session Status Indicators
- **Connection Status**: Real-time WebSocket connection status
- **Session Validity**: Manual session validation button
- **User Activity**: Last activity timestamp tracking
- **Token Status**: Token expiry information

### Console Logging
```typescript
// Enable debug logging
console.log('Session validation:', await checkSession());
console.log('User inactive:', isInactive(30));
console.log('Token expired:', isTokenExpired(token));
```

## Best Practices

### 1. **Session Management**
- Always validate sessions before sensitive operations
- Implement proper error handling for network failures
- Provide clear feedback to users about session status
- Use appropriate timeout values for your use case

### 2. **Security**
- Use secure JWT secrets in production
- Implement proper CORS policies
- Validate all server-side requests
- Log security events for monitoring

### 3. **User Experience**
- Show loading states during session validation
- Provide clear warning messages before logout
- Allow users to extend their sessions
- Handle network interruptions gracefully

## Troubleshooting

### Common Issues

1. **Session Expires Too Quickly**
   - Check JWT expiry configuration
   - Verify inactivity timeout settings
   - Ensure activity tracking is working

2. **Session Not Persisting**
   - Check localStorage availability
   - Verify token storage/retrieval
   - Check for browser security policies

3. **Validation Failures**
   - Verify backend session endpoint
   - Check network connectivity
   - Validate JWT secret configuration

### Debug Tools

```typescript
// Check session status
const { checkSession, isInactive } = useSession();
console.log('Session valid:', await checkSession());
console.log('Inactive for 30min:', isInactive(30));

// Check token expiry
const { token } = useAuth();
console.log('Token expired:', isTokenExpired(token));
```

## Future Enhancements

### Planned Features
- **Refresh Tokens**: Implement refresh token rotation
- **Multi-device Sessions**: Track sessions across devices
- **Session Analytics**: Detailed session usage analytics
- **Advanced Security**: Additional security measures

### Configuration Options
- **Custom Timeouts**: Per-user timeout configuration
- **Session Policies**: Admin-configurable session policies
- **Audit Logging**: Comprehensive session audit logs
- **Integration**: SSO and external auth providers

## Conclusion

The session management system provides a robust, secure, and user-friendly authentication experience. It handles token validation, inactivity management, and session persistence while maintaining security best practices and providing excellent user experience.

For questions or issues, please refer to the troubleshooting section or contact the development team.
