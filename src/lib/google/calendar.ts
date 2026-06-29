import { google } from 'googleapis';
import { getOAuth2Client } from './oauth';

export interface FreeBusySlot {
  date: string;
  startTime: string;
  endTime: string;
}

export interface CalendarEvent {
  id?: string;
  hangoutLink?: string;
  calendarId?: string;
  summary?: string;
  start?: string;
  end?: string;
}

function getOAuthClient(accessToken: string, refreshToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return oauth2Client;
}

function getCalendarApi(accessToken: string, refreshToken: string) {
  return google.calendar({ version: 'v3', auth: getOAuthClient(accessToken, refreshToken) });
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getWorkingHours(startDate?: Date) {
  const startHour = 9;
  const endHour = 17;
  const slots: FreeBusySlot[] = [];
  const now = startDate || new Date();

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

function getSlotStart(slot: FreeBusySlot): number {
  return new Date(`${slot.date}T${slot.startTime}:00`).getTime();
}

function getSlotEnd(slot: FreeBusySlot): number {
  return new Date(`${slot.date}T${slot.endTime}:00`).getTime();
}

export async function getFreeBusySlots(
  accessToken: string,
  refreshToken: string,
  calendarEmail: string,
  durationMinutes: number = 60,
  lookAheadDays: number = 30,
): Promise<FreeBusySlot[]> {
  const calendar = getCalendarApi(accessToken, refreshToken);

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
    const slotStart = getSlotStart(slot);
    const slotEnd = getSlotEnd(slot);

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
  const calendar = getCalendarApi(accessToken, refreshToken);

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
    calendarId: calendarEmail,
    summary: params.summary,
  };
}

export async function updateCalendarEvent(
  accessToken: string,
  refreshToken: string,
  calendarId: string,
  eventId: string,
  params: {
    summary?: string;
    description?: string;
    startTime?: Date;
    endTime?: Date;
    attendeeEmails?: string[];
  },
): Promise<CalendarEvent> {
  const calendar = getCalendarApi(accessToken, refreshToken);

  const requestBody: Record<string, unknown> = {};

  if (params.summary) requestBody.summary = params.summary;
  if (params.description) requestBody.description = params.description;
  if (params.attendeeEmails) {
    requestBody.attendees = params.attendeeEmails.map((email) => ({ email }));
  }
  if (params.startTime) {
    requestBody.start = {
      dateTime: params.startTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }
  if (params.endTime) {
    requestBody.end = {
      dateTime: params.endTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  const { data } = await calendar.events.patch({
    calendarId,
    eventId,
    requestBody,
  });

  return {
    id: data.id ?? undefined,
    hangoutLink: data.hangoutLink ?? undefined,
  };
}

export async function deleteCalendarEvent(
  accessToken: string,
  refreshToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const calendar = getCalendarApi(accessToken, refreshToken);

  await calendar.events.delete({
    calendarId,
    eventId,
  });
}

export async function listUpcomingEvents(
  accessToken: string,
  refreshToken: string,
  calendarEmail: string,
  maxResults: number = 20,
): Promise<CalendarEvent[]> {
  const calendar = getCalendarApi(accessToken, refreshToken);

  const { data } = await calendar.events.list({
    calendarId: calendarEmail,
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (data.items ?? []).map((item) => ({
    id: item.id ?? undefined,
    hangoutLink: item.hangoutLink ?? undefined,
    summary: item.summary ?? undefined,
    start: item.start?.dateTime ?? item.start?.date ?? undefined,
    end: item.end?.dateTime ?? item.end?.date ?? undefined,
  }));
}

export async function checkCalendarHealth(
  accessToken: string,
  refreshToken: string,
  calendarEmail: string,
): Promise<{ healthy: boolean; message: string }> {
  try {
    const calendar = getCalendarApi(accessToken, refreshToken);
    await calendar.calendarList.get({ calendarId: calendarEmail });
    return { healthy: true, message: 'Calendar is accessible' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('404') || message.includes('not found')) {
      return { healthy: false, message: 'Calendar not found. Try reconnecting.' };
    }
    if (message.includes('403') || message.includes('Forbidden') || message.includes('expired')) {
      return { healthy: false, message: 'Access revoked or token expired. Reconnect your calendar.' };
    }
    if (message.includes('429') || message.includes('rate')) {
      return { healthy: true, message: 'Rate limited. Will retry automatically.' };
    }
    return { healthy: false, message: `Calendar error: ${message}` };
  }
}
