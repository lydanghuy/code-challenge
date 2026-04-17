import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { type TokenPrice } from '../types';

interface TokenSelectProps {
  tokens: TokenPrice[];
  selectedToken: TokenPrice | null;
  onSelect: (token: TokenPrice) => void;
}

export const TokenSelect = ({ tokens, selectedToken, onSelect }: TokenSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredTokens = tokens.filter(t => 
    t.currency.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTokenImageUrl = (currency: string) => {
    return `https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/${currency}.svg`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between glass-input rounded-xl p-3 text-left focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 hover:bg-white/5"
      >
        {selectedToken ? (
          <div className="flex items-center space-x-3">
            <img 
              src={getTokenImageUrl(selectedToken.currency)} 
              alt={selectedToken.currency}
              className="w-6 h-6 rounded-full bg-white/10"
              onError={(e) => {
                // Fallback if image fails to load
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="font-semibold text-white">{selectedToken.currency}</span>
          </div>
        ) : (
          <span className="text-gray-400">Select token</span>
        )}
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 glass-panel rounded-xl shadow-2xl overflow-hidden border border-white/10 animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search token..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-black/20 border border-white/5 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary/50"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto no-scrollbar py-2">
            {filteredTokens.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">No tokens found</div>
            ) : (
              filteredTokens.map((token) => (
                <button
                  key={token.currency}
                  type="button"
                  onClick={() => {
                    onSelect(token);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-2.5 hover:bg-white/10 transition-colors text-left"
                >
                  <img 
                    src={getTokenImageUrl(token.currency)} 
                    alt={token.currency}
                    className="w-6 h-6 rounded-full bg-white/10"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div>
                    <div className="font-medium text-white">{token.currency}</div>
                    <div className="text-xs text-gray-400">${token.price.toFixed(4)}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
