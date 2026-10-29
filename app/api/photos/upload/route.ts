import { uploadPhoto } from "@/backend/http/photo-evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export const POST = uploadPhoto;
