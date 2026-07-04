'use client'

import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { AppPermission, hasAnyPermission } from '@/lib/roles'

/**
 * Maps dashboard route prefixes to the permissions required to view them.
 * Routes not listed are open to any authenticated user (global auth still applies).
 */
const ROUTE_PERMISSIONS: { prefix: string; permissions: AppPermission[] }[] = [
  { prefix: '/overview', permissions: ['reports:view'] },
  { prefix: '/reservations', permissions: ['bookings:view'] },
  { prefix: '/calendar', permissions: ['bookings:view'] },
  { prefix: '/checkouts', permissions: ['bookings:checkout'] },
  { prefix: '/book', permissions: ['bookings:manage'] },
  { prefix: '/guests', permissions: ['guests:view'] },
  { prefix: '/rooms', permissions: ['rooms:view'] },
  { prefix: '/housekeeping', permissions: ['housekeeping:view'] },
  { prefix: '/payments', permissions: ['payments:view'] },
  { prefix: '/invoices', permissions: ['invoices:view'] },
  { prefix: '/companies', permissions: ['companies:view'] },
  { prefix: '/store/pos', permissions: ['pos:view'] },
  { prefix: '/store', permissions: ['store:view'] },
  { prefix: '/guest-portal/orders', permissions: ['guest_portal:orders'] },
  { prefix: '/guest-portal/requests', permissions: ['guest_portal:requests'] },
  { prefix: '/guest-portal', permissions: ['guest_portal:orders', 'guest_portal:requests'] },
  { prefix: '/staff/payroll', permissions: ['payroll:view'] },
  { prefix: '/staff/roles', permissions: ['settings:manage'] },
  { prefix: '/staff', permissions: ['staff:view'] },
  { prefix: '/accounting', permissions: ['reports:view'] },
  { prefix: '/developer', permissions: ['developer:manage'] },
  { prefix: '/settings', permissions: ['settings:view', 'settings:manage'] },
]

function getRequiredPermissions(pathname: string): AppPermission[] | null {
  // More specific prefixes first; ROUTE_PERMISSIONS is already ordered from most to least specific.
  for (const route of ROUTE_PERMISSIONS) {
    if (pathname === route.prefix || pathname.startsWith(route.prefix + '/')) {
      return route.permissions
    }
  }
  return null
}

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuthStore()

  const required = getRequiredPermissions(pathname)
  if (required && !hasAnyPermission(user?.role, required)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900">Huna ruhusa</p>
          <p className="text-sm text-gray-500 mt-1">Wasiliana na admin</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
