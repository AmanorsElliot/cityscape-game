import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function AuthPage({ onPlayGuest }: { onPlayGuest: () => void }) {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password, displayName || email.split('@')[0]);
      if (error) setError(error);
      else setSuccess('Check your email to confirm your account!');
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center">
      <div className="glass-panel rounded-2xl p-8 w-full max-w-md">
        <h1 className="font-display text-2xl font-bold glow-text text-primary text-center mb-2">CITYSCAPE</h1>
        <p className="text-muted-foreground text-center text-sm mb-6">
          {isSignUp ? 'Create your account' : 'Sign in to your city'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="text-xs font-display tracking-wider text-muted-foreground">City Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Mayor's name"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-display tracking-wider text-muted-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="mayor@city.com"
            />
          </div>
          <div>
            <label className="text-xs font-display tracking-wider text-muted-foreground">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}
          {success && <p className="text-emerald-400 text-xs">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-display text-sm tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? '...' : isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
          </button>
        </form>

        <button
          onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuccess(null); }}
          className="w-full mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>

        <div className="mt-6 pt-4 border-t border-border">
          <button
            onClick={onPlayGuest}
            className="w-full py-2.5 rounded-lg bg-secondary text-secondary-foreground font-display text-sm tracking-wider hover:opacity-90 transition-opacity"
          >
            PLAY AS GUEST
          </button>
          <p className="text-[10px] text-muted-foreground text-center mt-2">Singleplayer only • No cloud saves</p>
        </div>
      </div>
    </div>
  );
}
