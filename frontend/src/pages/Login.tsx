import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { LogIn, User, Lock, Shield, Crown } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

interface LoginForm {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<LoginForm>();
  const [loginType, setLoginType] = useState<'user' | 'admin'>('user');

  const loginMutation = useMutation(
    ({ username, password }: { username: string; password: string }) =>
      authAPI.login(username, password),
    {
      onSuccess: (response) => {
        login(response.data.token, response.data.user);
        toast.success('Login successful!');
        navigate('/dashboard');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Login failed');
      },
    }
  );

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const handleLoginTypeChange = (type: 'user' | 'admin') => {
    setLoginType(type);
    // Clear form when switching login types
    setValue('username', '');
    setValue('password', '');
  };

  const fillDemoCredentials = () => {
    if (loginType === 'admin') {
      setValue('username', 'admin2');
      setValue('password', 'admin123');
    } else {
      setValue('username', 'testuser');
      setValue('password', 'test123');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary/10 mb-4">
            {loginType === 'admin' ? (
              <Shield className="h-6 w-6 text-destructive" />
            ) : (
              <LogIn className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {loginType === 'admin' ? 'Admin Login' : 'Sign in to FileVault'}
          </CardTitle>
          <CardDescription>
            {loginType === 'user' ? (
              <>
                Or{' '}
                <Link to="/register" className="font-medium text-primary hover:text-primary/80">
                  create a new account
                </Link>
              </>
            ) : (
              'Access administrative controls and system management'
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Login Type Selector */}
          <div className="flex rounded-lg bg-muted p-1">
            <Button
              type="button"
              variant={loginType === 'user' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleLoginTypeChange('user')}
              className="flex-1"
            >
              <User className="h-4 w-4 mr-2" />
              User Login
            </Button>
            <Button
              type="button"
              variant={loginType === 'admin' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleLoginTypeChange('admin')}
              className="flex-1"
            >
              <Crown className="h-4 w-4 mr-2" />
              Admin Login
            </Button>
          </div>
          
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  {...register('username', { required: 'Username is required' })}
                  id="username"
                  type="text"
                  className="pl-10"
                  placeholder="Enter your username"
                />
              </div>
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  {...register('password', { required: 'Password is required' })}
                  id="password"
                  type="password"
                  className="pl-10"
                  placeholder="Enter your password"
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loginMutation.isLoading}
              className="w-full"
            >
              {loginMutation.isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              {loginType === 'admin' ? 'Admin Demo Credentials:' : 'User Demo Credentials:'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fillDemoCredentials}
              >
                Fill Demo Credentials
              </Button>
              <div className="text-sm text-muted-foreground flex items-center justify-center">
                {loginType === 'admin' ? (
                  <>
                    <Shield className="h-4 w-4 mr-1" />
                    admin2 / admin123
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4 mr-1" />
                    testuser / test123
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
