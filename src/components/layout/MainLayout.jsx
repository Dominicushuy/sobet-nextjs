import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useContext, useEffect } from 'react'
import {
  LayoutDashboard,
  Users,
  Database,
  ListChecks,
  History,
  MessageSquare,
  LogOut,
  Calendar,
  User,
} from 'lucide-react'
import { AuthContext } from '@/contexts/AuthContext'
import { Button } from '../ui/button'

export default function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, loading } = useContext(AuthContext)

  // Kiểm tra authen
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, navigate, loading])

  // Hiển thị loading state
  if (loading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <div className='text-center'>
          <div className='w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
          <p className='text-lg'>Đang tải...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const isAdmin = user.role === 'admin'

  const userMenuItems = [
    { path: '/', label: 'Nhập mã cược', icon: <MessageSquare size={20} /> },
    { path: '/history', label: 'Lịch sử mã cược', icon: <History size={20} /> },
  ]

  const adminMenuItems = [
    { path: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    {
      path: '/admin/users',
      label: 'Quản lý người dùng',
      icon: <Users size={20} />,
    },
    {
      path: '/admin/stations',
      label: 'Quản lý đài',
      icon: <Database size={20} />,
    },
    {
      path: '/admin/bet-types',
      label: 'Quản lý kiểu cược',
      icon: <Database size={20} />,
    },
    {
      path: '/admin/verification',
      label: 'Đối soát kết quả',
      icon: <ListChecks size={20} />,
    },
    {
      path: '/admin/verification-history',
      label: 'Lịch sử đối soát',
      icon: <History size={20} />,
    },
    {
      path: '/admin/lottery-results',
      label: 'Kết quả xổ số',
      icon: <Calendar size={20} />,
    },
  ]

  const menuItems = isAdmin
    ? [...userMenuItems, ...adminMenuItems]
    : userMenuItems

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className='flex h-screen'>
      {/* Sidebar */}
      <div className='w-64 bg-slate-800 text-white p-4 flex flex-col'>
        <div className='text-xl font-bold mb-6'>Quản lý xổ số</div>

        <nav className='space-y-2 flex-1'>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 p-2 rounded hover:bg-slate-700 ${
                location.pathname === item.path ? 'bg-slate-700' : ''
              }`}>
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* User info */}
        <div className='border-t border-slate-700 pt-4 mt-4 mb-4'>
          <div className='flex items-center gap-2 px-2 py-2'>
            <div className='w-8 h-8 rounded-full bg-primary flex items-center justify-center'>
              <User size={16} />
            </div>
            <div>
              <div className='font-medium'>{user.username}</div>
              <div className='text-xs text-slate-400'>
                {isAdmin ? 'Quản trị viên' : 'Người dùng'}
              </div>
            </div>
          </div>
        </div>

        <Button
          variant='ghost'
          className='w-full flex items-center gap-2 text-white'
          onClick={handleLogout}>
          <LogOut size={20} />
          <span>Đăng xuất</span>
        </Button>
      </div>

      {/* Main Content */}
      <div className='flex-1 overflow-auto'>
        <div className='p-6'>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
