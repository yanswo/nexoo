"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "../styles/dashboard.module.css";

const items = [
  { href: "/inicio", label: "Inicio", icon: <HomeIcon /> },
  { href: "/agenda", label: "Agenda", icon: <CalendarIcon /> },
  { href: "/quiz", label: "Quiz", icon: <TrophyIcon /> },
  { href: "/comunidades", label: "Comunidades", icon: <UsersIcon /> },
  { href: "/seguranca", label: "Seguranca", icon: <ShieldIcon /> },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.bottomNav} aria-label="Navegacao principal">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.bottomNavItem} ${active ? styles.bottomNavActive : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function HomeIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2-2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>; }
function CalendarIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>; }
function UsersIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2M16 3.1a4 4 0 0 1 0 7.8M22 21v-2a4 4 0 0 0-3-3.9"/></svg>; }
function ShieldIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
function TrophyIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>; }
