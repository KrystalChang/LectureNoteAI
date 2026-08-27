import { auth } from "@/auth";
import LibraryBrowser from "@/components/library_browser";

export default async function DashboardPage() {
  const session = await auth();
  return <LibraryBrowser user={session?.user ?? null} />;
}
