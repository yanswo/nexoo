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
    { href: "/seguranca", label: "Segurança", icon: <ShieldIcon /> },
    { href: "/quiz", label: "Desafio", icon: <TrophyIcon /> },
];

export default function Sidebar({
    communities,
}: {
    communities: Community[];
}) {
    const pathname = usePathname();
    const user = useUser();

    return (
        <aside className={styles.sidebar}>
            <div className={styles.brand}>
                <div className={styles.brandMark}>N</div>

                <div>
                    <div className={styles.brandName}>nexo</div>
                    <span className={styles.brandSub}>escolar</span>
                </div>
            </div>

            <nav className={styles.nav}>
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

                                <span style={{ flex: 1 }}>
                                    {item.label}
                                </span>

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
                                className={`${styles.navItem} ${pathname === "/admin" ||
                                        pathname.startsWith("/admin/")
                                        ? styles.active
                                        : ""
                                    }`}
                            >
                                <ShieldIcon />

                                <span style={{ flex: 1 }}>
                                    Moderação
                                </span>
                            </Link>
                        </li>
                    )}
                </ul>

                <div className={styles.sectionLabel}>
                    Seus espaços
                </div>

                <ul>
                    {communities.slice(0, 4).map((community) => (
                        <li key={community.id}>
                            <Link
                                href={`/comunidades/${community.slug}`}
                                className={styles.space}
                            >
                                <span
                                    className={styles.dot}
                                    style={{
                                        background: community.color,
                                    }}
                                />

                                {community.name}
                            </Link>
                        </li>
                    ))}

                    {communities.length === 0 && (
                        <li className={styles.space}>
                            Nenhum espaço ainda
                        </li>
                    )}
                </ul>
            </nav>

            <div className={styles.user}>
                <div
                    className={styles.avatar}
                    style={{ background: "#ef6f58" }}
                >
                    {user.initials}
                </div>

                <div>
                    <div className={styles.userName}>
                        {user.name}
                    </div>

                    <div className={styles.userRole}>
                        {user.email}
                    </div>
                </div>

                <form action={signOut}>
                    <button
                        className={styles.more}
                        title="Sair da conta"
                        style={{
                            background: "none",
                            border: 0,
                            cursor: "pointer",
                            color: "inherit",
                        }}
                    >
                        Sair
                    </button>
                </form>
            </div>
        </aside>
    );
}

function HomeIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <path d="M9 22V12h6v10" />
        </svg>
    );
}

function CalendarIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
    );
}

function UsersIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <circle cx="9" cy="7" r="4" />
            <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2M16 3.1a4 4 0 0 1 0 7.8M22 21v-2a4 4 0 0 0-3-3.9" />
        </svg>
    );
}

function BookmarkIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
    );
}

function ShieldIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    );
}

function TrophyIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
            <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
        </svg>
    );
}