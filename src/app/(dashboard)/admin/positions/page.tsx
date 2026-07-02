import { createServer } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PositionsClient } from '@/components/admin/positions-client';
import { CreatePositionDialog } from '@/components/admin/create-position-dialog';

export const dynamic = 'force-dynamic';

export default async function AdminPositionsPage() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) return null;

  const { data: positions } = await supabase
    .from('positions')
    .select('*')
    .eq('organization_id', membership.organization_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Positions</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage job openings and create new positions</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>All Positions ({positions?.length ?? 0})</CardTitle>
          <CreatePositionDialog />
        </CardHeader>
        <CardContent>
          <PositionsClient positions={positions ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
