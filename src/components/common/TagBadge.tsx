const TAG_COLORS: Record<string, string> = {
  "low-effort": "bg-green-100 text-green-800",
  "has-leftovers": "bg-yellow-100 text-yellow-800",
  "low-cost": "bg-emerald-100 text-emerald-800",
  "filling": "bg-orange-100 text-orange-800",
  "kid-favorite": "bg-pink-100 text-pink-800",
  "dads-favorite": "bg-indigo-100 text-indigo-800",
  "healthy": "bg-lime-100 text-lime-800",
  "comfort-food": "bg-amber-100 text-amber-800",
  "quick": "bg-sky-100 text-sky-800",
  "slow-cooker": "bg-red-100 text-red-800",
  "grill": "bg-orange-100 text-orange-800",
  "vegetarian": "bg-teal-100 text-teal-800",
};

const DEFAULT_COLOR = "bg-gray-100 text-gray-700";

interface TagBadgeProps {
  tag: string;
  onRemove?: () => void;
}

export default function TagBadge({ tag, onRemove }: TagBadgeProps) {
  const colorClass = TAG_COLORS[tag] || DEFAULT_COLOR;
  const label = tag.replace(/-/g, " ");

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
