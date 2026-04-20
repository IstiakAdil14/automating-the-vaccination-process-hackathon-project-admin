import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;

/* Ensure this route is always dynamic */
export const dynamic = "force-dynamic";
