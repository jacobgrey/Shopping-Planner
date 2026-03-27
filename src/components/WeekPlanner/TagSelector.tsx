import type { TagDefinition } from "../../types/meals";

interface TagSelectorProps {
  selected: string[];
  availableTags: TagDefinition[];
  onChange: (tags: string[]) => void;
}

export default function TagSelector({ selected, availableTags, onChange }: TagSelectorProps) {
  function toggle(tagId: string) {
    if (selected.includes(tagId)) {
      onChange(selected.filter((t) => t !== tagId));
    } else {
      onChange([...selected, tagId]);
    }
  }

  return (
    <div className="flex flex-wrap gap-1">
      {availableTags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => toggle(tag.id)}
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition ${
            selected.includes(tag.id)
              ? "border-blue-400 bg-blue-50 text-blue-700"
              : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          {tag.label}
        </button>
      ))}
    </div>
  );
}
