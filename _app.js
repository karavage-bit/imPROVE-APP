// Custom App component
// - Imports global CSS
// - Loads Plausible analytics (privacy-friendly, no cookies)
// - Wraps app in error boundary for graceful failures
// - Loads display fonts

import { Component } from "react";
import Head from "next/head";
import Script from "next/script";
import "../src/styles/globals.css";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Send to Sentry if configured
    if (typeof window !== "undefined" && window.Sentry) {
      window.Sentry.captureException(error, { extra: errorInfo });
    }
    console.error("App error boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "#0c0c0c",
            color: "#e4ddd0",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ maxWidth: 480, textAlign: "center" }}>
            <h1 style={{ fontSize: 22, marginBottom: 12, color: "#E8B84B" }}>
              Something went wrong on this page
            </h1>
            <p style={{ fontSize: 14, color: "#b8b0a4", lineHeight: 1.7, marginBottom: 24 }}>
              Your work is saved. This is on us, not you. Please reload to continue.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "11px 28px",
                background: "#E8B84B",
                color: "#0c0c0c",
                border: "none",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
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

export default function App({ Component, pageProps }) {
  const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0c0c0c" />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
        />
      </Head>

      {/* Plausible analytics - no cookies, no PII, GDPR-clean */}
      {PLAUSIBLE_DOMAIN && (
        <Script
          defer
          data-domain={PLAUSIBLE_DOMAIN}
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      )}

      {/* Sentry error tracking */}
      {SENTRY_DSN && (
        <Script id="sentry-init" strategy="afterInteractive">
          {`
            (function() {
              var script = document.createElement('script');
              script.src = 'https://browser.sentry-cdn.com/7.99.0/bundle.min.js';
              script.crossOrigin = 'anonymous';
              script.onload = function() {
                if (window.Sentry) {
                  window.Sentry.init({
                    dsn: '${SENTRY_DSN}',
                    tracesSampleRate: 0.1,
                    beforeSend: function(event) {
                      // Strip any user reflection content from breadcrumbs
                      if (event.breadcrumbs) {
                        event.breadcrumbs = event.breadcrumbs.filter(function(b) {
                          return !b.data || !b.data.body;
                        });
                      }
                      return event;
                    }
                  });
                }
              };
              document.head.appendChild(script);
            })();
          `}
        </Script>
      )}

      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </>
  );
}
