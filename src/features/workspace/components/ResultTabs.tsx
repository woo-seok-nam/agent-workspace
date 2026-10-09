export type ResultTab =
  | "final"
  | "intermediate"
  | "agents"
  | "logs";

interface ResultTabsProps {
  activeTab: ResultTab;

  onChange: (
    tab: ResultTab,
  ) => void;
}

const tabs: {
  id: ResultTab;
  label: string;
}[] = [
  {
    id: "final",
    label: "Final Result",
  },
  {
    id: "intermediate",
    label: "Intermediate Outputs",
  },
  {
    id: "agents",
    label: "Agent Outputs",
  },
  {
    id: "logs",
    label: "Execution Log",
  },
];

export function ResultTabs({
  activeTab,
  onChange,
}: ResultTabsProps) {
  return (
    <nav className="result-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={[
            "result-tab",
            activeTab === tab.id
              ? "result-tab--active"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() =>
            onChange(tab.id)
          }
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}