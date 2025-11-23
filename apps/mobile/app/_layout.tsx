import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AnalyticsProvider } from "../src/contexts/AnalyticsProvider";
import "../global.css";

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AnalyticsProvider>
        <Stack>
          <Stack.Screen name="index" options={{ title: "Flaresmith" }} />
        </Stack>
      </AnalyticsProvider>
    </QueryClientProvider>
  );
}
