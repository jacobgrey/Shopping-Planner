import { useEffect, useMemo, useRef, useState } from "react";
import type { Meal, Side } from "../../types/meals";

interface SidePickerProps {
  sides: Side[];
  meal: Meal | undefined;
  currentSideId?: string;
  onPick: (sideId: string) => void;
  onClose: () => void;
}

export default function SidePicker({ sides, meal, currentSideId, onPick, onClose }: SidePickerProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const { preferredMatches, otherMatches } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const preferredIds = new Set(meal?.preferredSideIds ?? []);
    const match = (s: Side) => !q || s.name.toLowerCase().includes(q);

    const preferred: Side[] = [];
    const other: Side[] = [];
    for (const side of sides) {
      if (!match(side)) continue;
      if (preferredIds.has(side.id)) preferred.push(side);
      else other.push(side);
    }
    preferred.sort((a, b) => a.name.localeCompare(b.name));
    other.sort((a, b) => a.name.localeCompare(b.name));
    return { preferredMatches: preferred, otherMatches: other };
  }, [sides, meal, query]);

  const firstVisible = preferredMatches[0] ?? otherMatches[0];

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && firstVisible) {
      e.preventDefault();
      onPick(firstVisible.id);
    }
  }

  const hasPreferred = preferredMatches.length > 0;
  const anyMatches = preferredMatches.length + otherMatches.length > 0;

  return (
    <div
      ref={containerRef}
      className="absolute z-30 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-2 border-b border-gray-200">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Search sides..."
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="max-h-64 overflow-y-auto">
        {hasPreferred && (
          <>
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 bg-gray-50">
              Preferred
            </div>
            {preferredMatches.map((s) => (
              <Row key={s.id} side={s} selected={s.id === currentSideId} onPick={onPick} />
            ))}
            {otherMatches.length > 0 && <hr className="border-gray-200 my-0" />}
          </>
        )}
        {otherMatches.map((s) => (
          <Row key={s.id} side={s} selected={s.id === currentSideId} onPick={onPick} />
        ))}
        {!anyMatches && (
          <p className="px-3 py-3 text-xs text-gray-400 italic text-center">No sides match</p>
        )}
      </div>
    </div>
  );
}

function Row({
  side,
  selected,
  onPick,
}: {
  side: Side;
  selected: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(side.id)}
      className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 ${
        selected ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
      }`}
    >
      {side.name}
    </button>
  );
}
