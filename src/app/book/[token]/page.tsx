import { notFound } from 'next/navigation';
import { createAdmin } from '@/lib/supabase/admin';
import { BookingClient } from '@/components/booking/booking-client';
import { getInterviewerTokens } from '@/lib/google/tokens';
import { getFreeBusySlots } from '@/lib/google/calendar';

export const dynamic = 'force-dynamic';

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ confirmed?: string }>;
}) {
  const { token } = await params;
  const { confirmed } = await searchParams;
  const admin = createAdmin();

  const { data: booking } = await admin
    .from('bookings')
    .select('*, interview:interviews(*, candidate:candidates(*), interviewer:profiles!interviewer_id(*))')
    .eq('token', token)
    .single();

  if (!booking || booking.status === 'booked') {
    if (booking?.status === 'booked') {
      return (
        <div className="flex flex-1 items-center justify-center bg-muted/30">
          <BookingClient
            interview={booking.interview}
            booking={booking}
            availabilityByDate={{}}
            isConfirmed={true}
          />
        </div>
      );
    }
    notFound();
  }

  const isExpired = new Date(booking.expires_at) < new Date();
  if (isExpired) {
    await admin.from('bookings').update({ status: 'expired' }).eq('id', booking.id);

    return (
      <div className="flex flex-1 items-center justify-center bg-muted/30">
        <div className="w-full max-w-md text-center space-y-4 p-8">
          <h1 className="text-2xl font-bold">Link Expired</h1>
          <p className="text-muted-foreground">
            This booking link has expired. Please contact your recruiter for a new link.
          </p>
        </div>
      </div>
    );
  }

  const interview = booking.interview;

  let availabilityByDate: Record<string, { time: string; label: string }[]> = {};

  const googleTokens = await getInterviewerTokens(interview.interviewer_id);

  if (googleTokens) {
    const freeBusySlots = await getFreeBusySlots(
      googleTokens.accessToken,
      googleTokens.refreshToken,
      googleTokens.calendarEmail,
      interview.duration_minutes || 60,
    );

    for (const slot of freeBusySlots) {
      if (!availabilityByDate[slot.date]) {
        availabilityByDate[slot.date] = [];
      }
      const h = parseInt(slot.startTime.split(':')[0]);
      const m = slot.startTime.split(':')[1];
      const label = `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
      availabilityByDate[slot.date].push({ time: slot.startTime, label });
    }
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);

    const { data: availabilitySlots } = await admin
      .from('interviewer_availability')
      .select('*')
      .eq('interviewer_id', interview.interviewer_id)
      .gte('date', today.toISOString().split('T')[0])
      .lte('date', maxDate.toISOString().split('T')[0])
      .eq('status', 'available')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    for (const slot of availabilitySlots ?? []) {
      if (!availabilityByDate[slot.date]) {
        availabilityByDate[slot.date] = [];
      }
      const h = parseInt(slot.start_time.split(':')[0]);
      const m = slot.start_time.split(':')[1];
      const label = `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
      availabilityByDate[slot.date].push({ time: slot.start_time, label });
    }
  }

  if (confirmed === 'true') {
    return (
      <div className="flex flex-1 items-center justify-center bg-muted/30">
        <BookingClient
          interview={interview}
          booking={booking}
          availabilityByDate={{}}
          isConfirmed={true}
        />
      </div>
    );
  }

  return (
    <BookingClient
      interview={interview}
      booking={booking}
      availabilityByDate={availabilityByDate}
      isConfirmed={false}
    />
  );
}
