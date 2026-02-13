import React, { useState, useEffect } from "react";
import {
    Users,
    UserPlus,
    Settings,
    TrendingUp,
    Activity,
    Filter,
    Search,
    Download,
    MoreVertical,
    Bell,
    Menu,
    ChevronRight
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

export default function DashboardPage() {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('overview');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const stats = [
        { label: t('totalMembers'), value: "1,284", icon: <Users size={20} />, color: "bg-amber-500", trend: "+12%" },
        { label: t('newJoinees'), value: "48", icon: <UserPlus size={20} />, color: "bg-yellow-500", trend: "+5%" },
        { label: t('activeSessions'), value: "156", icon: <Activity size={20} />, color: "bg-amber-600", trend: "+8%" },
        { label: t('growthRate'), value: "24%", icon: <TrendingUp size={20} />, color: "bg-orange-500", trend: "+3%" },
    ];

    const recentUsers = [
        { name: "Anbu Selvan", mobile: "9876543210", role: "Manager", status: t('activeStatus'), joinDate: "2024-01-25" },
        { name: "Priya Dharshini", mobile: "9845678901", role: "Editor", status: t('offlineStatus'), joinDate: "2024-01-24" },
        { name: "Muthu Kumar", mobile: "9988776655", role: "Contributor", status: t('activeStatus'), joinDate: "2024-01-23" },
        { name: "Sangeetha", mobile: "9765432109", role: "Manager", status: t('activeStatus'), joinDate: "2024-01-22" },
    ];

    return (
        <div className="flex h-[calc(100vh-64px)] bg-[#fffcf5] overflow-hidden">
            {/* Sidebar - Desktop */}
            <aside className={`fixed inset-y-0 left-0 bg-white border-r border-amber-100 w-64 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-200 z-30 md:static`}>
                <div className="p-6">
                    <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center">
                            <Settings className="text-white" size={18} />
                        </div>
                        {t('adminPanel')}
                    </h2>
                </div>

                <nav className="px-4 space-y-1">
                    <SidebarLink active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<Activity size={18} />} label={t('overview')} />
                    <SidebarLink active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={18} />} label={t('userManagement')} />
                    <SidebarLink active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<TrendingUp size={18} />} label={t('analytics')} />
                    <SidebarLink active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={18} />} label={t('settings')} />
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto w-full">
                {/* Top Header Section */}
                <div className="bg-white border-b border-amber-100 px-4 py-4 md:px-8 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="md:hidden p-2 hover:bg-amber-50 rounded-lg text-amber-700"
                        >
                            <Menu size={20} />
                        </button>
                        <h1 className="text-lg md:text-2xl font-bold text-amber-900">{t('adminDashboard')}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="p-2 text-amber-600 hover:bg-amber-50 rounded-full relative">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center overflow-hidden">
                            <img src="https://ui-avatars.com/api/?name=Admin&background=d97706&color=fff" alt="Admin" />
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-8 space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        {stats.map((stat, i) => (
                            <div key={i} className="bg-white p-6 rounded-2xl border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10 text-amber-700`}>
                                        {stat.icon}
                                    </div>
                                    <span className="text-xs font-semibold px-2 py-1 bg-amber-50 text-amber-600 rounded-full">
                                        {stat.trend}
                                    </span>
                                </div>
                                <p className="text-amber-800/60 text-sm font-medium">{stat.label}</p>
                                <h3 className="text-2xl font-bold text-amber-900 mt-1">{stat.value}</h3>
                            </div>
                        ))}
                    </div>

                    {/* Recent Activity Table */}
                    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-amber-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-amber-900">{t('userManagement')}</h2>
                                <p className="text-sm text-amber-700/60">{t('monitorMembers')}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2 border border-amber-100 rounded-lg text-amber-700 hover:bg-amber-50 transition-colors">
                                    <Filter size={18} />
                                </button>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder={t('searchUsers')}
                                        className="pl-9 pr-4 py-2 border border-amber-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-auto bg-white"
                                    />
                                </div>
                                <button className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-800 transition-colors flex items-center gap-2">
                                    <Download size={16} />
                                    <span className="hidden sm:inline">{t('export')}</span>
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-amber-50/30 text-amber-800 uppercase text-[10px] font-bold tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">{t('user')}</th>
                                        <th className="px-6 py-4">{t('mobile')}</th>
                                        <th className="px-6 py-4">{t('status')}</th>
                                        <th className="px-6 py-4">{t('joinDate')}</th>
                                        <th className="px-6 py-4 text-center">{t('action')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-amber-50">
                                    {recentUsers.map((user, i) => (
                                        <tr key={i} className="hover:bg-amber-50/20 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-700">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-amber-900">{user.name}</p>
                                                        <p className="text-xs text-amber-600/70">{user.role}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-amber-800">{user.mobile}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${user.status === t('activeStatus') ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {user.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-amber-700">{user.joinDate}</td>
                                            <td className="px-6 py-4 text-center">
                                                <button className="p-2 text-amber-400 hover:bg-amber-50 rounded-lg group-hover:text-amber-700">
                                                    <MoreVertical size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-6 border-t border-amber-50 flex items-center justify-between">
                            <p className="text-sm text-amber-700">{t('showing')} <span className="font-bold">4</span> {t('of')} <span className="font-bold">1,284</span></p>
                            <div className="flex items-center gap-2">
                                <button className="px-4 py-2 border border-amber-100 rounded-lg text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-50" disabled>{t('previous')}</button>
                                <button className="px-4 py-2 border border-amber-100 rounded-lg text-sm text-amber-700 hover:bg-amber-50">{t('next')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-amber-900/40 backdrop-blur-sm z-20 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}
        </div>
    );
}

function SidebarLink({ icon, label, active, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${active
                ? 'bg-amber-50 text-amber-700 font-bold shadow-sm ring-1 ring-amber-100'
                : 'text-amber-600 hover:bg-amber-50 hover:text-amber-800'
                }`}
        >
            <span className={`${active ? 'text-amber-700' : 'text-amber-400 group-hover:text-amber-700'}`}>
                {icon}
            </span>
            <span className="text-sm">{label}</span>
            {active && <ChevronRight size={14} className="ml-auto" />}
        </button>
    );
}
