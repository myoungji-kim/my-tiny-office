import Link from "next/link";

import { getDictionary } from "../i18n";

import { currentLocale } from "./screen-data";

// The desktop window has no address bar or back button, so this always leads somewhere.
export default async function NotFound() {
  const w = getDictionary(await currentLocale()).notFound;
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="notice" style={{ maxWidth: 420 }}>
        <span className="n-tx">
          <b>{w.title}</b>
          <span>{w.body}</span>
        </span>
        <span className="n-acts">
          <Link className="btn btn-primary btn-sm" href="/">
            {w.back}
          </Link>
        </span>
      </div>
    </main>
  );
}
