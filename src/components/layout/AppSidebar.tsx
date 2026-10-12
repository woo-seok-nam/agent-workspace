import {
  Bot,
  Home,
  Play,
  SquareStack,
  Wrench,
} from "lucide-react";

import {
  NavLink,
} from "react-router-dom";

const menuItems = [
  {
    label: "Home",
    path: "/home",
    icon: Home,
  },
  {
    label: "Workflows",
    path: "/workflows",
    icon: SquareStack,
  },
  {
    label: "Runs",
    path: "/runs",
    icon: Play,
  },
  {
    label: "Agents",
    path: "/agents",
    icon: Bot,
  },
  {
    label: "Tools",
    path: "/tools",
    icon: Wrench,
  },
];

export function AppSidebar() {
  return (
    <aside className="app-sidebar">
      <div className="app-sidebar__logo">
        <div className="app-sidebar__logo-icon">
          <Bot
            size={18}
          />
        </div>

        <span>
          Agent Workspace
        </span>
      </div>

      <nav
        className="app-sidebar__nav"
        aria-label="주요 메뉴"
      >
        {menuItems.map(
          (
            item,
          ) => {
            const Icon =
              item.icon;

            return (
              <NavLink
                key={
                  item.path
                }
                to={
                  item.path
                }
                className={({
                  isActive,
                }) =>
                  [
                    "app-sidebar__item",
                    isActive
                      ? "app-sidebar__item--active"
                      : "",
                  ]
                    .filter(
                      Boolean,
                    )
                    .join(
                      " ",
                    )
                }
              >
                <Icon
                  size={17}
                />

                <span>
                  {item.label}
                </span>
              </NavLink>
            );
          },
        )}
      </nav>

      <div className="app-sidebar__user">
        <div className="app-sidebar__avatar">
          U
        </div>

        <div>
          <strong>
            User
          </strong>

          <p>
            Local Workspace
          </p>
        </div>
      </div>
    </aside>
  );
}