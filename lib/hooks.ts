import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useSheetData<T = Record<string, unknown>>(tab: string) {
  return useSWR<T>(`/api/sheets/${tab}`, fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  });
}
