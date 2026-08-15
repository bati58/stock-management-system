import {
  LayoutDashboard,
  Warehouse,
  Tags,
  Boxes,
  PackageCheck,
  ClipboardCheck,
  Layers,
  ArrowLeftRight,
  FileText,
  Send,
  Landmark,
  Users,
  Undo2,
  Repeat,
  Trash2,
  BarChart3,
  ShieldCheck,
  Shield
} from 'lucide-react'
import { ROLES } from '../../utils/constants'

// Sidebar navigation, grouped to mirror the module breakdown in the
// Frontend SRS (section 4). Specify roles array to limit visibility to those roles.
// Empty roles array or roles: null means everyone authenticated can see it.
export const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      {
        to: '/',
        label: 'Dashboard',
        icon: LayoutDashboard,
        roles: [
          ROLES.ADMIN,
          ROLES.PAO,
          ROLES.STORE_HEAD,
          ROLES.STOREKEEPER,
          ROLES.STOCK_CLERK,
          ROLES.TEC,
          ROLES.DEPT_HEAD,
          ROLES.ACCOUNTANT,
          ROLES.SECURITY
        ]
      }
    ]
  },
  {
    label: 'Inventory Setup',
    items: [
      { to: '/stores', label: 'Stores', icon: Warehouse, roles: [ROLES.ADMIN, ROLES.STORE_HEAD] },
      { to: '/categories', label: 'Item Categories', icon: Tags, roles: [ROLES.ADMIN, ROLES.STORE_HEAD] },
      { to: '/items', label: 'Items & Locations', icon: Boxes, roles: [ROLES.ADMIN, ROLES.STORE_HEAD, ROLES.STOREKEEPER, ROLES.STOCK_CLERK] }
    ]
  },
  {
    label: 'Stock Receiving',
    items: [
      {
        to: '/goods-receipt',
        label: 'Goods Receipt (GRN)',
        icon: PackageCheck,
        roles: [ROLES.ADMIN, ROLES.STORE_HEAD, ROLES.STOREKEEPER]
      },
      {
        to: '/goods-receipt/evaluation',
        label: 'Technical Evaluation',
        icon: ClipboardCheck,
        roles: [ROLES.ADMIN, ROLES.TEC, ROLES.STORE_HEAD]
      }
    ]
  },
  {
    label: 'Stock Records',
    items: [
      { to: '/stock-cards', label: 'Stock Cards', icon: Layers, roles: [ROLES.ADMIN, ROLES.STORE_HEAD, ROLES.STOREKEEPER, ROLES.STOCK_CLERK] },
      { to: '/bin-cards', label: 'Bin Cards', icon: Layers, roles: [ROLES.ADMIN, ROLES.STORE_HEAD, ROLES.STOREKEEPER, ROLES.STOCK_CLERK] },
      { to: '/stock-transfer', label: 'Stock Transfer', icon: ArrowLeftRight, roles: [ROLES.ADMIN, ROLES.STORE_HEAD, ROLES.STOREKEEPER, ROLES.STOCK_CLERK] }
    ]
  },
  {
    label: 'Requisitions & Issues',
    items: [
      { to: '/requisitions', label: 'Store Requisitions', icon: FileText, roles: [ROLES.ADMIN, ROLES.PAO, ROLES.STORE_HEAD, ROLES.DEPT_HEAD] },
      { to: '/issue-vouchers', label: 'Issue Vouchers', icon: Send, roles: [ROLES.ADMIN, ROLES.STORE_HEAD, ROLES.STOREKEEPER, ROLES.ACCOUNTANT, ROLES.SECURITY] }
    ]
  },
  {
    label: 'Security',
    items: [
      { to: '/gate-pass', label: 'Gate Pass Verification', icon: Shield, roles: [ROLES.ADMIN, ROLES.SECURITY] }
    ]
  },
  {
    label: 'Returns & Transfers',
    items: [
      { to: '/material-return', label: 'Material Returns (SRN)', icon: Undo2, roles: [ROLES.ADMIN, ROLES.STORE_HEAD, ROLES.DEPT_HEAD] },
      { to: '/material-transfer', label: 'Material Transfers', icon: Repeat, roles: [ROLES.ADMIN, ROLES.STORE_HEAD, ROLES.DEPT_HEAD] }
    ]
  },
  {
    label: 'Assets & Disposal',
    items: [
      { to: '/fixed-assets', label: 'Fixed Assets', icon: Landmark, roles: [ROLES.ADMIN, ROLES.PAO] },
      { to: '/disposal', label: 'Disposal Management', icon: Trash2, roles: [ROLES.ADMIN, ROLES.PAO] }
    ]
  },
  {
    label: 'Administration',
    items: [
      { to: '/users', label: 'Users', icon: Users, roles: [ROLES.ADMIN] },
      { to: '/reports', label: 'Reports', icon: BarChart3, roles: [ROLES.ADMIN, ROLES.PAO, ROLES.STORE_HEAD, ROLES.STOCK_CLERK, ROLES.TEC, ROLES.DEPT_HEAD, ROLES.ACCOUNTANT] },
      { to: '/audit-log', label: 'Audit Log', icon: ShieldCheck, roles: [ROLES.ADMIN, ROLES.PAO, ROLES.ACCOUNTANT, ROLES.SECURITY] }
    ]
  }
]
