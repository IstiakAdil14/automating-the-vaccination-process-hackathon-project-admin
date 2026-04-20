import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { FraudAlert } from "@/models/FraudAlert";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      // Send initial connection confirmation
      send({ type: "connected", ts: new Date().toISOString() });

      await connectDB();

      // Poll for new HIGH/CRITICAL alerts every 15 seconds
      let lastChecked = new Date();

      const interval = setInterval(async () => {
        try {
          const newAlerts = await FraudAlert.find({
            severity:  { $in: ["HIGH", "CRITICAL"] },
            status:    "OPEN",
            createdAt: { $gt: lastChecked },
          })
            .populate("centerId", "name address.division")
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

          lastChecked = new Date();

          if (newAlerts.length > 0) {
            for (const alert of newAlerts) {
              const center = alert.centerId as unknown as { name: string; address: { division: string } };
              send({
                type:       "new_alert",
                alertId:    alert.alertId,
                severity:   alert.severity,
                alertType:  alert.type,
                centerName: center?.name ?? "Unknown",
                division:   center?.address?.division ?? "",
                createdAt:  alert.createdAt.toISOString(),
              });
            }
          } else {
            // Heartbeat to keep connection alive
            send({ type: "heartbeat", ts: new Date().toISOString() });
          }
        } catch {
          // DB error - send heartbeat to keep connection alive
          send({ type: "heartbeat", ts: new Date().toISOString() });
        }
      }, 15_000);

      // Clean up on client disconnect
      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
