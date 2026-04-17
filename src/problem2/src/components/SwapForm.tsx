import { useState, useMemo } from 'react';
import { useTokenPrices } from '../hooks/useTokenPrices';
import { TokenSelect } from './TokenSelect';
import { validateAmount } from '../utils/validators';
import { ArrowDownUp, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import BigNumber from 'bignumber.js';

BigNumber.config({ EXPONENTIAL_AT: 1e+9 });

export const SwapForm = () => {
  const { tokens, loading, error } = useTokenPrices();
  
  const [fromCurrency, setFromCurrency] = useState<string>('USD');
  const [toCurrency, setToCurrency] = useState<string>('ETH');
  
  const [amount, setAmount] = useState<string>('');
  const [amountError, setAmountError] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const fromToken = useMemo(() => tokens.find(t => t.currency === fromCurrency) || tokens[0] || null, [tokens, fromCurrency]);
  const toToken = useMemo(() => tokens.find(t => t.currency === toCurrency) || (tokens.length > 1 ? tokens[1] : tokens[0]) || null, [tokens, toCurrency]);

  const formatWithCommas = (value: string) => {
    if (!value) return '';
    const parts = value.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join('.');
  };

  const handleSwapTokens = () => {
    setFromCurrency(toToken?.currency || 'ETH');
    setToCurrency(fromToken?.currency || 'USD');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/,/g, '');
    // Allow empty string or valid float format during typing
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setAmount(val);
      if (val && val !== '.') {
        setAmountError(validateAmount(val));
      } else {
        setAmountError(null);
      }
    }
  };

  const exchangeRate = useMemo(() => {
    if (!fromToken || !toToken || !fromToken.price || !toToken.price) return 0;
    return fromToken.price / toToken.price;
  }, [fromToken, toToken]);

  const expectedOutput = useMemo(() => {
    if (!amount || amount === '.') return '0.00';
    try {
      const amtBn = new BigNumber(amount);
      const rateBn = new BigNumber(exchangeRate);
      if (amtBn.isNaN() || rateBn.isNaN()) return '0.00';
      return amtBn.multipliedBy(rateBn).toFixed(6);
    } catch {
      return '0.00';
    }
  }, [amount, exchangeRate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const err = validateAmount(amount);
    if (err) {
      setAmountError(err);
      return;
    }
    
    if (!fromToken || !toToken) {
      return;
    }

    setIsSubmitting(true);
    setIsSuccess(false);

    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsSubmitting(false);
    setIsSuccess(true);
    setAmount('');
    
    // Reset success state after a while
    setTimeout(() => setIsSuccess(false), 3000);
  };

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-8 w-full flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-text-secondary font-medium animate-pulse">Fetching latest prices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel rounded-2xl p-8 w-full flex flex-col items-center justify-center min-h-[400px] border-error/20">
        <AlertCircle className="w-12 h-12 text-error mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Connection Error</h3>
        <p className="text-text-secondary text-center">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-3xl shadow-2xl relative">
      {/* Decorative gradient blob inside the card - using a separate wrapper for overflow clipping */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
      </div>
      
      <div className="relative z-10 p-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white tracking-tight">Swap Assets</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* From Section */}
          <div className="glass-input rounded-2xl p-5 transition-all duration-300">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Amount to send
            </label>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 overflow-x-auto no-scrollbar">
                <input
                  type="text"
                  value={formatWithCommas(amount)}
                  onChange={handleAmountChange}
                  placeholder="0.00"
                  className="w-full bg-transparent text-3xl font-semibold text-white focus:outline-none placeholder-gray-600 min-w-0"
                  disabled={isSubmitting}
                />
              </div>
              <div className="shrink-0 w-36">
                <TokenSelect
                  tokens={tokens}
                  selectedToken={fromToken}
                  onSelect={(t) => setFromCurrency(t.currency)}
                />
              </div>
            </div>
            {fromToken && amount && amount !== '.' && !amountError && (
              <div className="text-xs text-gray-500 mt-2">
                ≈ ${formatWithCommas(new BigNumber(amount).multipliedBy(fromToken.price).toFixed(2))}
              </div>
            )}
            {amountError && (
              <p className="text-error text-xs font-medium mt-2 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" /> {amountError}
              </p>
            )}
          </div>

          {/* Swap Direction Button */}
          <div className="relative flex justify-center -my-3 z-20">
            <button
              type="button"
              onClick={handleSwapTokens}
              disabled={isSubmitting}
              className="p-3 bg-surface border border-white/10 rounded-xl text-primary hover:bg-surface-hover hover:scale-110 hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all duration-200 group"
            >
              <ArrowDownUp className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
            </button>
          </div>

          {/* To Section */}
          <div className="glass-input rounded-2xl p-5 transition-all duration-300">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Amount to receive
            </label>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 overflow-x-auto no-scrollbar">
                <input 
                  type="text" 
                  readOnly 
                  value={amount && amount !== '.' ? formatWithCommas(expectedOutput) : ''}
                  placeholder="0.00"
                  className="w-full bg-transparent text-3xl font-semibold text-white focus:outline-none placeholder-gray-600 min-w-0"
                />
              </div>
              <div className="shrink-0 w-36">
                <TokenSelect
                  tokens={tokens}
                  selectedToken={toToken}
                  onSelect={(t) => setToCurrency(t.currency)}
                />
              </div>
            </div>
          </div>

          {/* Exchange Rate Info */}
          {fromToken && toToken && (
            <div className="flex items-center justify-between px-2 text-sm">
              <span className="text-text-secondary">Exchange Rate</span>
              <span className="text-gray-300 font-medium tracking-wide">
                1 {fromToken.currency} = {formatWithCommas(new BigNumber(exchangeRate).toFixed(6))} {toToken.currency}
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !amount || !!amountError || !fromToken || !toToken}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-2 transition-all duration-300 shadow-lg
              ${isSuccess 
                ? 'bg-success text-white shadow-success/25' 
                : isSubmitting 
                  ? 'bg-primary/50 text-white/70 cursor-not-allowed' 
                  : !amount || !!amountError
                    ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                    : 'bg-primary hover:bg-primary-hover text-white shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5'
              }
            `}
          >
            {isSuccess ? (
              <>
                <CheckCircle2 className="w-6 h-6 animate-in zoom-in" />
                <span>Swap Successful!</span>
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Confirm Swap</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
