export default function DashboardLoading() {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded-xl" />
        <div className="h-28 bg-slate-100 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-40 bg-slate-100 rounded-2xl" />
          <div className="h-40 bg-slate-100 rounded-2xl" />
        </div>
        <div className="h-32 bg-slate-100 rounded-2xl" />
      </div>
    </div>
  )
}
