import { POST as postSupplierMessage } from "@/backend/http/agent-supplier-messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return postSupplierMessage(request);
}
