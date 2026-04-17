import { useState, useEffect } from 'react';
import { type TokenPrice } from '../types';

export const useTokenPrices = () => {
  const [tokens, setTokens] = useState<TokenPrice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true);
        const res = await fetch('https://interview.switcheo.com/prices.json');
        if (!res.ok) {
          throw new Error('Failed to fetch prices');
        }
        const data: TokenPrice[] = await res.json();
        
        const tokenMap = new Map<string, TokenPrice>();
        data.forEach(item => {
          if (item.price !== undefined) {
             tokenMap.set(item.currency, item);
          }
        });
        
        const uniqueTokens = Array.from(tokenMap.values()).sort((a, b) => 
          a.currency.localeCompare(b.currency)
        );
        
        setTokens(uniqueTokens);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, []);

  return { tokens, loading, error };
};
