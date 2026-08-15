import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'

export default function Settings() {
    const { user, updateUser } = useAuth()
    const { push } = useToast()

    const [settings, setSettings] = useState({
        theme: 'light',
        emailNotifications: true,
        pushNotifications: true,
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h'
    })

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })

    const handleSettingChange = (key, value) => {
        setSettings((prev) => ({
            ...prev,
            [key]: value
        }))
    }

    const handleSaveSettings = () => {
        push('Settings saved successfully', 'success')
    }

    const handlePasswordChange = () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            push('Passwords do not match', 'error')
            return
        }
        if (passwordForm.newPassword.length < 8) {
            push('Password must be at least 8 characters', 'error')
            return
        }
        setPasswordForm({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        })
        push('Password changed successfully', 'success')
    }

    return (
        <div className="max-w-4xl mx-auto">
            <PageHeader
                title="Settings"
                description="Manage your account preferences and system settings"
            />

            {/* User Profile Section */}
            <Card title="User Profile" className="mb-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-ink-700 mb-1">Name</label>
                        <Input type="text" value={user?.name} disabled />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-ink-700 mb-1">Email</label>
                        <Input type="email" value={user?.email} disabled />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-ink-700 mb-1">Role</label>
                        <Input type="text" value={user?.role} disabled />
                    </div>
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
                        <p className="font-medium">Read-only Information</p>
                        <p className="text-xs mt-1">Your profile information is managed by system administrators.</p>
                    </div>
                </div>
            </Card>

            {/* Notification Preferences */}
            <Card title="Notifications" className="mb-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-ink-200 rounded-lg hover:bg-ink-50 transition-colors">
                        <div>
                            <p className="font-medium text-ink-900">Email Notifications</p>
                            <p className="text-sm text-ink-600">Receive updates via email</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.emailNotifications}
                                onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-ink-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-ink-200 rounded-lg hover:bg-ink-50 transition-colors">
                        <div>
                            <p className="font-medium text-ink-900">Push Notifications</p>
                            <p className="text-sm text-ink-600">Receive browser push notifications</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.pushNotifications}
                                onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-ink-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                        </label>
                    </div>
                </div>
            </Card>

            {/* Display Preferences */}
            <Card title="Display Settings" className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-ink-700 mb-2">Theme</label>
                        <Select
                            value={settings.theme}
                            onChange={(value) => handleSettingChange('theme', value)}
                            options={[
                                { label: 'Light', value: 'light' },
                                { label: 'Dark', value: 'dark' },
                                { label: 'Auto', value: 'auto' }
                            ]}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-ink-700 mb-2">Language</label>
                        <Select
                            value={settings.language}
                            onChange={(value) => handleSettingChange('language', value)}
                            options={[
                                { label: 'English', value: 'en' },
                                { label: 'French', value: 'fr' },
                                { label: 'Spanish', value: 'es' }
                            ]}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-ink-700 mb-2">Date Format</label>
                        <Select
                            value={settings.dateFormat}
                            onChange={(value) => handleSettingChange('dateFormat', value)}
                            options={[
                                { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
                                { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
                                { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' }
                            ]}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-ink-700 mb-2">Time Format</label>
                        <Select
                            value={settings.timeFormat}
                            onChange={(value) => handleSettingChange('timeFormat', value)}
                            options={[
                                { label: '24-hour', value: '24h' },
                                { label: '12-hour', value: '12h' }
                            ]}
                        />
                    </div>
                </div>

                <div className="mt-6">
                    <Button onClick={handleSaveSettings} variant="primary">
                        Save Display Settings
                    </Button>
                </div>
            </Card>

            {/* Security / Password */}
            <Card title="Security" className="mb-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-ink-700 mb-2">Current Password</label>
                        <Input
                            type="password"
                            placeholder="Enter current password"
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-ink-700 mb-2">New Password</label>
                        <Input
                            type="password"
                            placeholder="Enter new password"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                        />
                        <p className="text-xs text-ink-500 mt-1">Minimum 8 characters required</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-ink-700 mb-2">Confirm Password</label>
                        <Input
                            type="password"
                            placeholder="Confirm new password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        />
                    </div>

                    <Button onClick={handlePasswordChange} variant="primary">
                        Change Password
                    </Button>
                </div>
            </Card>

            {/* About Section */}
            <Card title="About" className="mb-6">
                <div className="space-y-3">
                    <div className="flex justify-between">
                        <span className="text-ink-600">Application</span>
                        <span className="font-medium text-ink-900">Stock Management System</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-ink-600">Version</span>
                        <span className="font-medium text-ink-900">1.0.0</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-ink-600">Build Date</span>
                        <span className="font-medium text-ink-900">{new Date().toLocaleDateString()}</span>
                    </div>
                </div>
            </Card>
        </div>
    )
}
