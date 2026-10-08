import {
  Bot,
  Clock3,
  GitBranch,
  GitMerge,
  Hand,
  Layers3,
  PackageOpen,
  Wrench,
} from "lucide-react";

const nodeGroups = [
  {
    title: "Agent",
    items: [
      {
        id: "agent",
        label: "Agent",
        icon: Bot,
      },
    ],
  },

  {
    title: "Tools",
    items: [
      {
        id: "tool",
        label: "Tool",
        icon: Wrench,
      },
    ],
  },

  {
    title: "Flow",
    items: [
      {
        id: "input-output",
        label: "Input / Output",
        icon: PackageOpen,
      },
      {
        id: "condition",
        label: "Condition",
        icon: GitBranch,
      },
      {
        id: "parallel",
        label: "Parallel",
        icon: Layers3,
      },
      {
        id: "merge",
        label: "Merge",
        icon: GitMerge,
      },
      {
        id: "delay",
        label: "Delay",
        icon: Clock3,
      },
      {
        id: "approval",
        label: "Human Approval",
        icon: Hand,
      },
    ],
  },
];

export function NodeLibrary() {
  return (
    <aside className="node-library">
      <div className="node-library__header">
        <h2>Nodes</h2>
      </div>

      {nodeGroups.map((group) => (
        <section
          key={group.title}
          className="node-library__group"
        >
          <h3>{group.title}</h3>

          <div className="node-library__items">
            {group.items.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  className="node-library__item"
                >
                  <Icon size={15} />

                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </aside>
  );
}