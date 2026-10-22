import { signOut } from "../login/actions";

export default function SuspensoPage() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f4f6f8" }}>
      <div style={{ maxWidth: 420, background: "#fff", border: "1px solid #e6ebf0", borderRadius: 16, padding: 32, textAlign: "center" }}>
        <h1 style={{ font: "700 22px Manrope, sans-serif", color: "#102541", marginBottom: 10 }}>Conta suspensa</h1>
        <p style={{ color: "#748397", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          Sua conta foi suspensa por um administrador. Se você acha que isso foi um engano, fale com a instituição.
        </p>
        <form action={signOut}>
          <button style={{ background: "#102541", color: "#fff", border: 0, borderRadius: 9, padding: "11px 18px", fontWeight: 700, cursor: "pointer" }}>
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
