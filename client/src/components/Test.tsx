import { trpc } from "../api/trpc";

export function TestComponent() {
  const data = trpc.getReleases.useQuery();

  if (!data.data) {
    return <div>Loading...</div>;
  }

  return JSON.stringify(data.data);
}
