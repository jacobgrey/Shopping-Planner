import { MEAL_TAGS } from "../../types/meals";

interface TagSelectorProps {
  selected: string[];
  onChange: (tags: string[]) => void;
}

export default function TagSelector({ selected, onChange }: TagSelectorProps) {
  function toggle(tag: string) {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  }

  return (
    <div className="flex flex-wrap gap-1">
      {MEAL_TAGS.map((tag) => (
        <button
          key={tag}
          onClick={() => toggle(tag)}
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition ${
            selected.includes(tag)
              ? "border-blue-400 bg-blue-50 text-blue-700"
              : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          {tag.replace(/-/g, " ")}
        </button>
      ))}
    </div>
  );
}
