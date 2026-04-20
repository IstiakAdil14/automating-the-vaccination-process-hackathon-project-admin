import mongoose, { type Connection } from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

/* --- Connection options ------------------------------------------------------- */
const CONNECT_OPTIONS: mongoose.ConnectOptions = {
  maxPoolSize:        10,   /* max concurrent connections in pool          */
  minPoolSize:        2,    /* keep at least 2 connections warm            */
  serverSelectionTimeoutMS: 5_000,   /* fail fast if no server found       */
  socketTimeoutMS:    45_000,        /* close idle sockets after 45s       */
  connectTimeoutMS:   10_000,        /* initial connection timeout          */
  heartbeatFrequencyMS: 10_000,      /* how often to check server health   */
  retryWrites:        true,
  retryReads:         true,
};

/* --- Global singleton cache (survives Next.js hot-reload) --------------------- */
declare global {
  // eslint-disable-next-line no-var
  var __mongoCache: {
    conn:    Connection | null;
    promise: Promise<Connection> | null;
    state:   "disconnected" | "connecting" | "connected" | "error";
  };
}

if (!global.__mongoCache) {
  global.__mongoCache = { conn: null, promise: null, state: "disconnected" };
}

const cache = global.__mongoCache;

/* --- Event listeners (attach once) ------------------------------------------- */
let listenersAttached = false;

function attachListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on("connected", () => {
    cache.state = "connected";
    if (process.env.NODE_ENV === "development") {
      console.log("[MongoDB] Connected to", mongoose.connection.name);
    }
  });

  mongoose.connection.on("disconnected", () => {
    cache.state = "disconnected";
    cache.conn  = null;
    cache.promise = null;
    if (process.env.NODE_ENV === "development") {
      console.warn("[MongoDB] Disconnected - will reconnect on next request");
    }
  });

  mongoose.connection.on("error", (err) => {
    cache.state = "error";
    cache.conn  = null;
    cache.promise = null;
    console.error("[MongoDB] Connection error:", err.message);
  });

  mongoose.connection.on("reconnected", () => {
    cache.state = "connected";
    if (process.env.NODE_ENV === "development") {
      console.log("[MongoDB] Reconnected");
    }
  });
}

/* --- connectDB ---------------------------------------------------------------- */
export async function connectDB(): Promise<Connection> {
  /* Already connected and healthy */
  if (cache.conn && cache.state === "connected") {
    return cache.conn;
  }

  /* Connection in progress - wait for it */
  if (cache.promise) {
    cache.conn = await cache.promise;
    return cache.conn;
  }

  attachListeners();
  cache.state = "connecting";

  if (!MONGODB_URI) throw new Error("MONGODB_URI environment variable is not defined");

  cache.promise = mongoose
    .connect(MONGODB_URI, CONNECT_OPTIONS)
    .then((m) => {
      cache.state = "connected";
      return m.connection;
    })
    .catch((err) => {
      cache.state   = "error";
      cache.promise = null;
      throw err;
    });

  cache.conn = await cache.promise;
  return cache.conn;
}

/* --- Graceful shutdown helper (for scripts / tests) -------------------------- */
export async function disconnectDB(): Promise<void> {
  if (cache.conn) {
    await mongoose.disconnect();
    cache.conn    = null;
    cache.promise = null;
    cache.state   = "disconnected";
  }
}

/* --- Health check ------------------------------------------------------------- */
export function getDBState(): typeof cache.state {
  return cache.state;
}
