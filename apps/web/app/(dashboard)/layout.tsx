import AuthGuard from '@/components/shared/AuthGuard'
import RouteGuard from '@/components/shared/RouteGuard'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto px-6 pb-6 thin-scrollbar">
            <RouteGuard>{children}</RouteGuard>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}

