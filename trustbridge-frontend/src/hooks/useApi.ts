import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { ApiResponse } from '../types/api';

// Generic API hook
export function useApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiCall();
        if (response.success) {
          setData(response.data);
        } else {
          setError(response.message || 'API call failed');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, dependencies);

  const refetch = () => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiCall();
        if (response.success) {
          setData(response.data);
        } else {
          setError(response.message || 'API call failed');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  };

  return { data, loading, error, refetch };
}

// Specific hooks for different data types
export function useAssets(params?: any) {
  return useApi(() => apiService.getAssets(params), [params]);
}

export function useAsset(id: string) {
  return useApi(() => apiService.getAsset(id), [id]);
}

export function usePortfolio(userId?: string) {
  return useApi(() => apiService.getPortfolio(userId), [userId]);
}

export function useInvestments() {
  return useApi(() => apiService.getInvestments(), []);
}

export function useMarketAnalytics() {
  return useApi(() => apiService.getMarketAnalytics(), []);
}


export function useFeaturedAssets() {
  return useApi(() => apiService.getFeaturedAssets(), []);
}

// Custom hooks for specific use cases
export function useAssetDiscovery(filters: {
  country?: string;
  type?: string;
  minValue?: number;
  maxValue?: number;
  minAPY?: number;
  maxAPY?: number;
}) {
  return useApi(() => apiService.getAssets(filters), [filters]);
}

export function useAssetByOwner(owner: string) {
  // Skip API call if owner is empty to avoid 400 error
  const shouldFetch = owner && owner.trim() !== '';
  return useApi(
    () => shouldFetch ? apiService.getAssetsByOwner(owner) : Promise.resolve({ success: true, data: [] }), 
    [owner]
  );
}
