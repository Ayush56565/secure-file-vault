import React from 'react';
import { Loader2, Shield } from 'lucide-react';

const AuthLoading: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <span className="text-lg font-semibold text-gray-700">Loading...</span>
        </div>
        <p className="text-gray-500">Verifying your session</p>
      </div>
    </div>
  );
};

export default AuthLoading;
