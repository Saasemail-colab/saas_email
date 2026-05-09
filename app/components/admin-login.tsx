"use client";

import { useState } from "react";

export function AdminLogin({ nextPath }: { nextPath: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error ?? "Code admin invalide.");
      return;
    }

    window.location.href = nextPath;
  }

  return (
    <main className="adminGate">
      <section className="adminGateCard">
        <p className="eyebrow">Acces admin</p>
        <h1>Connexion admin</h1>
        <form
          className="adminGateForm"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label className="full">
            Code admin
            <input type="password" value={code} onChange={(event) => setCode(event.target.value)} />
          </label>
          <button type="submit">Entrer</button>
        </form>
        {error ? <div className="formStatus" data-tone="error">{error}</div> : null}
      </section>
    </main>
  );
}
