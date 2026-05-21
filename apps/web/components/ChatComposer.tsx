'use client';

import { useState } from 'react';
import { Send, Loader2, Check, X, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

interface ParsedIntent {
  action: string;
  team?: string;
  amount?: string;
  outcome?: string;
  confidence: number;
}

export default function ChatComposer({
  onSend,
  disabled = false,
}: {
  onSend?: (text: string) => Promise<ParsedIntent | null>;
  disabled?: boolean;
}) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [intent, setIntent] = useState<ParsedIntent | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setLoading(true);
    setError(null);
    setIntent(null);

    try {
      if (onSend) {
        const result = await onSend(input.trim());
        setIntent(result);
      } else {
        // Mock intent parsing
        await new Promise((r) => setTimeout(r, 1200));
        const mockIntent: ParsedIntent = {
          action: 'PLACE_BET',
          team: input.toLowerCase().includes('brazil') ? 'Brazil' : input.toLowerCase().includes('france') ? 'France' : 'Argentina',
          amount: '0.5',
          outcome: 'HOME',
          confidence: 0.87,
        };
        setIntent(mockIntent);
      }
    } catch (err) {
      setError('Failed to parse intent. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleConfirm() {
    // Would execute the bet here
    setIntent(null);
    setInput('');
  }

  function handleCancel() {
    setIntent(null);
  }

  return (
    <div className="space-y-4">
      {/* Intent confirmation card */}
      {intent && (
        <div className="card p-4 border-neon-green/30 animate-slide-up">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-4 w-4 text-neon-green" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-white mb-2">Confirm Intent</h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted">Action:</span>
                  <span className="mono text-neon-orange font-medium">{intent.action}</span>
                </div>
                {intent.team && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted">Team:</span>
                    <span className="text-white font-medium">{intent.team}</span>
                  </div>
                )}
                {intent.amount && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted">Amount:</span>
                    <span className="mono text-neon-green font-medium">{intent.amount} OKB</span>
                  </div>
                )}
                {intent.outcome && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted">Outcome:</span>
                    <span className="mono text-white font-medium">{intent.outcome}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-muted">Confidence:</span>
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-16 bg-background rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neon-green rounded-full"
                        style={{ width: `${intent.confidence * 100}%` }}
                      />
                    </div>
                    <span className="mono text-neon-green text-[10px]">{(intent.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <button onClick={handleConfirm} className="btn-primary !px-4 !py-2 text-xs flex items-center gap-1">
                  <Check className="h-3 w-3" /> Execute
                </button>
                <button onClick={handleCancel} className="btn-secondary !px-4 !py-2 text-xs flex items-center gap-1 !border-red-400/40 !text-red-400 hover:!bg-red-400/10">
                  <X className="h-3 w-3" /> Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-400 px-3">{error}</div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tell your scout what you think... (e.g. 'Bet 0.5 OKB on Brazil to win')"
          disabled={disabled || loading}
          className={clsx(
            'w-full bg-surface border border-border rounded-xl px-4 py-3.5 pr-12 text-sm text-white placeholder:text-muted/60',
            'focus:outline-none focus:border-neon-green/40 focus:ring-1 focus:ring-neon-green/20',
            'transition-all disabled:opacity-50'
          )}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading || disabled}
          className={clsx(
            'absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all',
            input.trim() && !loading
              ? 'text-neon-green hover:bg-neon-green/10'
              : 'text-muted/40'
          )}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </form>
    </div>
  );
}
