import { NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faCube,
  faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";

const navItems = [
  { name: "Home", path: "/", icon: faHouse },
  { name: "3D environments", path: "/environments", icon: faCube },
  { name: "About", path: "/about", icon: faCircleInfo },
];

export default function FloatingNav() {
  return (
    <nav
      aria-label="Main"
      className="relative z-50 -mt-6 mb-0 flex justify-center px-3 sm:-mt-8"
    >
      <div className="flex max-w-full items-center gap-1 rounded-full border border-black/10 bg-white/90 p-1.5 shadow-lg backdrop-blur-md sm:p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === "/"}
            aria-label={item.name}
            className={({ isActive }) =>
              `flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-3.5 py-3 text-sm font-medium transition-all duration-200 sm:px-5 sm:py-2.5 ${
                isActive
                  ? "bg-brand-secondary text-brand-grey"
                  : "text-black/60 hover:bg-black/5 hover:text-black"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <FontAwesomeIcon icon={item.icon} className="text-[15px]" />
                {/* Mobile: label only on the active tab. sm and up: always show */}
                <span className={isActive ? "inline" : "hidden sm:inline"}>
                  {item.name}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}