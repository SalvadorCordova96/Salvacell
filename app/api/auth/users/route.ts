import { GETUsers, POSTUsers } from "@/backend/http/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = GETUsers;
export const POST = POSTUsers;
