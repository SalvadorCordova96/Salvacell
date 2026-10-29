import { GET as health } from "@/backend/http/health";

export const dynamic = "force-dynamic";

export function GET() {
  return health();
}
