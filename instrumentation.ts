export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startSupplierMessageWorker } = await import("@/backend/agent/supplier-message-worker");
  const { startOperatorTranscriptionCleanup } = await import("@/backend/http/operator-transcriptions");
  startSupplierMessageWorker();
  startOperatorTranscriptionCleanup();
}
