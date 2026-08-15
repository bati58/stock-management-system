import { Menu, LogOut, ChevronDown, Bell } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import { initials, formatTimeAgo } from '../../utils/formatters'

export default function Topbar({ onMenuClick, title }) {
  const { user, logout } = useAuth()
  const { unreadCount, notifications, markAllAsRead, clearAllNotifications } = useNotifications()
  const [open, setOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-ink-100 bg-white/95 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-700 transition-colors lg:hidden"
        >
          <Menu size={20} />
        </button>
        {title && <h2 className="hidden text-sm font-semibold text-ink-600 sm:block">{title}</h2>}
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-700 transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-ink-100 bg-white shadow-lg overflow-hidden">
                <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3 bg-gradient-to-r from-ink-50 to-white">
                  <h3 className="font-semibold text-ink-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => {
                        markAllAsRead()
                      }}
                      className="text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-ink-500">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`border-b border-ink-50 px-4 py-3 hover:bg-ink-50 transition-colors cursor-pointer ${!notif.read ? 'bg-brand-50' : ''
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${!notif.read ? 'bg-brand-600' : 'bg-transparent'
                              }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-ink-900">
                              {notif.title}
                            </p>
                            <p className="text-xs text-ink-600 mt-1 line-clamp-2">
                              {notif.message}
                            </p>
                            <p className="text-xs text-ink-400 mt-2">
                              {formatTimeAgo(notif.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="border-t border-ink-100 px-4 py-2 bg-ink-50">
                    <button
                      onClick={() => {
                        clearAllNotifications()
                        setShowNotifications(false)
                      }}
                      className="w-full text-center text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-ink-50 transition-colors active:bg-ink-100"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-white shadow-md">
              {initials(user?.name)}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold leading-tight text-ink-900">{user?.name}</p>
              <p className="text-xs leading-tight text-ink-500">{user?.role}</p>
            </div>
            <ChevronDown size={16} className="text-ink-400" />
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-ink-100 bg-white shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-ink-100 bg-gradient-to-r from-ink-50 to-white sm:hidden">
                  <p className="text-sm font-semibold text-ink-900">{user?.name}</p>
                  <p className="text-xs text-ink-500 mt-0.5">{user?.role}</p>
                </div>
                <button
                  onClick={() => {
                    logout()
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-none px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
