import { getInitialData } from "@/app/actions";
import { HobbyApp } from "@/components/hobby-app";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getInitialData();

  return <HobbyApp activities={data.activities} initialLogs={data.logs} />;
}
