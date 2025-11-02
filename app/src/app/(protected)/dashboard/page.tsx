import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard | Aurora Nova",
  description: "Panel de control de Aurora Nova",
}

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>
      <div className="flex min-h-[400px] flex-1 items-center justify-center rounded-lg border border-dashed">
        <div className="flex flex-col items-center gap-1 text-center">
          <h3 className="text-2xl font-bold tracking-tight">
            Dashboard en construcción
          </h3>
          <p className="text-sm text-muted-foreground">
            Esta página se desarrollará al final del proyecto
          </p>
        </div>
      </div>
    </div>
  )
}
