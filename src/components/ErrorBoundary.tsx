import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "Unknown error";
      const errorStack = this.state.error?.stack || "";
      
      return (
        <div style={{ 
          padding: "40px", 
          fontFamily: "system-ui, sans-serif",
          maxWidth: "800px",
          margin: "0 auto",
          backgroundColor: "#fff",
          minHeight: "100vh"
        }}>
          <h1 style={{ fontSize: "24px", marginBottom: "20px", color: "#dc2626" }}>
            Something went wrong.
          </h1>
          <div style={{ 
            backgroundColor: "#f3f4f6", 
            padding: "20px", 
            borderRadius: "8px",
            marginBottom: "20px",
            border: "1px solid #e5e7eb"
          }}>
            <h2 style={{ fontSize: "18px", marginBottom: "10px", fontWeight: "600" }}>
              Error Message:
            </h2>
            <pre style={{ 
              whiteSpace: "pre-wrap", 
              wordBreak: "break-word",
              fontSize: "14px",
              color: "#1f2937",
              marginBottom: "20px"
            }}>
              {errorMessage}
            </pre>
            {errorStack && (
              <>
                <h2 style={{ fontSize: "18px", marginBottom: "10px", fontWeight: "600" }}>
                  Stack Trace:
                </h2>
                <details>
                  <summary style={{ cursor: "pointer", marginBottom: "10px", color: "#4b5563" }}>
                    Click to expand stack trace
                  </summary>
                  <pre style={{ 
                    whiteSpace: "pre-wrap", 
                    wordBreak: "break-word",
                    fontSize: "12px",
                    color: "#6b7280",
                    backgroundColor: "#fff",
                    padding: "10px",
                    borderRadius: "4px",
                    overflow: "auto",
                    maxHeight: "400px"
                  }}>
                    {errorStack}
                  </pre>
                </details>
              </>
            )}
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: "12px 24px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "500"
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
