import { LocalEvent, LocalTask } from "../storage/types";

/**
 * Generates an RFC 5545 compliant iCalendar (.ics) string from an event and its timeline tasks.
 */
export function generateIcsCalendar(event: LocalEvent, tasks: LocalTask[] = []): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const formatIcsDate = (date: Date) => {
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
      date.getUTCHours()
    )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
  };

  const nowStr = formatIcsDate(new Date());
  const eventDate = event.eventDate ? new Date(event.eventDate) : new Date();
  const eventDateEnd = new Date(eventDate.getTime() + 5 * 3600 * 1000); // 5 hours default

  const icsLines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EventCraft AI//Event Planning Suite//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@eventcraft.local`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${formatIcsDate(eventDate)}`,
    `DTEND:${formatIcsDate(eventDateEnd)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${(event.preferences?.themePreferences || `EventCraft ${event.type}`).replace(/\n/g, "\\n")}`,
    `LOCATION:${(event.location || "Venue TBD").replace(/,/g, "\\,")}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
  ];

  // Add individual scheduled runsheet tasks as child events
  tasks.forEach((task, idx) => {
    const taskStart = new Date(eventDate.getTime() + idx * 30 * 60 * 1000);
    const taskEnd = new Date(taskStart.getTime() + 30 * 60 * 1000);

    icsLines.push(
      "BEGIN:VEVENT",
      `UID:${task.id}@eventcraft.local`,
      `DTSTAMP:${nowStr}`,
      `DTSTART:${formatIcsDate(taskStart)}`,
      `DTEND:${formatIcsDate(taskEnd)}`,
      `SUMMARY:[${event.title}] ${task.title}`,
      `DESCRIPTION:${(task.description || `Assigned to: ${task.assignedTo || "Lead"}`).replace(/\n/g, "\\n")}`,
      `STATUS:${task.status === "COMPLETED" ? "COMPLETED" : "CONFIRMED"}`,
      "END:VEVENT"
    );
  });

  icsLines.push("END:VCALENDAR");
  return icsLines.join("\r\n");
}

/**
 * Triggers a browser download of the .ics calendar file.
 */
export function downloadIcsFile(event: LocalEvent, tasks: LocalTask[] = []): void {
  const icsData = generateIcsCalendar(event, tasks);
  const blob = new Blob([icsData], { type: "text/calendar;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
