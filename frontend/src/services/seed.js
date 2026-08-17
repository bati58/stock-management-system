import { seedIfEmpty } from './localDb'
import {
  ROLES,
  STATUS,
  GRN_STATUS,
  REQUISITION_STATUS,
  SIV_STATUS,
  TRANSFER_STATUS,
  RETURN_STATUS,
  DISPOSAL_STATUS,
  ASSET_STATUS
} from '../utils/constants'

export function seedDatabase() {
  const canonicalUsers = [
    { id: 1, name: 'Abel Tesfaye', username: 'admin', role: ROLES.ADMIN, email: 'admin@sms.local', active: true },
    { id: 2, name: 'Meron Getachew', username: 'pao', role: ROLES.PAO, email: 'pao@sms.local', active: true },
    { id: 3, name: 'Yonas Bekele', username: 'storehead', role: ROLES.STORE_HEAD, email: 'storehead@sms.local', active: true },
    { id: 4, name: 'Sara Alemu', username: 'storekeeper', role: ROLES.STOREKEEPER, email: 'storekeeper@sms.local', active: true },
    { id: 5, name: 'Kaleb Mulugeta', username: 'clerk', role: ROLES.STOCK_CLERK, email: 'clerk@sms.local', active: true },
    { id: 6, name: 'Dr. Fikru Wolde', username: 'tec', role: ROLES.TEC, email: 'tec@sms.local', active: true },
    { id: 7, name: 'Hana Girma', username: 'depthead', role: ROLES.DEPT_HEAD, email: 'depthead@sms.local', department: 'Electrical Engineering Dept.', active: true },
    { id: 8, name: 'Biniam Assefa', username: 'accountant', role: ROLES.ACCOUNTANT, email: 'accountant@sms.local', active: true },
    { id: 9, name: 'Samuel Tadesse', username: 'security', role: ROLES.SECURITY, email: 'security@sms.local', active: true }
  ]

  const existingUsers = JSON.parse(localStorage.getItem('sms_v1_users') || '[]')
  const byUsername = new Map()

    ;[...existingUsers, ...canonicalUsers].forEach((user) => {
      const key = String(user?.username || '').trim().toLowerCase()
      if (!key) return
      const current = byUsername.get(key)
      if (!current || Number(current.id) <= Number(user.id || 0)) {
        byUsername.set(key, { ...current, ...user, username: user.username, active: user.active ?? current?.active ?? true })
      }
    })

  const normalizedUsers = canonicalUsers.map((seedUser) => {
    const key = String(seedUser.username || '').trim().toLowerCase()
    return byUsername.get(key) || seedUser
  })

  localStorage.setItem('sms_v1_users', JSON.stringify(normalizedUsers))

  seedIfEmpty('stores', [
    { id: 1, name: 'Main Store', code: 'STR-MAIN', type: 'Main Store', location: 'Central Warehouse', headOfStore: 'Yonas Bekele', active: true },
    { id: 2, name: 'Electrical Engineering Dept. Store', code: 'STR-EEE', type: 'Department Store', location: 'EEE Building', headOfStore: 'Sara Alemu', active: true },
    { id: 3, name: 'Mechanical Engineering Dept. Store', code: 'STR-MEE', type: 'Department Store', location: 'MEE Building', headOfStore: 'Kaleb Mulugeta', active: true },
    { id: 4, name: 'Chemical Engineering Dept. Store', code: 'STR-CHE', type: 'Department Store', location: 'CHE Building', headOfStore: 'Hana Girma', active: true },
    { id: 5, name: 'Cafeteria Store', code: 'STR-CAF', type: 'Cafe Store', location: 'Student Cafeteria', headOfStore: 'Biniam Assefa', active: true },
    { id: 6, name: 'Pharmaceutical Lab Store', code: 'STR-PHARM', type: 'Specialized/Laboratory', location: 'Health Science Wing', headOfStore: 'Dr. Fikru Wolde', active: true }
  ])

  seedIfEmpty('categories', [
    { id: 1, code: '4402', name: 'Office Supplies', store: 'Main Store', description: 'Stationery and general office consumables', active: true },
    { id: 2, code: '4405', name: 'Educational Supplies', store: 'Main Store', description: 'Teaching and laboratory materials', active: true },
    { id: 3, code: '4411', name: 'Research & Development Supplies', store: 'Main Store', description: 'Equipment and materials for R&D labs', active: true },
    { id: 4, code: '4414', name: 'Spare Parts', store: 'Mechanical Engineering Dept. Store', description: 'Workshop and machine spare parts', active: true },
    { id: 5, code: '4406', name: 'Food Items', store: 'Cafeteria Store', description: 'Cafeteria consumables', active: true },
    { id: 6, code: '4420', name: 'Chemicals & Reagents', store: 'Pharmaceutical Lab Store', description: 'Lab chemicals', active: true }
  ])

  seedIfEmpty('items', [
    { id: 1, code: '4402-001-001', name: 'A4 Photocopy Paper (White)', category: 'Office Supplies', unit: 'ream', minLevel: 50, maxLevel: 500, reorderLevel: 100, qtyOnHand: 320, unitPrice: 220, store: 'Main Store', bin: 'A-01' },
    { id: 2, code: '4402-002-004', name: 'Ballpoint Pen (Blue)', category: 'Office Supplies', unit: 'box', minLevel: 20, maxLevel: 200, reorderLevel: 40, qtyOnHand: 18, unitPrice: 150, store: 'Main Store', bin: 'A-02' },
    { id: 3, code: '4405-001-002', name: 'Digital Multimeter', category: 'Educational Supplies', unit: 'pcs', minLevel: 5, maxLevel: 60, reorderLevel: 10, qtyOnHand: 34, unitPrice: 1850, store: 'Electrical Engineering Dept. Store', bin: 'E-05' },
    { id: 4, code: '4411-003-001', name: 'Arduino Uno R3 Board', category: 'Research & Development Supplies', unit: 'pcs', minLevel: 10, maxLevel: 100, reorderLevel: 20, qtyOnHand: 62, unitPrice: 950, store: 'Main Store', bin: 'B-11' },
    { id: 5, code: '4414-002-007', name: 'Ball Bearing 6205-ZZ', category: 'Spare Parts', unit: 'pcs', minLevel: 30, maxLevel: 300, reorderLevel: 60, qtyOnHand: 45, unitPrice: 180, store: 'Mechanical Engineering Dept. Store', bin: 'M-03' },
    { id: 6, code: '4406-001-005', name: 'Cooking Oil (5L)', category: 'Food Items', unit: 'litre', minLevel: 40, maxLevel: 400, reorderLevel: 80, qtyOnHand: 75, unitPrice: 900, store: 'Cafeteria Store', bin: 'C-01', expiryDate: '2027-01-15', batchNo: 'B-2026-X' },
    { id: 7, code: '4420-001-001', name: 'Ethanol 95%', category: 'Chemicals & Reagents', unit: 'litre', minLevel: 10, maxLevel: 100, reorderLevel: 20, qtyOnHand: 5, unitPrice: 450, store: 'Pharmaceutical Lab Store', bin: 'P-01', expiryDate: '2026-10-01', batchNo: 'ETH-098' }
  ])

  seedIfEmpty('goodsReceipts', [
    {
      id: 1,
      grnRef: 'GRN-2026-0001',
      supplier: 'Ethio Office Supplies PLC',
      poRef: 'PO-2026-014',
      receivedDate: '2026-08-05',
      receivedBy: 'Sara Alemu',
      store: 'Main Store',
      status: GRN_STATUS.ACCEPTED,
      items: [{ item: 'A4 Photocopy Paper (White)', qty: 100, unitPrice: 220 }],
      evaluationNote: 'Quantity and quality verified against packing slip. Accepted.',
      evaluatedBy: 'Dr. Fikru Wolde'
    },
    {
      id: 2,
      grnRef: 'GRN-2026-0002',
      supplier: 'National Lab Equipment Importers',
      poRef: 'PO-2026-021',
      receivedDate: '2026-08-11',
      receivedBy: 'Sara Alemu',
      store: 'Electrical Engineering Dept. Store',
      status: GRN_STATUS.UNDER_EVAL,
      items: [{ item: 'Digital Multimeter', qty: 15, unitPrice: 1850 }],
      evaluationNote: '',
      evaluatedBy: ''
    },
    {
      id: 3,
      grnRef: 'GRN-2026-0003',
      supplier: 'Addis Hardware Trading',
      poRef: 'PO-2026-028',
      receivedDate: '2026-08-13',
      receivedBy: 'Kaleb Mulugeta',
      store: 'Mechanical Engineering Dept. Store',
      status: GRN_STATUS.PENDING_EVAL,
      items: [{ item: 'Ball Bearing 6205-ZZ', qty: 50, unitPrice: 180 }],
      evaluationNote: '',
      evaluatedBy: ''
    }
  ])

  seedIfEmpty('stockTransactions', [
    { id: 1, item: 'A4 Photocopy Paper (White)', date: '2026-08-05', type: 'Receipt', ref: 'GRN-2026-0001', qtyIn: 100, qtyOut: 0, unitPrice: 220, balance: 320 },
    { id: 2, item: 'A4 Photocopy Paper (White)', date: '2026-08-07', type: 'Issue', ref: 'SIV-2026-0009', qtyIn: 0, qtyOut: 25, unitPrice: 220, balance: 295 },
    { id: 3, item: 'Ballpoint Pen (Blue)', date: '2026-08-02', type: 'Issue', ref: 'SIV-2026-0006', qtyIn: 0, qtyOut: 12, unitPrice: 150, balance: 18 },
    { id: 4, item: 'Arduino Uno R3 Board', date: '2026-08-09', type: 'Receipt', ref: 'GRN-2025-0091', qtyIn: 20, qtyOut: 0, unitPrice: 950, balance: 62 }
  ])

  seedIfEmpty('binCards', [
    { id: 1, bin: 'A-01', store: 'Main Store', item: 'A4 Photocopy Paper (White)', lastMovement: '2026-08-07', balance: 320 },
    { id: 2, bin: 'A-02', store: 'Main Store', item: 'Ballpoint Pen (Blue)', lastMovement: '2026-08-02', balance: 18 },
    { id: 3, bin: 'E-05', store: 'Electrical Engineering Dept. Store', item: 'Digital Multimeter', lastMovement: '2026-07-29', balance: 34 },
    { id: 4, bin: 'B-11', store: 'Main Store', item: 'Arduino Uno R3 Board', lastMovement: '2026-08-09', balance: 62 }
  ])

  seedIfEmpty('requisitions', [
    {
      id: 1,
      srRef: 'SR-2026-0041',
      department: 'Electrical Engineering Dept.',
      requestedBy: 'Hana Girma',
      date: '2026-08-10',
      store: 'Main Store',
      status: REQUISITION_STATUS.PENDING,
      items: [{ item: 'A4 Photocopy Paper (White)', qty: 10 }, { item: 'Ballpoint Pen (Blue)', qty: 5 }]
    },
    {
      id: 2,
      srRef: 'SR-2026-0040',
      department: 'Mechanical Engineering Dept.',
      requestedBy: 'Kaleb Mulugeta',
      date: '2026-08-08',
      store: 'Mechanical Engineering Dept. Store',
      status: REQUISITION_STATUS.APPROVED,
      items: [{ item: 'Ball Bearing 6205-ZZ', qty: 20 }]
    }
  ])

  seedIfEmpty('issueVouchers', [
    {
      id: 1,
      sivRef: 'SIV-2026-0009',
      type: 'SIV',
      srRef: 'SR-2026-0038',
      issuedTo: 'Electrical Engineering Dept.',
      issuedBy: 'Sara Alemu',
      date: '2026-08-07',
      status: SIV_STATUS.ISSUED,
      items: [{ item: 'A4 Photocopy Paper (White)', qty: 25, unitPrice: 220 }]
    }
  ])

  seedIfEmpty('fixedAssets', [
    { id: 1, assetTag: 'FA-2026-0102', name: 'HP LaserJet Printer M404', category: 'Office Equipment', store: 'Main Store', assignedTo: 'Registrar Office', status: ASSET_STATUS.IN_USE, acquisitionDate: '2025-03-10', value: 18500 },
    { id: 2, assetTag: 'FA-2026-0155', name: 'Oscilloscope - Tektronix TBS1052B', category: 'Lab Equipment', store: 'Electrical Engineering Dept. Store', assignedTo: 'EEE Lab 2', status: ASSET_STATUS.IN_USE, acquisitionDate: '2024-11-02', value: 62000 }
  ])

  seedIfEmpty('materialReturns', [
    { id: 1, srnRef: 'SRN-2026-0011', department: 'Chemical Engineering Dept.', item: 'Digital Multimeter', qty: 2, reason: 'Excess issued quantity', date: '2026-08-06', status: RETURN_STATUS.PENDING_REVIEW }
  ])

  seedIfEmpty('materialTransfers', [
    { id: 1, transferRef: 'TRF-2026-0007', fromStore: 'Main Store', toStore: 'Electrical Engineering Dept. Store', item: 'Arduino Uno R3 Board', qty: 15, date: '2026-08-04', status: TRANSFER_STATUS.APPROVED }
  ])

  seedIfEmpty('disposals', [
    { id: 1, disposalRef: 'DSP-2026-0003', item: 'Obsolete Overhead Projector', store: 'Main Store', qty: 3, reason: 'Obsolete - beyond economical repair', dateFlagged: '2026-07-20', status: DISPOSAL_STATUS.FLAGGED }
  ])

  seedIfEmpty('binTransfers', [
    { id: 1, item: 'A4 Photocopy Paper (White)', fromBin: 'A-01', toBin: 'A-03', qty: 20, date: '2026-08-03', transferredBy: 'Sara Alemu' }
  ])

  seedIfEmpty('userCards', [
    { id: 1, user: 'Hana Girma', department: 'Electrical Engineering Dept.', item: 'Digital Multimeter', issueRef: 'SIV-2025-0012', issueDate: '2025-02-14', qty: 1, status: 'In Use', returnedDate: null }
  ])

  seedIfEmpty('auditLogs', [
    {
      id: 1,
      timestamp: '2026-08-05T09:12:00Z',
      actorId: 4,
      actorName: 'Sara Alemu',
      actorRole: ROLES.STOREKEEPER,
      action: 'GOODS_RECEIPT_CREATED',
      module: 'Receiving',
      entityType: 'GoodsReceipt',
      entityId: 'GR-2026-0015',
      entityReference: 'GRN-2026-0001',
      description: 'Storekeeper recorded a goods receipt for office consumables delivered to Main Store.',
      outcome: 'SUCCESS',
      beforeData: { status: 'Draft' },
      afterData: { status: 'Submitted' },
      changes: [{ field: 'status', oldValue: 'Draft', newValue: 'Submitted' }],
      ipAddress: '192.168.10.18',
      userAgent: 'Chrome / Windows',
      metadata: { store: 'Main Store', department: 'Property Administration' }
    },
    {
      id: 2,
      timestamp: '2026-08-05T09:41:00Z',
      actorId: 4,
      actorName: 'Sara Alemu',
      actorRole: ROLES.STOREKEEPER,
      action: 'GOODS_RECEIPT_SUBMITTED',
      module: 'Receiving',
      entityType: 'GoodsReceipt',
      entityId: 'GR-2026-0015',
      entityReference: 'GRN-2026-0001',
      description: 'Goods receipt GRN-2026-0001 was submitted for technical evaluation.',
      outcome: 'SUCCESS',
      beforeData: { status: 'Submitted' },
      afterData: { status: 'Pending Evaluation' },
      changes: [{ field: 'status', oldValue: 'Submitted', newValue: 'Pending Evaluation' }],
      ipAddress: '192.168.10.18',
      userAgent: 'Chrome / Windows',
      metadata: { store: 'Main Store', department: 'Property Administration' }
    },
    {
      id: 3,
      timestamp: '2026-08-05T11:02:00Z',
      actorId: 6,
      actorName: 'Dr. Fikru Wolde',
      actorRole: ROLES.TEC,
      action: 'GOODS_RECEIPT_ACCEPTED',
      module: 'Receiving',
      entityType: 'GoodsReceipt',
      entityId: 'GR-2026-0015',
      entityReference: 'GRN-2026-0001',
      description: 'Technical Evaluation Committee accepted the delivered office supplies after inspection.',
      outcome: 'SUCCESS',
      beforeData: { status: 'Under Evaluation' },
      afterData: { status: 'Accepted' },
      changes: [{ field: 'status', oldValue: 'Under Evaluation', newValue: 'Accepted' }],
      ipAddress: '192.168.10.26',
      userAgent: 'Edge / Windows',
      metadata: { store: 'Main Store', department: 'Property Administration' }
    },
    {
      id: 4,
      timestamp: '2026-08-05T11:18:00Z',
      actorId: 2,
      actorName: 'Meron Getachew',
      actorRole: ROLES.PAO,
      action: 'GRN_GENERATED',
      module: 'Receiving',
      entityType: 'GoodsReceipt',
      entityId: 'GR-2026-0015',
      entityReference: 'GRN-2026-0001',
      description: 'Property Administration Officer generated the official Model 19 GRN document.',
      outcome: 'SUCCESS',
      beforeData: { status: 'Accepted' },
      afterData: { status: 'GRN Generated' },
      changes: [{ field: 'status', oldValue: 'Accepted', newValue: 'GRN Generated' }],
      ipAddress: '192.168.10.14',
      userAgent: 'Chrome / Windows',
      metadata: { store: 'Main Store', department: 'Property Administration', relatedDocument: 'Model 19' }
    },
    {
      id: 5,
      timestamp: '2026-08-07T08:47:00Z',
      actorId: 4,
      actorName: 'Sara Alemu',
      actorRole: ROLES.STOREKEEPER,
      action: 'SIV_ISSUED',
      module: 'SIV',
      entityType: 'IssueVoucher',
      entityId: 'SIV-2026-0009',
      entityReference: 'SIV-2026-0009',
      description: 'Storekeeper issued materials against approved requisition SR-2026-0038.',
      outcome: 'SUCCESS',
      beforeData: { issuedQty: 0 },
      afterData: { issuedQty: 25 },
      changes: [{ field: 'issuedQty', oldValue: 0, newValue: 25 }],
      ipAddress: '192.168.10.18',
      userAgent: 'Chrome / Windows',
      metadata: { store: 'Main Store', department: 'Electrical Engineering Dept.' }
    },
    {
      id: 6,
      timestamp: '2026-08-08T14:25:00Z',
      actorId: 7,
      actorName: 'Hana Girma',
      actorRole: ROLES.DEPT_HEAD,
      action: 'REQUISITION_APPROVED',
      module: 'Requisition',
      entityType: 'Requisition',
      entityId: 'SR-2026-0040',
      entityReference: 'SR-2026-0040',
      description: 'Department Head approved the mechanical engineering requisition for workshop spares.',
      outcome: 'SUCCESS',
      beforeData: { status: 'Pending' },
      afterData: { status: 'Approved' },
      changes: [{ field: 'status', oldValue: 'Pending', newValue: 'Approved' }],
      ipAddress: '192.168.10.33',
      userAgent: 'Firefox / Linux',
      metadata: { store: 'Mechanical Engineering Dept. Store', department: 'Mechanical Engineering Dept.' }
    },
    {
      id: 7,
      timestamp: '2026-08-10T13:05:00Z',
      actorId: 1,
      actorName: 'Abel Tesfaye',
      actorRole: ROLES.ADMIN,
      action: 'USER_CREATED',
      module: 'Users',
      entityType: 'User',
      entityId: 'USR-0009',
      entityReference: 'accountant',
      description: 'Administrator created the new accounting user profile for the Finance Office.',
      outcome: 'SUCCESS',
      beforeData: { active: false },
      afterData: { active: true },
      changes: [{ field: 'active', oldValue: false, newValue: true }],
      ipAddress: '10.0.0.12',
      userAgent: 'Chrome / Windows',
      metadata: { department: 'Finance', role: 'Accountant' }
    },
    {
      id: 8,
      timestamp: '2026-08-11T08:15:00Z',
      actorId: 9,
      actorName: 'Samuel Tadesse',
      actorRole: ROLES.SECURITY,
      action: 'GATE_PASS_VERIFIED',
      module: 'Security',
      entityType: 'GatePass',
      entityId: 'GP-2026-0148',
      entityReference: 'GP-2026-0148',
      description: 'Security verified the gate pass for disposal and movement of equipment out of the campus.',
      outcome: 'SUCCESS',
      beforeData: { status: 'Pending' },
      afterData: { status: 'Verified' },
      changes: [{ field: 'status', oldValue: 'Pending', newValue: 'Verified' }],
      ipAddress: '10.12.0.44',
      userAgent: 'Safari / iPhone',
      metadata: { store: 'Main Store', department: 'Security Office' }
    }
  ])
}
