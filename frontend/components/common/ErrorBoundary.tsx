"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-10 bg-white rounded-3xl border-2 border-dashed border-red-100 space-y-6 text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500">
            <AlertCircle size={40} />
          </div>
          <div className="space-y-2 max-w-md">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Signal Interrupted</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              We encountered a synchronized health data collision. Please attempt to re-establish connection.
            </p>
          </div>
          <Button 
            onClick={this.handleReset}
            className="rounded-2xl h-14 px-10 font-black uppercase text-[11px] tracking-widest bg-red-600 hover:bg-black text-white shadow-xl shadow-red-900/20 flex gap-2 items-center transition-all"
          >
            <RefreshCcw size={16} />
            Re-Initialize Interface
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
