"use client";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import {
  filterNavItems,
  isVendorPanelUser,
  NAV_ITEMS,
  OPERATIONS_NAV_ITEMS,
  OTHER_NAV_ITEMS,
  VENDOR_NAV_ITEMS,
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
  Dashboard: <GridIcon className="size-5 shrink-0" />,
  Projects: <TaskIcon className="size-5 shrink-0" />,
  "DLP Payment": <DollarLineIcon className="size-5 shrink-0" />,
  "Chat Box": <ChatIcon className="size-5 shrink-0" />,
  "Customer Issue": <CheckCircleIcon className="size-5 shrink-0" />,
  Documents: <DocsIcon className="size-5 shrink-0" />,
  "Profile Settings": <UserCircleIcon className="size-5 shrink-0" />,
  Stores: <BoxCubeIcon className="size-5 shrink-0" />,
  Sales: <DollarLineIcon className="size-5 shrink-0" />,
  Quotations: <FileIcon className="size-5 shrink-0" />,
  "Web & App": <GroupIcon className="size-5 shrink-0" />,
  Customer: <GroupIcon className="size-5 shrink-0" />,
  Design: <PencilIcon className="size-5 shrink-0" />,
  Operations: <BoxCubeIcon className="size-5 shrink-0" />,
  Procurement: <FileIcon className="size-5 shrink-0" />,
  Vendors: <GroupIcon className="size-5 shrink-0" />,
  Payments: <BoxIconLine className="size-5 shrink-0" />,
  "Vendor Payment": <DollarLineIcon className="size-5 shrink-0" />,
  "Warranty Desk": <CheckCircleIcon className="size-5 shrink-0" />,
  HR: <UserIcon className="size-5 shrink-0" />,
  Calendar: <CalenderIcon className="size-5 shrink-0" />,
  Admin: <UserCircleIcon className="size-5 shrink-0" />,
  "Vendor Panel": <GroupIcon className="size-5 shrink-0" />,
  Integrations: <PlugInIcon className="size-5 shrink-0" />,
  Communication: <ChatIcon className="size-5 shrink-0" />,
};

const withIcons = (items: NavPermissionGroup[]): NavItem[] =>
  items.map((item) => ({
    ...item,
                icon: ICONS[item.name] ?? <GridIcon className="size-5 shrink-0" />,
  }));

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, closeMobileSidebar } = useSidebar();
  const { user } = useAuth();
  const pathname = usePathname();
  const vendorPanel = isVendorPanelUser(user);

  const navItems = useMemo(
    () =>
      withIcons(vendorPanel ? VENDOR_NAV_ITEMS : filterNavItems(NAV_ITEMS, user)),
    [user, vendorPanel]
  );
  const othersItems = useMemo(
    () =>
      vendorPanel ? [] : withIcons(filterNavItems(OTHER_NAV_ITEMS, user)),
    [user, vendorPanel]
  );
  const operationsItems = useMemo(
    () =>
      vendorPanel ? [] : withIcons(filterNavItems(OPERATIONS_NAV_ITEMS, user)),
    [user, vendorPanel]
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
            onClick={closeMobileSidebar}
            className={`menu-dropdown-item ${
              isActive(subItem.path)
                ? "menu-dropdown-item-active"
                : "menu-dropdown-item-inactive"
            }`}
          >
            <span className="sidebar-dot" />
            {subItem.name}
          </Link>
        </li>
      );
    };

    return (
    <ul className="flex flex-col gap-1">
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
                className={`sidebar-icon ${
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
                    ? "rotate-180 sidebar-chevron-open"
                    : "sidebar-chevron"
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                onClick={closeMobileSidebar}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                } ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "lg:justify-start"
                }`}
              >
                <span
                  className={`sidebar-icon ${
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
              <ul className="sidebar-submenu mt-1 ml-4 space-y-0.5 border-l border-[#eadfcf] pl-4 dark:border-gray-800">
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
    closeMobileSidebar();
  }, [pathname, closeMobileSidebar]);

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
      className={`no-print fixed inset-y-0 left-0 top-16 flex h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out z-50 border-r border-gray-200 dark:bg-gray-900 dark:border-gray-800 lg:top-0 lg:h-screen lg:z-[60]
        ${vendorPanel ? "vendor-sidebar" : "crm-sidebar"}
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
        className={`sidebar-brand flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/" onClick={closeMobileSidebar} className="min-w-0">
          {isExpanded || isHovered || isMobileOpen ? (
            <span className="flex items-center gap-3">
              <span className="sidebar-logo-frame">
                <img
                  src="/images/logo/santoshi-interiors.jpg"
                  alt="Santoshi Interiors"
                  className="h-full w-full object-contain"
                />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="sidebar-brand-title">
                  {vendorPanel ? "Vendor Panel" : "Santoshi Interiors"}
                </span>
                <span className="sidebar-brand-kicker">
                  {vendorPanel ? "Santoshi Interiors" : "CRM"}
                </span>
              </span>
            </span>
          ) : (
            <span className="sidebar-logo-frame sidebar-logo-frame-sm">
              <img
                src="/images/logo/santoshi-interiors.jpg"
                alt="Santoshi Interiors"
                className="h-full w-full object-contain"
              />
            </span>
          )}
        </Link>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-4">
          <div className="flex flex-col gap-6">
            {navItems.length > 0 ? (
              <div>
                <h2
                  className={`sidebar-kicker mb-3 flex items-center ${
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
                  className={`sidebar-kicker mb-3 flex items-center ${
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
                  className={`sidebar-kicker mb-3 flex items-center ${
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
      {(isExpanded || isHovered || isMobileOpen) && user ? (
        <div className="sidebar-foot">
          <span className="sidebar-foot-avatar">
            {String(user.name || "S")
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0])
              .join("")
              .toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="sidebar-foot-name">{user.name}</span>
            <span className="sidebar-foot-role">
              {vendorPanel
                ? "Vendor workspace"
                : user.accessRole?.label || user.roleLabel || "CRM workspace"}
            </span>
          </span>
        </div>
      ) : null}
    </aside>
  );
};

export default AppSidebar;
