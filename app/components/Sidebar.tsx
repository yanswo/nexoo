
"use client";

import { useUser } from "@/app/components/UserProvider";
import { signOut } from "@/app/login/actions";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/app/styles/dashboard.module.css";
import type { Community } from "@/lib/communities";

const items = [
    { href: "/inicio", label: "Início", icon: <HomeIcon /> },
    { href: "/agenda", label: "Agenda", icon: <CalendarIcon /> },
    { href: "/comunidades", label: "Comunidades", icon: <UsersIcon /> },
    { href: "/salvos", label: "Salvos", icon: <BookmarkIcon /> },
    { href: "/perfil", label: "Meu perfil", icon: <ProfileIcon /> },
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
    const joinedCommunities = communities.filter(
        (community) => community.isMember,
    );

    return (
        <aside className={`${styles.sidebar} mobile-shell-sidebar`}>
            <div className={styles.brand}>
                <div className={styles.brandMark}>N</div>

                <div>
                    <div className={styles.brandName}>nexo</div>
                    <span className={styles.brandSub}>escolar</span>
                </div>
            </div>

            <nav className={styles.nav}>
                <div className={styles.sectionLabel}>Menu</div>

                <ul>
                    {items.map((item) => (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                className={`${styles.navItem} ${pathname === item.href ||
                                        (item.href !== "/inicio" &&
                                            pathname.startsWith(`${item.href}/`))
                                        ? styles.active
                                        : ""
                                    }`}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </Link>
                        </li>
                    ))}

                    {user.isAdmin && (
                        <li>
                            <Link
                                href="/admin"
                                className={`${styles.navItem} ${pathname.startsWith("/admin")
                                        ? styles.active
                                        : ""
                                    }`}
                            >
                                <ShieldIcon />
                                <span>Moderação</span>
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
                                    className={styles.spaceDot}
                                    style={{
                                        background:
                                            community.color ?? "#ef6f58",
                                    }}
                                />
                                <span>{community.name}</span>
                            </Link>
                        </li>
                    ))}

                    {joinedCommunities.length === 0 && (
                        <li className={styles.space}>
                            Participe de uma comunidade
                        </li>
                    )}
                </ul>
            </nav>

            <div
                className={`${styles.user} mobile-shell-user`}
                style={{ display: "block" }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                    }}
                >
                    <Link
                        href="/perfil"
                        className={styles.avatar}
                        style={{
                            background: "#ef6f58",
                            overflow: "hidden",
                            textDecoration: "none",
                        }}
                        title="Abrir meu perfil"
                    >
                        {user.avatarUrl ? (
                            <img
                                src={user.avatarUrl}
                                alt=""
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                }}
                            />
                        ) : (
                            user.initials
                        )}
                    </Link>

                    <Link
                        href="/perfil"
                        style={{
                            minWidth: 0,
                            color: "inherit",
                            textDecoration: "none",
                        }}
                    >
                        <div className={styles.userName}>{user.name}</div>
                        <div
                            className={styles.userRole}
                            style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: 145,
                            }}
                        >
                            {user.email}
                        </div>
                    </Link>
                </div>

                <form action={signOut} style={{ marginTop: 12 }}>
                    <button
                        title="Sair da conta"
                        style={{
                            width: "100%",
                            border: "1px solid #ffffff20",
                            borderRadius: 8,
                            background: "#10254155",
                            color: "#c7d3df",
                            cursor: "pointer",
                            padding: "8px 10px",
                            textAlign: "left",
                            fontSize: 11,
                        }}
                    >
                        ↪&nbsp; Sair da conta
                    </button>
                </form>
            </div>
        </aside>
    );
}

function HomeIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m3 10 9-7 9 7" />
            <path d="M5 9v12h14V9M9 21v-7h6v7" />
        </svg>
    );
}

function CalendarIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 11h18" />
        </svg>
    );
}

function UsersIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="8" r="4" />
            <path d="M2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 8M18 14a6 6 0 0 1 4 6" />
        </svg>
    );
}

function BookmarkIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 3h12v18l-6-4-6 4z" />
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

function ShieldIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" />
        </svg>
    );
}

function TrophyIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
            <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
        </svg>
    );
}
