import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { notifStore, type AdminNotif } from "../route";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  let lastCount = notifStore.filter((n) => !n.read).length;

  const stream = new ReadableStream({
    start(controller) {
      /* Send initial connection confirmation */
      controller.enqueue(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

      const interval = setInterval(() => {
        const unread = notifStore.filter((n) => !n.read).length;

        /* Only push when unread count changes (new notification arrived) */
        if (unread !== lastCount) {
          const newest = notifStore.find((n) => !n.read);
          if (newest) {
            const payload: AdminNotif & { type_: string } = { ...newest, type_: "new_notification" };
            controller.enqueue(`data: ${JSON.stringify(payload)}\n\n`);
          }
          lastCount = unread;
        }
      }, 5_000);

      /* Clean up on disconnect */
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
