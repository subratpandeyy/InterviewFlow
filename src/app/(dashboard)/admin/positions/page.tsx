import { createServer } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createPosition } from '@/lib/actions/recruiter';
import { PositionsClient } from '@/components/admin/positions-client';

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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>All Positions ({positions?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <PositionsClient positions={positions ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Position</CardTitle>
            <CardDescription>Add a new job opening</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createPosition} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required placeholder="e.g. Senior Frontend Developer" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input id="department" name="department" required placeholder="e.g. Engineering" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience_required">Experience Required</Label>
                <Input id="experience_required" name="experience_required" placeholder="e.g. 3-5 years" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={3} placeholder="Job description..." />
              </div>
              <Button type="submit" className="w-full">Create Position</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
