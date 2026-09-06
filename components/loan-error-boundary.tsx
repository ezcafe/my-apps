"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SHELL_FULL_SPAN } from "@/lib/shell-layout";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class LoanErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[LoanErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className={SHELL_FULL_SPAN}>
          <Alert
            variant="error"
            title="Loans failed to load"
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
