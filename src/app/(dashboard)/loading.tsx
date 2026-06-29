export default function DashboardLoading() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 overflow-hidden">
      <div className="h-full w-full origin-left animate-[loader_1.2s_ease-in-out_infinite] rounded-full bg-accent" />
    </div>
  );
}
