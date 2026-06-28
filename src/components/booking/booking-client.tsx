'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { bookInterviewSlot } from '@/lib/actions/booking';
import { toast } from 'sonner';
import { Calendar, Clock, CheckCircle } from 'lucide-react';

interface Slot {
  time: string;
  label: string;
}

interface BookingClientProps {
  interview: {
    id: string;
    notes?: string;
    interview_type: string;
    duration_minutes: number;
    interviewer?: { full_name: string; email: string };
  };
  booking: {
    token: string;
    expires_at: string;
    status: string;
  };
  availabilityByDate: Record<string, Slot[]>;
  isConfirmed: boolean;
}

const interviewTypeLabels: Record<string, string> = {
  hr: 'HR Round',
  technical: 'Technical Round',
  managerial: 'Managerial Round',
  final: 'Final Round',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function BookingClient({ interview, booking, availabilityByDate, isConfirmed }: BookingClientProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const dates = Object.keys(availabilityByDate).sort();

  const handleConfirm = async () => {
    if (!selectedDate || !selectedSlot) return;
    setLoading(true);

    try {
      await bookInterviewSlot(interview.id, selectedDate, selectedSlot, booking.token);
      toast.success('Interview booked successfully!');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to book');
    } finally {
      setLoading(false);
    }
  };

  if (isConfirmed) {
    return (
      <div className="flex flex-1 items-center justify-center bg-muted/30">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <CardTitle>Interview Confirmed!</CardTitle>
            <CardDescription>
              Your interview has been booked successfully. Check your email for the confirmation details and meeting link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Schedule Your Interview</CardTitle>
            </div>
            <CardDescription>
              Select a date and time slot that works for you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Position</span>
              <span className="font-medium">{interview.notes || 'Interview'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Type</span>
              <Badge variant="secondary">
                {interviewTypeLabels[interview.interview_type] || interview.interview_type}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium">{interview.duration_minutes} minutes</span>
            </div>
            {interview.interviewer && (
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Interviewer</span>
                <span className="font-medium">{interview.interviewer.full_name}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {dates.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Available Slots</CardTitle>
              <CardDescription>
                The interviewer has no available slots in the next 30 days. Please contact your recruiter.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Select a Date</CardTitle>
                </div>
                <CardDescription>
                  Choose a day that works for you.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {dates.map((date) => {
                    const count = availabilityByDate[date].length;
                    return (
                      <button
                        key={date}
                        onClick={() => { setSelectedDate(date); setSelectedSlot(null); }}
                        className={`p-3 rounded-lg border text-center transition-all ${
                          selectedDate === date
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }`}
                      >
                        <div className="text-xs text-muted-foreground">{getDateLabel(date)}</div>
                        <div className="text-lg font-bold mt-1">
                          {date.split('-')[2]}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {count} slot{count !== 1 ? 's' : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {selectedDate && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Available Times - {getDateLabel(selectedDate)}</CardTitle>
                  </div>
                  <CardDescription>
                    Choose a time for your interview.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 md:grid-cols-2">
                    {availabilityByDate[selectedDate].map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => setSelectedSlot(slot.time)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          selectedSlot === slot.time
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }`}
                      >
                        <span className="font-medium">{slot.label}</span>
                      </button>
                    ))}
                  </div>

                  {availabilityByDate[selectedDate].length > 0 && (
                    <div className="mt-6">
                      <Button
                        onClick={handleConfirm}
                        disabled={!selectedSlot || loading}
                        className="w-full"
                      >
                        {loading ? 'Confirming...' : 'Confirm Booking'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
