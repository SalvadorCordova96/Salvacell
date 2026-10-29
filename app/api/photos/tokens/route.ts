import { createPhotoToken, revokePhotoTokens } from "@/backend/http/photo-evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createPhotoToken;
export const DELETE = revokePhotoTokens;
