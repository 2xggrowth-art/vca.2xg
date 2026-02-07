import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Check } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { auth } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await auth.forgotPassword({ email });
      if (error) {
        // Still show success to prevent email enumeration
        console.error('Forgot password error:', error);
      }
      setIsSubmitted(true);
    } catch {
      // Still show success to prevent email enumeration
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="app-container">
        {/* Header with gradient */}
        <div className="bg-gradient-primary px-6 pt-16 pb-12 text-white text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <Mail className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Check Your Email</h1>
          <p className="text-white/80 text-sm">We've sent you a reset link</p>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-8 -mt-6 bg-white rounded-t-3xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Email Sent!</h2>
            <p className="text-gray-500 text-sm">
              If an account exists for <span className="font-medium">{email}</span>, you'll receive a password reset link shortly.
            </p>
          </div>

          <div className="space-y-4">
            <Button
              fullWidth
              onClick={() => navigate('/login')}
            >
              Back to Login
            </Button>

            <button
              onClick={() => {
                setIsSubmitted(false);
                setEmail('');
              }}
              className="w-full text-center text-sm text-primary font-medium hover:underline"
            >
              Try a different email
            </button>
          </div>

          <p className="text-center text-gray-400 text-xs mt-8">
            Didn't receive the email? Check your spam folder.
          </p>
        </div>

        {/* Bottom safe area */}
        <div className="h-safe-bottom bg-white" />
      </div>
    );
  }

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

      {/* Form */}
      <div className="flex-1 px-6 py-8 -mt-6 bg-white rounded-t-3xl">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Forgot Password?</h2>
        <p className="text-gray-500 text-sm mb-8">
          Enter your email and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            type="email"
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={isLoading}
          >
            Send Reset Link
          </Button>
        </form>

        <button
          onClick={() => navigate('/login')}
          className="w-full mt-6 flex items-center justify-center gap-2 text-sm text-gray-600 font-medium hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>
      </div>

      {/* Bottom safe area */}
      <div className="h-safe-bottom bg-white" />
    </div>
  );
}
