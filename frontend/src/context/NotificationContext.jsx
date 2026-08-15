import { createContext, useCallback, useContext, useState } from 'react'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([
        {
            id: 1,
            title: 'New Requisition',
            message: 'Store requisition REQ-001 pending approval',
            type: 'info',
            read: false,
            timestamp: new Date(Date.now() - 5 * 60000) // 5 minutes ago
        },
        {
            id: 2,
            title: 'Stock Alert',
            message: 'Item SKU-042 stock level below threshold',
            type: 'warning',
            read: false,
            timestamp: new Date(Date.now() - 30 * 60000) // 30 minutes ago
        },
        {
            id: 3,
            title: 'Goods Receipt',
            message: 'GRN-2024-001 received and awaiting evaluation',
            type: 'success',
            read: false,
            timestamp: new Date(Date.now() - 2 * 60 * 60000) // 2 hours ago
        }
    ])

    const addNotification = useCallback(
        (title, message, type = 'info') => {
            const id = Date.now()
            setNotifications((prev) => [
                {
                    id,
                    title,
                    message,
                    type,
                    read: false,
                    timestamp: new Date()
                },
                ...prev
            ])
            return id
        },
        []
    )

    const markAsRead = useCallback((id) => {
        setNotifications((prev) =>
            prev.map((notif) =>
                notif.id === id ? { ...notif, read: true } : notif
            )
        )
    }, [])

    const markAllAsRead = useCallback(() => {
        setNotifications((prev) =>
            prev.map((notif) => ({ ...notif, read: true }))
        )
    }, [])

    const removeNotification = useCallback((id) => {
        setNotifications((prev) => prev.filter((notif) => notif.id !== id))
    }, [])

    const clearAllNotifications = useCallback(() => {
        setNotifications([])
    }, [])

    const unreadCount = notifications.filter((n) => !n.read).length

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                addNotification,
                markAsRead,
                markAllAsRead,
                removeNotification,
                clearAllNotifications,
                unreadCount
            }}
        >
            {children}
        </NotificationContext.Provider>
    )
}

export function useNotifications() {
    const context = useContext(NotificationContext)
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider')
    }
    return context
}
