import { useEffect, useState } from "react";

export interface UsePollingStatusOptions<T> {
  fetcher: () => Promise<T>;
  interval?: number;
  enabled?: boolean;
}

export function usePollingStatus<T>({
  fetcher,
  interval = 5000,
  enabled = true,
}: UsePollingStatusOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const poll = async () => {
      try {
        const result = await fetcher();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };

    poll();
    const intervalId = setInterval(poll, interval);

    return () => clearInterval(intervalId);
  }, [fetcher, interval, enabled]);

  return { data, isLoading, error };
}
