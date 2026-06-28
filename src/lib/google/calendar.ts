import { google } from 'googleapis';
import { getOAuth2Client } from './oauth';

interface FreeBusySlot {
  date: string;
  startTime: string;
  endTime: string;
}

interface CalendarEvent {
  id?: string;
  hangoutLink?: string;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getWorkingHours() {
  const startHour = 9;
  const endHour = 17;
  const slots: FreeBusySlot[] = [];
  const now = new Date();

  for (let d = 0; d < 30; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    date.setHours(0, 0, 0, 0);

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const dateStr = formatDate(date);
    for (let h = startHour; h < endHour; h++) {
      slots.push({
        date: dateStr,
        startTime: `${String(h).padStart(2, '0')}:00`,
        endTime: `${String(h + 1).padStart(2, '0')}:00`,
      });
    }
  }

  return slots;
}

export async function getFreeBusySlots(
  accessToken: string,
  refreshToken: string,
  calendarEmail: string,
  durationMinutes: number = 60,
  lookAheadDays: number = 30,
): Promise<FreeBusySlot[]> {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + lookAheadDays);

  const { data } = await calendar.freebusy.query({
    requestBody: {
      timeMin: now.toISOString(),
      timeMax: endDate.toISOString(),
      items: [{ id: calendarEmail }],
    },
  });

  const busyPeriods = data.calendars?.[calendarEmail]?.busy ?? [];

  const allSlots = getWorkingHours();
  const availableSlots: FreeBusySlot[] = [];

  for (const slot of allSlots) {
    const slotStart = new Date(`${slot.date}T${slot.startTime}:00`).getTime();
    const slotEnd = new Date(`${slot.date}T${slot.endTime}:00`).getTime();

    if (slotStart < now.getTime()) continue;

    const isBusy = busyPeriods.some((busy) => {
      const busyStart = new Date(busy.start!).getTime();
      const busyEnd = new Date(busy.end!).getTime();
      return slotStart < busyEnd && slotEnd > busyStart;
    });

    if (!isBusy) {
      availableSlots.push(slot);
    }
  }

  return availableSlots;
}

export async function createCalendarEvent(
  accessToken: string,
  refreshToken: string,
  calendarEmail: string,
  params: {
    summary: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    attendeeEmails?: string[];
  },
): Promise<CalendarEvent> {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const { data } = await calendar.events.insert({
    calendarId: calendarEmail,
    conferenceDataVersion: 1,
    requestBody: {
      summary: params.summary,
      description: params.description,
      start: {
        dateTime: params.startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: params.endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: params.attendeeEmails?.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    },
  });

  return {
    id: data.id ?? undefined,
    hangoutLink: data.hangoutLink ?? undefined,
  };
}
