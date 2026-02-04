import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center w-full h-full bg-[#050b14] text-white p-4 border border-red-900/30 rounded-lg">
                    <div className="p-4 bg-red-500/10 rounded-full mb-4 animate-pulse">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-red-400 mb-2">Error al cargar mapa satelital</h2>
                    <p className="text-sm text-gray-400 text-center max-w-md">
                        El sistema de visualización encontró un problema inesperado.
                        Los datos siguen seguros y la telemetría operativa.
                    </p>
                    <div className="mt-4 text-xs text-gray-600 font-mono bg-black/50 p-2 rounded">
                        Ref: {this.state.error?.message || 'Unknown Error'}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
