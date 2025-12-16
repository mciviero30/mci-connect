import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function SetupPassword() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSetupPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!email) {
      setError('Invalid invitation link - email missing');
      return;
    }

    setLoading(true);

    try {
      // Update user password using the magic link flow
      // First, we need to send a password reset email through base44
      await fetch(`https://api.base44.com/auth/password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          redirectTo: window.location.origin
        })
      });

      // Show success message
      setSuccess(true);
      
      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (error) {
      console.error('Setup error:', error);
      setError('Failed to setup password. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Invalid invitation link. Please check your email for the correct link.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Check Your Email!</h2>
            <p className="text-slate-600 mb-4">
              We've sent a password setup link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-slate-500">
              Click the link in the email to complete your password setup. Redirecting to login...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/6d6129877_Gemini_Generated_Image_qrppo5qrppo5qrpp.png"
              alt="MCI Connect"
              className="w-16 h-16 rounded-xl"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Welcome to MCI Connect</CardTitle>
          <CardDescription className="text-slate-600">
            Set up your password for: <strong>{email}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSetupPassword} className="space-y-4">
            <div>
              <Label htmlFor="password" className="text-slate-900">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                minLength={8}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Must be at least 8 characters</p>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-slate-900">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                minLength={8}
                className="mt-1"
              />
            </div>

            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Complete Setup'
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600 mt-6">
            Already have an account?{' '}
            <a href="/" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}