import { useState, FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, isAuthenticated, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // If already authenticated, redirect to role-based home
  if (!authLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        // Handle error - could be string or object
        const errorMsg = typeof error === 'string' ? error : (error as any)?.message || 'Login failed';
        setError(errorMsg);
        toast.error(errorMsg);
      } else {
        toast.success('Welcome back!');
        navigate('/');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Header with gradient */}
      <div className="bg-gradient-primary px-6 pt-16 pb-12 text-white text-center">
        <div className="w-20 h-20 mx-auto mb-4 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
          <span className="text-4xl font-bold">V</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">VCA</h1>
        <p className="text-white/80 text-sm">Viral Content Analyzer</p>
      </div>

      {/* Login Form */}
      <div className="flex-1 px-6 py-8 -mt-6 bg-white rounded-t-3xl">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome Back</h2>
        <p className="text-gray-500 text-sm mb-8">Sign in to continue</p>

        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
          <Input
            type="email"
            name="email"
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              name="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="absolute right-4 top-[38px] text-gray-400"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex justify-end -mt-2">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-sm text-primary font-medium hover:underline"
            >
              Forgot password?
            </button>
          </div>

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-sm text-danger">
              {error}
            </div>
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={isLoading}
          >
            Sign In
          </Button>
        </form>

        {/* Help text */}
        <p className="text-center text-gray-400 text-xs mt-8">
          Contact admin if you need access
        </p>
      </div>

      {/* Bottom safe area */}
      <div className="h-safe-bottom bg-white" />
    </div>
  );
}
