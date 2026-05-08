"use client";

import { useState } from "react";
import { LockKeyhole } from "lucide-react";

export function AdminLogin({ nextPath }: { nextPath: string }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitAccess() {
    setLoading(true);
    setStatus({ tone: "info", text: "Verification du code..." });

    try {
      const response = await fetch("/api/admin/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Code invalide.");
      }

      window.location.href = nextPath || "/";
    } catch (error) {
      setStatus({ tone: "error", text: error instanceof Error ? error.message : "Acces refuse." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="loginShell">
      <section className="loginPanel">
        <div className="loginIcon">
          <LockKeyhole size={22} />
        </div>
        <p className="eyebrow">Console admin</p>
        <h1>EmailOps Admin</h1>
        <p className="loginCopy">Entre le code admin pour ouvrir la console email.</p>
        <label>
          Code admin
          <input
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                submitAccess();
              }
            }}
            type="password"
          />
        </label>
        <button type="button" onClick={submitAccess} disabled={loading || !code}>
          {loading ? "Verification..." : "Acceder"}
        </button>
        {status ? <div className="formStatus" data-tone={status.tone}>{status.text}</div> : null}
      </section>
    </main>
  );
}
