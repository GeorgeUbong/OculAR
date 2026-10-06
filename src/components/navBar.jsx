import { NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion, useReducedMotion } from "motion/react";
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
  const reduce = useReducedMotion();

  // Spring for the sliding pill; instant for reduced-motion users
  const pillTransition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 380, damping: 32, mass: 0.8 };

  return (
    <nav
      aria-label="Main"
      className="relative z-50 -mt-6 mb-0 flex justify-center px-3 sm:-mt-8"
    >
      <div className="flex max-w-full items-center gap-1 rounded-full border border-white/20 bg-white/15 p-1.5 shadow-2xl backdrop-blur-xl sm:p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === "/"}
            aria-label={item.name}
            className={({ isActive }) =>
              `relative flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-3.5 py-3 text-sm font-medium transition-colors duration-200 sm:px-5 sm:py-2.5 ${
                isActive
                  ? "text-on-accent"
                  : "text-copy/70 hover:bg-copy/5 hover:text-copy"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Shared pill: only the active tab renders it, so it slides between tabs */}
                {isActive && (
                  <motion.span
                    layoutId="nav-active-pill"
                    transition={pillTransition}
                    style={{ borderRadius: 9999 }}
                    className="absolute inset-0 bg-brand-secondary"
                    aria-hidden="true"
                  />
                )}

                <span className="relative z-10 flex items-center gap-2">
                  <FontAwesomeIcon icon={item.icon} className="text-[15px]" />
                  {/* Mobile: label only on the active tab. sm and up: always show */}
                  <span className={isActive ? "inline" : "hidden sm:inline"}>
                    {item.name}
                  </span>
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}