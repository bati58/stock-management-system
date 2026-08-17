import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './router/ProtectedRoute'
import DashboardLayout from './components/layout/DashboardLayout'

import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import StoreList from './pages/stores/StoreList'
import CategoryList from './pages/categories/CategoryList'
import ItemList from './pages/items/ItemList'
import GoodsReceiptList from './pages/goods-receipt/GoodsReceiptList'
import Evaluation from './pages/goods-receipt/Evaluation'
import GrnDocuments from './pages/goods-receipt/GrnDocuments'
import StockCardList from './pages/stock-cards/StockCardList'
import BinCardList from './pages/bin-cards/BinCardList'
import StockTransfer from './pages/stock-transfer/StockTransfer'
import RequisitionList from './pages/requisitions/RequisitionList'
import IssueVoucherList from './pages/issue-vouchers/IssueVoucherList'
import FixedAssetList from './pages/fixed-assets/FixedAssetList'
import UserCardList from './pages/user-cards/UserCardList'
import UserList from './pages/users/UserList'
import MaterialReturnList from './pages/material-return/MaterialReturnList'
import MaterialTransferList from './pages/material-transfer/MaterialTransferList'
import DisposalList from './pages/disposal/DisposalList'
import Reports from './pages/reports/Reports'
import AuditLog from './pages/audit/AuditLog'
import GatePassVerification from './pages/gate-pass/GatePassVerification'
import Settings from './pages/settings/Settings'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Dashboard />} />

          <Route path="/stores" element={<StoreList />} />
          <Route path="/categories" element={<CategoryList />} />
          <Route path="/items" element={<ItemList />} />

          <Route path="/goods-receipt" element={<GoodsReceiptList />} />
          <Route path="/goods-receipt/evaluation" element={<Evaluation />} />
          <Route path="/grn-documents" element={<GrnDocuments />} />

          <Route path="/stock-cards" element={<StockCardList />} />
          <Route path="/bin-cards" element={<BinCardList />} />
          <Route path="/stock-transfer" element={<StockTransfer />} />

          <Route path="/requisitions" element={<RequisitionList />} />
          <Route path="/issue-vouchers" element={<IssueVoucherList />} />

          <Route path="/material-return" element={<MaterialReturnList />} />
          <Route path="/material-transfer" element={<MaterialTransferList />} />

          <Route path="/fixed-assets" element={<FixedAssetList />} />
          <Route path="/user-cards" element={<UserCardList />} />
          <Route path="/disposal" element={<DisposalList />} />

          <Route path="/users" element={<UserList />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/audit-log" element={<AuditLog />} />
          <Route path="/gate-pass" element={<GatePassVerification />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
