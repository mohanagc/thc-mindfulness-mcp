import {
  API_DOCS_URL,
  DEVELOPER_PAGE_URL,
  MCP_PRODUCTION_URL,
  MCP_REPO_URL,
  PROVIDER_NAME,
  SERVER_TITLE,
} from "../src/lib/constants.js";

const linkStyle: React.CSSProperties = { color: "#c9a96e", textDecoration: "none" };

export default function Home() {
  return (
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "64px 24px",
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ fontStyle: "italic", fontWeight: 400, color: "#e8ddd4" }}>{SERVER_TITLE}</h1>
      <p style={{ color: "rgba(255,255,255,0.72)" }}>
        A public, read-only Model Context Protocol server exposing {PROVIDER_NAME}&apos;s
        approved public mindfulness resources — games, free guided practices, research
        summaries, a glossary, and the public PanchaVikas framework overview.
      </p>

      <dl style={{ marginTop: 32 }}>
        <dt style={{ color: "#d4c5bc", fontWeight: 600 }}>MCP endpoint</dt>
        <dd style={{ margin: "4px 0 16px" }}>
          <code>{MCP_PRODUCTION_URL}</code> (Streamable HTTP, no authentication required)
        </dd>

        <dt style={{ color: "#d4c5bc", fontWeight: 600 }}>Provider</dt>
        <dd style={{ margin: "4px 0 16px" }}>{PROVIDER_NAME}</dd>

        <dt style={{ color: "#d4c5bc", fontWeight: 600 }}>REST API</dt>
        <dd style={{ margin: "4px 0 16px" }}>
          <a href={API_DOCS_URL} style={linkStyle}>
            {API_DOCS_URL}
          </a>
        </dd>

        <dt style={{ color: "#d4c5bc", fontWeight: 600 }}>Developer page</dt>
        <dd style={{ margin: "4px 0 16px" }}>
          <a href={DEVELOPER_PAGE_URL} style={linkStyle}>
            {DEVELOPER_PAGE_URL}
          </a>
        </dd>

        <dt style={{ color: "#d4c5bc", fontWeight: 600 }}>Source</dt>
        <dd style={{ margin: "4px 0 16px" }}>
          <a href={MCP_REPO_URL} style={linkStyle}>
            {MCP_REPO_URL}
          </a>
        </dd>
      </dl>
    </main>
  );
}
