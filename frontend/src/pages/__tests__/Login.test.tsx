import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';
import { authAPI } from '../../services/api';

// Mock the AuthContext
const mockLogin = jest.fn();
const mockUser = null;
const mockIsLoading = false;

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: mockUser,
    isLoading: mockIsLoading,
  }),
}));

// Mock the useNavigate hook
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock the API
jest.mock('../../services/api', () => ({
  authAPI: {
    login: jest.fn(),
  },
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

describe('Login Page', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          {component}
        </QueryClientProvider>
      </BrowserRouter>
    );
  };

  test('renders login form', () => {
    renderWithQueryClient(<Login />);

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('shows validation errors for empty fields', async () => {
    renderWithQueryClient(<Login />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  test('submits form with valid data', async () => {
    // Mock successful API response
    (authAPI.login as jest.Mock).mockResolvedValue({
      data: {
        token: 'mock-token',
        user: { id: 1, username: 'testuser', is_admin: false }
      }
    });

    renderWithQueryClient(<Login />);

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(authAPI.login).toHaveBeenCalledWith('testuser', 'password123');
      expect(mockLogin).toHaveBeenCalledWith('mock-token', { id: 1, username: 'testuser', is_admin: false });
    });
  });

  test('shows admin login option', () => {
    renderWithQueryClient(<Login />);

    expect(screen.getByText(/admin login/i)).toBeInTheDocument();
  });

  test('navigates to register page', () => {
    renderWithQueryClient(<Login />);

    const registerLink = screen.getByText(/create a new account/i);
    expect(registerLink).toHaveAttribute('href', '/register');
  });
});
