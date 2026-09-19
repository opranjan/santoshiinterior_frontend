"use client";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import {
  filterNavItems,
  NAV_ITEMS,
  OPERATIONS_NAV_ITEMS,
  OTHER_NAV_ITEMS,
  type NavPermissionGroup,
  type NavPermissionItem,
} from "@/lib/permissions";
import {
  BoxCubeIcon,
  BoxIconLine,
  CalenderIcon,
  ChatIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  DocsIcon,
  DollarLineIcon,
  FileIcon,
  GridIcon,
  GroupIcon,
  HorizontaLDots,
  PencilIcon,
  PlugInIcon,
  TaskIcon,
  UserCircleIcon,
  UserIcon,
} from "../icons/index";

type NavItem = NavPermissionGroup & {
  icon: React.ReactNode;
};

const ICONS: Record<string, React.ReactNode> = {
  Dashboard: <GridIcon />,
  Stores: <BoxCubeIcon />,
  Sales: <DollarLineIcon />,
  Quotations: <FileIcon />,
  "Web & App": <GroupIcon />,
  Customer: <GroupIcon />,
  Design: <PencilIcon />,
  Operations: <BoxCubeIcon />,
  Procurement: <FileIcon />,
  Vendors: <GroupIcon />,
  "Work Order": <DocsIcon />,
  "Purchase Order": <FileIcon />,
  Payments: <BoxIconLine />,
  "Warranty Desk": <CheckCircleIcon />,
  HR: <UserIcon />,
  Calendar: <CalenderIcon />,
  Admin: <UserCircleIcon />,
  Integrations: <PlugInIcon />,
  Communication: <ChatIcon />,
};

const withIcons = (items: NavPermissionGroup[]): NavItem[] =>
  items.map((item) => ({
    ...item,
    icon: ICONS[item.name] ?? <GridIcon />,
  }));

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { user } = useAuth();
  const pathname = usePathname();

  const navItems = useMemo(
    () => withIcons(filterNavItems(NAV_ITEMS, user)),
    [user]
  );
  const othersItems = useMemo(
    () => withIcons(filterNavItems(OTHER_NAV_ITEMS, user)),
    [user]
  );
  const operationsItems = useMemo(
    () => withIcons(filterNavItems(OPERATIONS_NAV_ITEMS, user)),
    [user]
  );
  const adminIndex = navItems.findIndex((item) => item.name === "Admin");
  const menuBeforeAdmin =
    adminIndex >= 0 ? navItems.slice(0, adminIndex) : navItems;
  const menuFromAdmin = adminIndex >= 0 ? navItems.slice(adminIndex) : [];

  const renderMenuItems = (
    items: NavItem[],
    menuType: "main" | "others" | "operations",
    indexOffset = 0
  ) => {
    const renderSubNav = (subItem: NavPermissionItem): React.ReactNode => {
      if (subItem.subItems?.length) {
        return (
          <li key={subItem.name} className="pt-1">
            <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {subItem.name}
            </p>
            <ul className="space-y-1">
              {subItem.subItems.map((child) => renderSubNav(child))}
            </ul>
          </li>
        );
      }
      if (!subItem.path) return null;
      return (
        <li key={subItem.name}>
          <Link
            href={subItem.path}
            className={`menu-dropdown-item ${
              isActive(subItem.path)
                ? "menu-dropdown-item-active"
                : "menu-dropdown-item-inactive"
            }`}
          >
            {subItem.name}
          </Link>
        </li>
      );
    };

    return (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index + indexOffset, menuType)}
              className={`menu-item group  ${
                openSubmenu?.type === menuType &&
                openSubmenu?.index === index + indexOffset
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={` ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index + indexOffset
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className={`menu-item-text`}>{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200  ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index + indexOffset
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className={`menu-item-text`}>{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index + indexOffset}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType &&
                  openSubmenu?.index === index + indexOffset
                    ? `${subMenuHeight[`${menuType}-${index + indexOffset}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) =>
                  renderSubNav(subItem)
                )}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
  };

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others" | "operations";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) =>
      path === pathname ||
      (path !== "/" && pathname.startsWith(`${path}/`)),
    [pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    (["main", "others", "operations"] as const).forEach((menuType) => {
      const items =
        menuType === "main"
          ? navItems
          : menuType === "others"
            ? othersItems
            : operationsItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          const matchNested = (item: NavPermissionItem): boolean =>
            Boolean(
              (item.path && isActive(item.path)) ||
                item.subItems?.some(matchNested)
            );
          if (nav.subItems.some(matchNested)) {
            setOpenSubmenu({ type: menuType, index });
            submenuMatched = true;
          }
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive, navItems, othersItems, operationsItems]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (
    index: number,
    menuType: "main" | "others" | "operations"
  ) => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  return (
    <aside
      className={`no-print fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 lg:z-[60]
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex  ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <span className="flex flex-col">
              <span className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Santoshi Interior
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                CRM
              </span>
            </span>
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
              SI
            </span>
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            {navItems.length > 0 ? (
              <div>
                <h2
                  className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    "Menu"
                  ) : (
                    <HorizontaLDots />
                  )}
                </h2>
                {renderMenuItems(menuBeforeAdmin, "main")}
              </div>
            ) : null}

            {operationsItems.length > 0 ? (
              <div>
                <h2
                  className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    "Operations"
                  ) : (
                    <HorizontaLDots />
                  )}
                </h2>
                {renderMenuItems(operationsItems, "operations")}
              </div>
            ) : null}

            {menuFromAdmin.length > 0 ? (
              <div>{renderMenuItems(menuFromAdmin, "main", menuBeforeAdmin.length)}</div>
            ) : null}

            {othersItems.length > 0 ? (
              <div className="">
                <h2
                  className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    "Others"
                  ) : (
                    <HorizontaLDots />
                  )}
                </h2>
                {renderMenuItems(othersItems, "others")}
              </div>
            ) : null}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
