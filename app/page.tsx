import { Workspace } from "@/components/workspace";
import { SAMPLE_THREADS } from "@/lib/sample-data";

export default function Home() {
  return <Workspace initialThreads={SAMPLE_THREADS} />;
}
