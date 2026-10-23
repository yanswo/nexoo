"use client";

import { useState } from "react";
import type { AgendaEvent } from "../../../lib/agenda";
import styles from "@/styles/agenda.module.css";

const WEEKDAYS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

const CATEGORY_LABELS: Record<AgendaEvent["category"], string> = {
  assessment: "Avaliação",
  club: "Clube",
  project: "Projeto",
  meeting: "Reunião",
  other: "Outro",
};

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(date);
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  result.setHours(12, 0, 0, 0);
  return result;
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Fortaleza",
  }).format(new Date(value));
}

function todayKey() {
  return dateKey(new Date());
}

export default function AgendaView({ events }: { events: AgendaEvent[] }) {
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const selectedDate = dateFromKey(selectedKey);
  const weekStart = startOfWeek(selectedDate);

  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return { date, key: dateKey(date) };
  });

  const dayEvents = events
    .filter((event) => dateKey(new Date(event.startsAt)) === selectedKey)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  function moveWeek(amount: number) {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + amount * 7);
    setSelectedKey(dateKey(next));
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Organização escolar</div>
          <h1 className={styles.title}>Agenda</h1>
          <p className={styles.subtitle}>
            Acompanhe aulas, projetos e compromissos da sua escola.
          </p>
        </div>
      </header>

      <section className={styles.calendarCard}>
        <div className={styles.calendarTop}>
          <div>
            <h2>{formatMonth(selectedDate)}</h2>
            <span>
              Semana de{" "}
              {week[0].date.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
              })}
            </span>
          </div>
          <div className={styles.calendarActions}>
            <button type="button" onClick={() => moveWeek(-1)} aria-label="Semana anterior">
              ‹
            </button>
            <button type="button" onClick={() => setSelectedKey(todayKey())}>
              Hoje
            </button>
            <button type="button" onClick={() => moveWeek(1)} aria-label="Próxima semana">
              ›
            </button>
          </div>
        </div>

        <div className={styles.weekGrid}>
          {week.map(({ date, key }, index) => (
            <button
              type="button"
              key={key}
              className={`${styles.day} ${key === selectedKey ? styles.dayActive : ""}`}
              onClick={() => setSelectedKey(key)}
            >
              <span>{WEEKDAYS[index]}</span>
              <strong>{date.getDate()}</strong>
              {events.some((event) => dateKey(new Date(event.startsAt)) === key) && <i />}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.eventsSection}>
        <div className={styles.sectionHeading}>
          <div>
            <span>Compromissos</span>
            <small>
              {dayEvents.length} {dayEvents.length === 1 ? "evento" : "eventos"} no dia selecionado
            </small>
          </div>
          <strong>
            {selectedDate.toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </strong>
        </div>

        {dayEvents.length ? (
          <div className={styles.eventList}>
            {dayEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <span>○</span>
            <strong>Nenhum evento neste dia</strong>
            <p>Confira os outros dias para acompanhar a programação da escola.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function EventCard({ event }: { event: AgendaEvent }) {
  return (
    <article className={styles.eventCard}>--
      <div className={`${styles.categoryBar} ${styles[event.category]}`} />
      <div className={styles.eventTime}>
        <strong>{formatTime(event.startsAt)}</strong>
        {event.endsAt && <span>até {formatTime(event.endsAt)}</span>}
      </div>
      <div className={styles.eventContent}>
        <span className={styles.eventCategory}>{CATEGORY_LABELS[event.category]}</span>
        <h3>{event.title}</h3>
        {event.description && <p>{event.description}</p>}
        <span className={styles.location}>⌖ {event.location}</span>
      </div>
    </article>
  );
}