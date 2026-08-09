"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Prevents a single analytics render/runtime failure from blanking the whole
 * Money shell (Safari is especially sensitive to IntersectionObserver / dialog
 * / SVG animation edge cases).
 */
export class AnalyticsErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AnalyticsErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className={MONEY_FULL_SPAN}>
          <Alert
            variant="error"
            title="Analytics failed to load"
            description={
              this.state.error.message ||
              "Something went wrong rendering this page."
            }
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => {
              this.setState({ error: null });
              if (typeof window !== "undefined") window.location.reload();
            }}
          >
            Reload
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
