"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children:  ReactNode;
  /** Optional label shown in the error card, e.g. "Dashboard KPIs" */
  section?:  string;
  /** Optional Sentry-style reporter */
  onError?:  (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error:    Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.section ? ` - ${this.props.section}` : ""}]`, error, info);
    this.props.onError?.(error, info);
  }

  retry = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-xl border border-[var(--warning)] bg-[var(--warning-subtle)] p-6 text-center">
        <AlertTriangle className="h-8 w-8 text-[var(--warning)]" />
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {this.props.section
              ? `"${this.props.section}" failed to load`
              : "This section failed to load"}
          </p>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">
            {this.state.error?.message ?? "An unexpected rendering error occurred"}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={this.retry} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    );
  }
}
