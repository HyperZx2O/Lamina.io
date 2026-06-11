import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-base-900 flex items-center justify-center p-8">
          <div className="glass-card max-w-lg w-full p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-accent-rose/20 flex items-center justify-center mx-auto mb-5">
              <span className="text-2xl">!</span>
            </div>
            <h2 className="font-display text-xl font-semibold text-base-50 mb-2">Something went wrong</h2>
            <p className="text-sm text-base-200 mb-6 leading-relaxed">
              {this.state.error.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-lg border-none bg-accent-sage text-base-900 font-bold text-sm cursor-pointer hover:opacity-90 transition-opacity"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
