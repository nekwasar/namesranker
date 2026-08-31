"use client";

import { useState, FormEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { DirectoryFacets, DirectoryFilters, DirectorySort } from "@/lib/directory";
import styles from "./directory.module.css";

export default function DirectorySearch({
  facets,
  filters,
  total,
}: {
  facets: DirectoryFacets;
  filters: DirectoryFilters;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(filters.q);
  const [profession, setProfession] = useState(filters.profession);
  const [location, setLocation] = useState(filters.location);
  const [sort, setSort] = useState<DirectorySort>(filters.sort);

  const qs = (overrides: {
    page?: number;
    q?: string;
    profession?: string;
    location?: string;
    sort?: DirectorySort;
  }) => {
    const params = new URLSearchParams();
    const qv = overrides.q ?? q;
    const pv = overrides.profession ?? profession;
    const lv = overrides.location ?? location;
    const sv = overrides.sort ?? sort;
    if (qv) params.set("q", qv);
    if (pv) params.set("profession", pv);
    if (lv) params.set("location", lv);
    if (sv && sv !== "relevant") params.set("sort", sv);
    const s = params.toString();
    return `${pathname}${s ? `?${s}` : ""}`;
  };

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    router.push(qs({ page: 1 }));
  }

  function clear() {
    setQ("");
    setProfession("");
    setLocation("");
    setSort("relevant");
    router.push(pathname);
  }

  return (
    <div className={styles.searchPanel} data-testid="directory-search">
      <form className={styles.searchForm} onSubmit={submit} role="search">
        <label className={styles.searchBox}>
          <span className={styles.searchIcon} aria-hidden="true">
            ⌕
          </span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name — e.g. Smith"
            aria-label="Search by name"
            className={styles.searchInput}
            data-testid="directory-query"
          />
        </label>

        <label className={styles.select}>
          <span className={styles.selectLabel}>Profession</span>
          <select
            value={profession}
            onChange={(e) => {
              setProfession(e.target.value);
              router.push(qs({ page: 1, profession: e.target.value }));
            }}
            aria-label="Filter by profession"
            data-testid="directory-profession"
          >
            <option value="">All professions</option>
            {facets.professions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.select}>
          <span className={styles.selectLabel}>Location</span>
          <select
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              router.push(qs({ page: 1, location: e.target.value }));
            }}
            aria-label="Filter by location"
            data-testid="directory-location"
          >
            <option value="">All locations</option>
            {facets.locations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className={styles.searchBtn} data-testid="directory-submit">
          Search
        </button>
        {filters.q || filters.profession || filters.location ? (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={clear}
            data-testid="directory-clear"
          >
            Clear
          </button>
        ) : null}
      </form>

      <div className={styles.searchRow}>
        <div className={styles.sort} role="group" aria-label="Sort results">
          {(
            [
              ["relevant", "Relevance"],
              ["name", "Name A–Z"],
              ["recent", "Recently added"],
            ] as [DirectorySort, string][]
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              className={`${styles.sortBtn} ${sort === val ? styles.sortActive : ""}`}
              onClick={() => {
                setSort(val);
                router.push(qs({ page: 1, sort: val }));
              }}
              aria-pressed={sort === val}
            >
              {label}
            </button>
          ))}
        </div>
        <p className={styles.resultsNote}>
          {total.toLocaleString()} results — search matches full and partial names.
        </p>
      </div>
    </div>
  );
}
