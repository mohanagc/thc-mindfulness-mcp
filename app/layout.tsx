import type { Metadata } from "next";
import { SERVER_TITLE } from "../src/lib/constants.js";

export const metadata: Metadata = {
  title: SERVER_TITLE,
  description:
    "Read-only remote MCP server providing The Holistic Care's public mindfulness games, " +
    "free guided practices, research summaries, glossary, and PanchaVikas resources.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "Georgia, 'Times New Roman', serif",
          background: "#111",
          color: "#e8ddd4",
        }}
      >
        {children}
      </body>
    </html>
  );
}
