import { deletePhoto, servePhoto } from "@/backend/http/photo-evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return servePhoto(request, id);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return deletePhoto(request, id);
}
