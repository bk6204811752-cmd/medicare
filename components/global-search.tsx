"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type SearchResult = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      const timer = setTimeout(() => {
        setResults([]);
      }, 0);
      return () => clearTimeout(timer);
    }

    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((response) => response.json())
        .then((result) => {
          setResults(result.data ?? []);
          setOpen(true);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const visibleResults = query.trim().length < 2 ? [] : results;

  return (
    <div ref={containerRef} className="relative hidden max-w-md flex-1 md:block">
      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          className="h-10 w-full bg-transparent text-sm outline-none"
          placeholder="Search medicines, bills, customers..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(true)}
        />
        {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-med-green" />}
      </div>
      {open && query.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {visibleResults.map((result) => (
            <Link
              key={`${result.type}-${result.id}`}
              href={result.href}
              className="block border-b border-slate-100 p-3 last:border-b-0 hover:bg-med-greenSoft"
              onClick={() => {
                setOpen(false);
                setQuery("");
              }}
            >
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{result.type}</span>
              <span className="block font-semibold text-med-navy">{result.title}</span>
              <span className="block text-sm text-slate-500">{result.subtitle}</span>
            </Link>
          ))}
          {!visibleResults.length && !loading ? <div className="p-3 text-sm text-slate-500">No matches found.</div> : null}
        </div>
      ) : null}
    </div>
  );
}
