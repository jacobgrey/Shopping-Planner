/**
 * Build a raw iCal (VCALENDAR/VEVENT) payload for embedding in a QR code.
 * When scanned, iOS and Android open the native calendar app's "Add Event" flow.
 */
export function buildCalendarEvent(params: {
  title: string;
  date: string; // ISO date "2026-04-20"
  startHour: number; // decimal hours, e.g. 16.5 = 4:30 PM
  endHour: number; // decimal hours for event end
  description?: string; // event description / notes
}): string {
  const { title, date, startHour, endHour, description } = params;
  const dateClean = date.replace(/-/g, "");

  function hourToHHMM(h: number): string {
    const clamped = Math.max(0, Math.min(23.99, h));
    const hh = Math.floor(clamped);
    const mm = Math.round((clamped - hh) * 60);
    return `${String(hh).padStart(2, "0")}${String(mm).padStart(2, "0")}00`;
  }

  const dtStart = `${dateClean}T${hourToHHMM(startHour)}`;
  const dtEnd = `${dateClean}T${hourToHHMM(endHour)}`;

  // Escape special chars per RFC 5545: backslash, semicolon, comma, newlines
  function escapeIcal(text: string): string {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcal(title)}`,
  ];

  if (description) {
    lines.push(`DESCRIPTION:${escapeIcal(description)}`);
  }

  // Reminder alert 5 minutes before event start
  lines.push(
    "BEGIN:VALARM",
    "TRIGGER:-PT5M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcal(title)}`,
    "END:VALARM",
  );

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
}
