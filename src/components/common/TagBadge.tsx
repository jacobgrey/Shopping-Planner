import type { TagDefinition } from "../../types/meals";
import { TAG_COLOR_PALETTE } from "../../data/tag-colors";

const DEFAULT_COLOR = "bg-gray-100 text-gray-700";

interface TagBadgeProps {
  tag: string;
  allTags?: TagDefinition[];
  onRemove?: () => void;
}

export default function TagBadge({ tag, allTags, onRemove }: TagBadgeProps) {
  const def = allTags?.find((t) => t.id === tag);
  const colorClass = def
    ? TAG_COLOR_PALETTE[def.colorIndex % TAG_COLOR_PALETTE.length]
    : DEFAULT_COLOR;
  const label = def?.label || tag.replace(/-/g, " ");

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colorClass}`}
    >
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 hover:opacity-70 text-current"
          aria-label={`Remove ${label}`}
        >
          &times;
        </button>
      )}
    </span>
  );
}
