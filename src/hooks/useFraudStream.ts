"use client";

import { useEffect, useState, useCallback } from "react";

export interface LiveAlert {
  alertId:    string;
  severity:   "HIGH" | "CRITICAL";
  alertType:  string;
  centerName: string;
  division:   string;
  createdAt:  string;
}

export function useFraudStream() {
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [connected,  setConnected]  = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/admin/fraud/stream");

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_alert") {
          setLiveAlerts((prev) => [data as LiveAlert, ...prev].slice(0, 20));
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, []);

  const dismiss = useCallback((alertId: string) => {
    setLiveAlerts((prev) => prev.filter((a) => a.alertId !== alertId));
  }, []);

  const dismissAll = useCallback(() => setLiveAlerts([]), []);

  return { liveAlerts, connected, dismiss, dismissAll };
}
