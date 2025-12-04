import { useState, useEffect } from 'react';
import { API_ROUTES } from "@/modules/shared/constants/api-routes"
import { AuditLogFilters, AuditLogResult } from '@/modules/admin/services/audit-types';

interface UseAuditLogsProps {
    page?: number;
    limit?: number;
    filters?: AuditLogFilters;
}

export function useAuditLogs({ page = 1, limit = 10, filters = {} }: UseAuditLogsProps) {
  const [data, setData] = useState<AuditLogResult>({
    logs: [],
    total: 0,
    count: 0,
    limit: limit,
    offset: (page - 1) * limit,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const filtersString = JSON.stringify(filters);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const offset = (page - 1) * limit;
        
        const processedFilters: Record<string, string> = {};
        for (const key in filters) {
          if (Object.prototype.hasOwnProperty.call(filters, key)) {
            const value = filters[key as keyof AuditLogFilters];
            if (value instanceof Date) {
              processedFilters[key] = value.toISOString();
            } else if (value !== undefined && value !== null) {
              processedFilters[key] = String(value);
            }
          }
        }

        const queryParams = new URLSearchParams({
          ...processedFilters,
          limit: limit.toString(),
          offset: offset.toString(),
        });

        const response = await fetch(`${API_ROUTES.ADMIN_AUDIT}?${queryParams.toString()}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch audit logs: ${response.statusText}`);
        }

        const result: AuditLogResult = await response.json();
        setData(result);
      } catch (e: unknown) {
        if (e instanceof Error) {
            setError(e);
        } else {
            setError(new Error("An unknown error occurred"));
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [page, limit, filtersString]);

  return { data, isLoading, error };
}
