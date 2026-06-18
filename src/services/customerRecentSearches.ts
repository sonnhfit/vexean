import { CustomerSearchLocation } from '../types/navigation';
import { requestJson } from './apiClient';

export type CustomerRecentSearch = {
  id: number;
  origin_id?: number;
  destination_id?: number;
  origin: CustomerSearchLocation;
  destination: CustomerSearchLocation;
  travel_date: string;
  return_date: string | null;
  round_trip: boolean;
  service_type?: string;
  searched_at?: string;
  created_at?: string;
};

type RecentSearchesResponse = {
  results: CustomerRecentSearch[];
};

export async function fetchCustomerRecentSearches(limit = 10) {
  const params = new URLSearchParams({
    limit: String(limit),
  });
  const data = await requestJson<RecentSearchesResponse>(
    `/api/nhaxe/customer/recent-searches/?${params.toString()}`,
    {
      method: 'GET',
      auth: true,
      logLabel: 'customer-recent-searches',
    },
  );
  return data.results || [];
}

export async function clearCustomerRecentSearches() {
  return requestJson('/api/nhaxe/customer/recent-searches/', {
    method: 'DELETE',
    auth: true,
    logLabel: 'customer-clear-recent-searches',
  });
}
