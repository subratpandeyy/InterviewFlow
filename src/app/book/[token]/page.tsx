import { notFound } from 'next/navigation';
import { createAdmin } from '@/lib/supabase/admin';
import { BookingClient } from '@/components/booking/booking-client';
import { getInterviewerTokens, getFreeBusySlots } from '@/lib/services/calendar.service';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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
        <div className="min-h-screen bg-background">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
            <BookingClient
              interview={booking.interview}
              booking={booking}
              availabilityByDate={{}}
              isConfirmed={true}
            />
          </div>
        </div>
      );
    }
    notFound();
  }

  const isExpired = new Date(booking.expires_at) < new Date();
  if (isExpired) {
    await admin.from('bookings').update({ status: 'expired' }).eq('id', booking.id);

    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-md px-4 py-8 sm:px-6 lg:px-8">
          <Card className="text-center">
            <CardHeader>
              <CardTitle>Link Expired</CardTitle>
              <CardDescription>
                This booking link has expired. Please contact your recruiter for a new link.
              </CardDescription>
            </CardHeader>
          </Card>
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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
        {confirmed === 'true' ? (
          <BookingClient interview={interview} booking={booking} availabilityByDate={{}} isConfirmed={true} />
        ) : (
          <BookingClient interview={interview} booking={booking} availabilityByDate={availabilityByDate} isConfirmed={false} />
        )}
      </div>
    </div>
  );
}
