"use client";

import { useUser } from "./UserProvider";
import { signOut } from "../login/actions";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "../styles/dashboard.module.css";
import type { Community } from "@/lib/communities";

const items = [
    { href: "/inicio", label: "Início", icon: <HomeIcon /> },
    { href: "/agenda", label: "Agenda", icon: <CalendarIcon /> },
    { href: "/comunidades", label: "Comunidades", icon: <UsersIcon /> },
    { href: "/salvos", label: "Salvos", icon: <BookmarkIcon /> },
    { href: "/perfil", label: "Meu perfil", icon: <ProfileIcon /> },
    { href: "/seguranca", label: "Segurança", icon: <ShieldIcon /> },
];

export default function Sidebar({
    communities,
}: {
    communities: Community[];
}) {
    const pathname = usePathname();
    const user = useUser();
    const joinedCommunities = communities.filter((community) => community.isMember);

    return (
        <aside className={`${styles.sidebar} mobile-shell-sidebar`}>
            <div className={styles.brand}>
                <div className={styles.brandMark}>N</div>
                <div>
                    <div className={styles.brandName}>nexo</div>
                    <span className={styles.brandSub}>escolar</span>
                </div>
            </div>

            <nav className={`${styles.nav} mobile-shell-desktop-nav`}>
                <ul>
                    {items.map((item) => (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                className={`${styles.navItem} ${pathname === item.href ||
                                        pathname.startsWith(`${item.href}/`)
                                        ? styles.active
                                        : ""
                                    }`}
                            >
                                {item.icon}
                                <span style={{ flex: 1 }}>{item.label}</span>

                                {item.href === "/comunidades" && (
                                    <span className={styles.navBadge}>
                                        {communities.length}
                                    </span>
                                )}
                            </Link>
                        </li>
                    ))}

                    {user.isAdmin && (
                        <li>
                            <Link
                                href="/admin"
                                className={`${styles.navItem} ${pathname === "/admin" || pathname.startsWith("/admin/")
                                        ? styles.active
                                        : ""
                                    }`}
                            >
                                <ShieldIcon />
                                <span style={{ flex: 1 }}>Moderação</span>
                            </Link>
                        </li>
                    )}
                </ul>

                <div className={styles.sectionLabel}>Seus espaços</div>

                <ul>
                    {joinedCommunities.slice(0, 4).map((community) => (
                        <li key={community.id}>
                            <Link
                                href={`/comunidades/${community.slug}`}
                                className={styles.space}
                            >
                                <span
                                    className={styles.dot}
                                    style={{ background: community.color }}
                                />
                                {community.name}
                            </Link>
                        </li>
                    ))}

                    {joinedCommunities.length === 0 && (
                        <li className={styles.space}>Participe de uma comunidade</li>
                    )}
                </ul>
            </nav>

            <div className={`${styles.user} mobile-shell-user`} style={{ display: "block" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Link href="/perfil" className={styles.avatar} style={{ background: "#ef6f58", overflow: "hidden", textDecoration: "none" }} title="Abrir meu perfil">
                        {user.avatarUrl ? <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : user.initials}
                    </Link>
                    <Link href="/perfil" style={{ minWidth: 0, color: "inherit", textDecoration: "none" }}>
                        <div className={styles.userName}>{user.name}</div>
                        <div className={styles.userRole} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 145 }}>{user.email}</div>
                    </Link>
                </div>
                <form action={signOut} style={{ marginTop: 12 }}>
                    <button title="Sair da conta" style={{ width: "100%", border: "1px solid #ffffff20", borderRadius: 8, background: "#10254155", color: "#c7d3df", cursor: "pointer", padding: "8px 10px", textAlign: "left", fontSize: 11 }}>
                        ↪&nbsp; Sair da conta
                    </button>
                </form>
            </div>

            <nav className={`${styles.mobileNav} mobile-shell-nav-bottom`} aria-label="Navegação principal">
                {items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                        <Link
                            key={`mobile-${item.href}`}
                            href={item.href}
                            className={`${styles.mobileNavItem} mobile-shell-nav-item ${isActive ? styles.mobileNavActive : ""}`}
                            aria-current={isActive ? "page" : undefined}
                        >
                            {item.icon}
                            <span>{item.href === "/comunidades" ? "Espaços" : item.label.replace("Meu ", "")}</span>
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}

function HomeIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <path d="M9 22V12h6v10" />
        </svg>
    );
}

function CalendarIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
    );
}

function UsersIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="7" r="4" />
            <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2M16 3.1a4 4 0 0 1 0 7.8M22 21v-2a4 4 0 0 0-3-3.9" />
        </svg>
    );
}

function BookmarkIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
    );
}

function ShieldIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    );
}

function ProfileIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
    );
}
