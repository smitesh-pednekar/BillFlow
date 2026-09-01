import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { listClients } from "@/db/queries/clients";
import { ClientsView } from "./ClientsView";

export const metadata: Metadata = { title: "Clients — BillFlow" };
export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const user = (await getCurrentUser())!;
  const clients = await listClients(user.id);
  return <ClientsView clients={clients} currency={user.currency ?? "USD"} />;
}
