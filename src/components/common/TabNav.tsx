type Tab = "meals" | "planner" | "shopping" | "settings";

interface TabNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "meals", label: "Meals" },
  { id: "planner", label: "Planner" },
  { id: "shopping", label: "Shopping List" },
  { id: "settings", label: "Settings" },
];

export default function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <nav className="bg-white border-b border-gray-200 px-6">
      <div className="flex items-center h-14">
        <span className="text-lg font-bold text-gray-800 mr-8">
          Meal Planner
        </span>
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                activeTab === tab.id
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
