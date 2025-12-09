"use client";

import Head from "next/head";
import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Page() {
  const [connectivity, setConnectivity] = useState<string>("checking");
  const [status, setStatus] = useState<string>("Pinging diagnostics endpoint...");

  useEffect(() => {
    async function runDiagnostics() {
      try {
        const result = await Sentry.diagnoseSdkConnectivity();
        setConnectivity(result);
      } catch (err) {
        setConnectivity("unknown");
        Sentry.captureException(err);
      }

      try {
        const response = await fetch("/api/sentry-example-api");
        if (!response.ok) {
          setStatus(`Diagnostics endpoint returned ${response.status}`);
        } else {
          const payload = await response.json();
          setStatus(payload.message ?? "Diagnostics endpoint healthy");
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setStatus(`Request failed: ${message}`);
        Sentry.captureException(err);
      }
    }

    void runDiagnostics();
  }, []);

  return (
    <div>
      <Head>
        <title>Sentry Diagnostics</title>
        <meta name="description" content="Sentry connectivity diagnostics" />
      </Head>

      <main>
        <h1>Sentry Health Check</h1>
        <p className="description">Use this page to verify that the SDK can reach Sentry and that the diagnostics API responds without errors.</p>

        <section className="card">
          <h2>SDK Connectivity</h2>
          <p>
            {connectivity === "checking" && "Checking Sentry connectivity..."}
            {connectivity !== "checking" && `Result: ${connectivity}`}
          </p>
        </section>

        <section className="card">
          <h2>Diagnostics Endpoint</h2>
          <p>{status}</p>
        </section>
      </main>

      <style>{`
        main {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 48px 24px;
          max-width: 720px;
          margin: 0 auto;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
        }

        h1 {
          font-size: 28px;
          font-weight: 700;
        }

        .description {
          color: #6E6C75;
        }

        .card {
          border-radius: 16px;
          border: 1px solid rgba(100, 116, 139, 0.3);
          padding: 24px;
          background: rgba(15, 23, 42, 0.4);
          color: #e2e8f0;
        }

        h2 {
          margin-bottom: 8px;
          font-size: 20px;
        }
      `}</style>
    </div>
  );
}
