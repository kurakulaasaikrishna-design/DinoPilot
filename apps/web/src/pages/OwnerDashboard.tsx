import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const API_URL = 'http://localhost:4000';

type DashboardData = {
  restaurant: {
    id: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    coverImageUrl: string | null;
  } | null;

  summary: {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    todayRevenue: number;
    totalRevenue: number;
  };

  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string | null;
    totalAmount: number;
    orderStatus: string;
    paymentStatus: string;
    createdAt: string;
  }>;

  topSellingItems: Array<{
    menuItemId: string;
    itemName: string;
    quantitySold: number;
    revenue: number;
  }>;
};

type OwnerOrder = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  tableNumber: string | null;
  completedAt: string | null;
  createdAt: string;
  completedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  items: Array<{
    id: string;
    itemName: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
  }>;
};

type Section = 'dashboard' | 'orders' | 'menu' | 'tables';

const orderStatuses = [
  'ALL',
  'CREATED',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
];

const navItems: Array<{
  id: Section;
  label: string;
  icon: string;
}> = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '⌂',
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: '▤',
  },
  {
    id: 'menu',
    label: 'Menu',
    icon: '☷',
  },
  {
    id: 'tables',
    label: 'Tables',
    icon: '▦',
  },
];

function formatStatus(status: string) {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCurrency(amount: number | null | undefined) {
  const value = Number(amount ?? 0);

  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'CREATED':
      return 'bg-blue-50 text-blue-700 border-blue-100';

    case 'CONFIRMED':
      return 'bg-indigo-50 text-indigo-700 border-indigo-100';

    case 'PREPARING':
      return 'bg-amber-50 text-amber-700 border-amber-100';

    case 'READY':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';

    case 'COMPLETED':
      return 'bg-slate-100 text-slate-700 border-slate-200';

    case 'CANCELLED':
      return 'bg-red-50 text-red-700 border-red-100';

    case 'PAID':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';

    case 'PENDING':
      return 'bg-amber-50 text-amber-700 border-amber-100';

    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

function playNotificationSound() {
  const audio = new Audio('/notification.mp3');
  audio.volume = 1;

  audio.play().catch(() => {
    // Browser may block playback until the user interacts with the page.
  });
}

export default function OwnerDashboard() {
  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeSection, setActiveSection] =
    useState<Section>('dashboard');

  const [ownerOrders, setOwnerOrders] = useState<OwnerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [orderFilter, setOrderFilter] = useState('ALL');

  const [newOrderCount, setNewOrderCount] = useState(0);
  const [showNotification, setShowNotification] =
    useState(false);

  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const notificationInitializedRef = useRef(false);

  const [menuCategories, setMenuCategories] =
    useState<any[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState('');

  const [showCategoryModal, setShowCategoryModal] =
    useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] =
    useState('');
  const [categorySaving, setCategorySaving] =
    useState(false);

  const [showItemModal, setShowItemModal] =
    useState(false);
  const [selectedCategoryId, setSelectedCategoryId] =
    useState('');
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] =
    useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemImageUrl, setItemImageUrl] = useState('');
  const [itemIsVeg, setItemIsVeg] = useState(true);
  const [itemSaving, setItemSaving] = useState(false);
  const [editingItem, setEditingItem] =
    useState<any | null>(null);
  const [editingCategory, setEditingCategory] =
    useState<any | null>(null);

  const [tables, setTables] = useState<any[]>([]);
  const [tablesLoading, setTablesLoading] =
    useState(false);
  const [tablesError, setTablesError] = useState('');
  const [showTableModal, setShowTableModal] =
    useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [tableSaving, setTableSaving] = useState(false);
  const [editingTable, setEditingTable] =
    useState<any | null>(null);
  const [qrTable, setQrTable] = useState<any | null>(null);

  const CUSTOMER_MENU_URL =
    window.location.origin + '/menu';

  // --------------------------------------------------
  // Authentication
  // --------------------------------------------------

  function logout() {
    localStorage.removeItem('dinepilot_token');
    localStorage.removeItem('dinepilot_user');
    window.location.reload();
  }

  // --------------------------------------------------
  // Dashboard
  // --------------------------------------------------

  async function loadDashboard() {
    try {
      setError('');

      const token = localStorage.getItem(
        'dinepilot_token',
      );

      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `${API_URL}/api/owner/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to load dashboard',
        );
      }

      setDashboard(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load dashboard',
      );
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // Orders
  // --------------------------------------------------

  async function loadOwnerOrders(status = 'ALL') {
    try {
      setOrdersLoading(true);
      setOrdersError('');

      const token = localStorage.getItem(
        'dinepilot_token',
      );

      if (!token) {
        throw new Error('Authentication required');
      }

      const url =
        status === 'ALL'
          ? `${API_URL}/api/owner/orders`
          : `${API_URL}/api/owner/orders?status=${status}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to load orders',
        );
      }

      setOwnerOrders(
        Array.isArray(data) ? data : [],
      );
    } catch (err) {
      setOrdersError(
        err instanceof Error
          ? err.message
          : 'Failed to load orders',
      );
    } finally {
      setOrdersLoading(false);
    }
  }

  async function checkForNewOwnerOrders() {
    try {
      const token = localStorage.getItem(
        'dinepilot_token',
      );

      if (!token) return;

      const response = await fetch(
        `${API_URL}/api/owner/orders`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) return;

      const data = await response.json();

      const orders: OwnerOrder[] = Array.isArray(data)
        ? data
        : [];

      const currentOrderIds = new Set(
        orders.map((order) => order.id),
      );

      if (!notificationInitializedRef.current) {
        knownOrderIdsRef.current =
          currentOrderIds;

        notificationInitializedRef.current = true;

        return;
      }

      const newOrders = orders.filter(
        (order) =>
          !knownOrderIdsRef.current.has(order.id) &&
          order.orderStatus === 'CREATED',
      );

      if (newOrders.length > 0) {
        setNewOrderCount(newOrders.length);
        setShowNotification(true);
        playNotificationSound();
      }

      knownOrderIdsRef.current =
        currentOrderIds;
    } catch {
      // Notification polling should never break the dashboard.
    }
  }

  // --------------------------------------------------
  // Menu
  // --------------------------------------------------

  async function loadOwnerMenu() {
    try {
      setMenuLoading(true);
      setMenuError('');

      const token = localStorage.getItem(
        'dinepilot_token',
      );

      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `${API_URL}/api/staff/menu`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to load menu',
        );
      }

      setMenuCategories(
        Array.isArray(data) ? data : [],
      );
    } catch (err) {
      setMenuError(
        err instanceof Error
          ? err.message
          : 'Failed to load menu',
      );
    } finally {
      setMenuLoading(false);
    }
  }

  async function createCategory() {
    try {
      if (!categoryName.trim()) {
        throw new Error(
          'Category name is required',
        );
      }

      setCategorySaving(true);
      setMenuError('');

      const token = localStorage.getItem(
        'dinepilot_token',
      );

      if (!token) {
        throw new Error('Authentication required');
      }

      const isEditing = Boolean(editingCategory);

      const url = isEditing
        ? `${API_URL}/api/staff/menu/categories/${editingCategory.id}`
        : `${API_URL}/api/staff/menu/categories`;

      const response = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: categoryName.trim(),
          description:
            categoryDescription.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            (isEditing
              ? 'Failed to update category'
              : 'Failed to create category'),
        );
      }

      setCategoryName('');
      setCategoryDescription('');
      setEditingCategory(null);
      setShowCategoryModal(false);

      await loadOwnerMenu();
    } catch (err) {
      setMenuError(
        err instanceof Error
          ? err.message
          : 'Failed to save category',
      );
    } finally {
      setCategorySaving(false);
    }
  }

  async function createMenuItem() {
    try {
      if (!selectedCategoryId) {
        throw new Error(
          'Please select a category',
        );
      }

      if (!itemName.trim()) {
        throw new Error(
          'Item name is required',
        );
      }

      const price = Number(itemPrice);

      if (!Number.isFinite(price) || price <= 0) {
        throw new Error('Enter a valid price');
      }

      setItemSaving(true);
      setMenuError('');

      const token = localStorage.getItem(
        'dinepilot_token',
      );

      if (!token) {
        throw new Error('Authentication required');
      }

      const isEditing = Boolean(editingItem);

      const url = isEditing
        ? `${API_URL}/api/staff/menu/items/${editingItem.id}`
        : `${API_URL}/api/staff/menu/items`;

      const response = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          categoryId: selectedCategoryId,
          name: itemName.trim(),
          description:
            itemDescription.trim() || undefined,
          price,
          imageUrl:
            itemImageUrl.trim() || undefined,
          isVeg: itemIsVeg,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            (isEditing
              ? 'Failed to update menu item'
              : 'Failed to create menu item'),
        );
      }

      setItemName('');
      setItemDescription('');
      setItemPrice('');
      setItemImageUrl('');
      setItemIsVeg(true);
      setSelectedCategoryId('');
      setEditingItem(null);
      setShowItemModal(false);

      await loadOwnerMenu();
    } catch (err) {
      setMenuError(
        err instanceof Error
          ? err.message
          : 'Failed to save menu item',
      );
    } finally {
      setItemSaving(false);
    }
  }

  async function toggleCategory(
    category: any,
  ) {
    const confirmed = window.confirm(
      `${category.isActive === false ? 'Activate' : 'Deactivate'} "${category.name}"?`,
    );

    if (!confirmed) return;

    try {
      const token = localStorage.getItem(
        'dinepilot_token',
      );

      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `${API_URL}/api/staff/menu/categories/${category.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            isActive: category.isActive === false,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Failed to update category',
        );
      }

      await loadOwnerMenu();
    } catch (err) {
      setMenuError(
        err instanceof Error
          ? err.message
          : 'Failed to update category',
      );
    }
  }

  async function toggleItemAvailability(
    item: any,
  ) {
    try {
      const token = localStorage.getItem(
        'dinepilot_token',
      );

      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `${API_URL}/api/staff/menu/items/${item.id}/availability`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            isAvailable: !item.isAvailable,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Failed to update availability',
        );
      }

      await loadOwnerMenu();
    } catch (err) {
      setMenuError(
        err instanceof Error
          ? err.message
          : 'Failed to update availability',
      );
    }
  }

  async function deleteMenuItem(item: any) {
    const confirmed = window.confirm(
      `Delete "${item.name}" from the menu?`,
    );

    if (!confirmed) return;

    try {
      const token = localStorage.getItem(
        'dinepilot_token',
      );

      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `${API_URL}/api/staff/menu/items/${item.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Failed to delete menu item',
        );
      }

      await loadOwnerMenu();
    } catch (err) {
      setMenuError(
        err instanceof Error
          ? err.message
          : 'Failed to delete menu item',
      );
    }
  }

  // --------------------------------------------------
  // Tables
  // --------------------------------------------------

  async function loadOwnerTables() {
    try {
      setTablesLoading(true);
      setTablesError('');

      const token = localStorage.getItem(
        'dinepilot_token',
      );

      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `${API_URL}/api/staff/tables`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Failed to load tables',
        );
      }

      setTables(
        Array.isArray(data) ? data : [],
      );
    } catch (err) {
      setTablesError(
        err instanceof Error
          ? err.message
          : 'Failed to load tables',
      );
    } finally {
      setTablesLoading(false);
    }
  }

  async function createTable() {
    try {
      if (!tableNumber.trim()) {
        throw new Error(
          'Table number is required',
        );
      }

      setTableSaving(true);
      setTablesError('');

      const token = localStorage.getItem(
        'dinepilot_token',
      );

      if (!token) {
        throw new Error('Authentication required');
      }

      const isEditing = Boolean(editingTable);

      const url = isEditing
        ? `${API_URL}/api/staff/tables/${editingTable.id}`
        : `${API_URL}/api/staff/tables`;

      const response = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tableNumber: tableNumber.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            (isEditing
              ? 'Failed to update table'
              : 'Failed to create table'),
        );
      }

      setTableNumber('');
      setEditingTable(null);
      setShowTableModal(false);

      await loadOwnerTables();
    } catch (err) {
      setTablesError(
        err instanceof Error
          ? err.message
          : 'Failed to save table',
      );
    } finally {
      setTableSaving(false);
    }
  }

  async function toggleTable(table: any) {
    try {
      const token = localStorage.getItem(
        'dinepilot_token',
      );

      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `${API_URL}/api/staff/tables/${table.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            isActive: !table.isActive,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Failed to update table status',
        );
      }

      await loadOwnerTables();
    } catch (err) {
      setTablesError(
        err instanceof Error
          ? err.message
          : 'Failed to update table status',
      );
    }
  }

  // --------------------------------------------------
  // Effects
  // --------------------------------------------------

  useEffect(() => {
    loadDashboard();

    const interval = window.setInterval(() => {
      loadDashboard();
    }, 10000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (activeSection === 'orders') {
      loadOwnerOrders(orderFilter);
    }
  }, [activeSection, orderFilter]);

  useEffect(() => {
    if (activeSection === 'menu') {
      loadOwnerMenu();
    }

    if (activeSection === 'tables') {
      loadOwnerTables();
    }
  }, [activeSection]);

  useEffect(() => {
    checkForNewOwnerOrders();

    const interval = window.setInterval(() => {
      checkForNewOwnerOrders();
    }, 10000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  // --------------------------------------------------
  // Navigation helper
  // --------------------------------------------------

  function openSection(section: Section) {
    setActiveSection(section);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-5">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-xl font-black text-white shadow-lg">
            D
          </div>

          <div className="mt-5 h-1.5 w-32 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-600" />
          </div>

          <p className="mt-4 text-sm font-medium text-slate-500">
            Loading your restaurant...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-5">
        <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-7 text-center shadow-xl shadow-slate-200/50">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-xl">
            !
          </div>

          <h2 className="mt-5 text-xl font-bold text-slate-900">
            Something went wrong
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[0.98]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      {/* ==================================================
          Desktop Sidebar
      ================================================== */}

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[250px] border-r border-slate-200/80 bg-white lg:flex lg:flex-col">
        <div className="flex h-full flex-col">
          <div className="px-6 pb-5 pt-7">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white shadow-lg shadow-slate-950/10">
                D
              </div>

              <div>
                <p className="text-lg font-black tracking-tight text-slate-950">
                  DinePilot
                </p>

                <p className="text-[11px] font-medium text-slate-400">
                  Run Your Restaurant Smarter
                </p>
              </div>
            </div>
          </div>

          <div className="px-4">
            <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Workspace
            </p>

            <nav className="space-y-1.5">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    openSection(item.id)
                  }
                  className={`group flex w-full items-center justify-between rounded-2xl px-3.5 py-3.5 text-sm font-semibold transition-all duration-200 ${
                    activeSection === item.id
                      ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl text-base ${
                        activeSection === item.id
                          ? 'bg-white/10'
                          : 'bg-slate-100 group-hover:bg-white'
                      }`}
                    >
                      {item.icon}
                    </span>

                    {item.label}
                  </span>

                  {item.id === 'orders' &&
                    newOrderCount > 0 && (
                      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-black text-white">
                        {newOrderCount}
                      </span>
                    )}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-auto p-4">
            <div className="rounded-3xl bg-slate-950 p-4 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Restaurant
              </p>

              <p className="mt-2 truncate text-sm font-bold">
                {dashboard.restaurant?.name ||
                  'My Restaurant'}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Owner account
              </p>

              <button
                type="button"
                onClick={logout}
                className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-white/10"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ==================================================
          Main Shell
      ================================================== */}

      <div className="lg:pl-[250px]">
        {/* Mobile Header / Desktop Top Header */}

        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex min-h-[72px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white lg:hidden">
                D
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-950 sm:text-base">
                  {activeSection === 'dashboard'
                    ? 'Restaurant Overview'
                    : activeSection === 'orders'
                      ? 'Orders'
                      : activeSection === 'menu'
                        ? 'Menu Management'
                        : 'Tables & QR'}
                </p>

                <p className="truncate text-[11px] text-slate-400 sm:text-xs">
                  {dashboard.restaurant?.name ||
                    'My Restaurant'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowNotification(false);
                  setNewOrderCount(0);
                  openSection('orders');
                  setOrderFilter('CREATED');
                }}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg transition hover:bg-slate-50 active:scale-95"
                aria-label="Notifications"
              >
                🔔

                {newOrderCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
                    {newOrderCount}
                  </span>
                )}
              </button>

              <div className="hidden text-right sm:block">
                <p className="text-xs font-bold text-slate-900">
                  Owner
                </p>

                <p className="text-[11px] text-slate-400">
                  Admin account
                </p>
              </div>

              <button
                type="button"
                onClick={logout}
                className="hidden rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 sm:block"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* ==================================================
            Page Content
        ================================================== */}

        <main className="mx-auto w-full max-w-[1500px] px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-10">
          {/* New Order Alert */}

          {showNotification &&
            newOrderCount > 0 && (
              <div className="mb-5 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-xl shadow-blue-100/40">
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl">
                      🔔
                    </div>

                    <div>
                      <p className="text-sm font-black text-slate-950">
                        New order received
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {newOrderCount === 1
                          ? 'A customer just placed a new order.'
                          : `${newOrderCount} new orders have been placed.`}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNotification(false);
                      }}
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 sm:flex-none"
                    >
                      Dismiss
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowNotification(false);
                        setNewOrderCount(0);
                        openSection('orders');
                        setOrderFilter('CREATED');
                      }}
                      className="flex-1 rounded-xl bg-slate-950 px-4 py-3 text-xs font-bold text-white transition hover:bg-slate-800 sm:flex-none"
                    >
                      View Orders
                    </button>
                  </div>
                </div>
              </div>
            )}

          {/* ==================================================
              DASHBOARD
          ================================================== */}

          {activeSection === 'dashboard' && (
            <section className="space-y-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Restaurant is active
                  </div>

                  <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
                    Good to see you.
                  </h1>

                  <p className="mt-1 text-sm text-slate-500 sm:text-base">
                    Here is what is happening at your restaurant.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    openSection('orders')
                  }
                  className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 active:scale-[0.98]"
                >
                  View Orders
                  <span>→</span>
                </button>
              </div>

              {/* Stats */}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard
                  label="Total Orders"
                  value={
                    dashboard.summary.totalOrders
                  }
                  icon="▤"
                />

                <StatCard
                  label="Pending"
                  value={
                    dashboard.summary.pendingOrders
                  }
                  icon="◷"
                  accent="amber"
                />

                <StatCard
                  label="Completed"
                  value={
                    dashboard.summary.completedOrders
                  }
                  icon="✓"
                  accent="green"
                />

                <StatCard
                  label="Today's Revenue"
                  value={formatCurrency(
                    dashboard.summary.todayRevenue,
                  )}
                  icon="₹"
                  accent="blue"
                />

                <StatCard
                  label="Total Revenue"
                  value={formatCurrency(
                    dashboard.summary.totalRevenue,
                  )}
                  icon="↗"
                  accent="purple"
                />
              </div>

              {/* Main Dashboard Cards */}

              <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
                {/* Recent Orders */}

                <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-black text-slate-950 sm:text-lg">
                        Recent Orders
                      </h2>

                      <p className="mt-1 text-xs text-slate-400">
                        Latest activity from your restaurant
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        openSection('orders')
                      }
                      className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                    >
                      View all
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {dashboard.recentOrders
                      .slice(0, 6)
                      .map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 transition hover:border-slate-200 hover:bg-white"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-bold text-slate-900">
                                {order.orderNumber}
                              </p>

                              <span
                                className={`hidden rounded-full border px-2 py-0.5 text-[9px] font-bold sm:inline-flex ${getStatusClasses(
                                  order.orderStatus,
                                )}`}
                              >
                                {formatStatus(
                                  order.orderStatus,
                                )}
                              </span>
                            </div>

                            <p className="mt-1 truncate text-xs text-slate-400">
                              {order.customerName ||
                                'Guest Customer'}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-sm font-black text-slate-950">
                              {formatCurrency(
                                order.totalAmount,
                              )}
                            </p>

                            <p className="mt-1 text-[10px] font-medium text-slate-400">
                              {new Date(
                                order.createdAt,
                              ).toLocaleTimeString(
                                'en-IN',
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                },
                              )}
                            </p>
                          </div>
                        </div>
                      ))}

                    {dashboard.recentOrders.length ===
                      0 && (
                      <EmptyState
                        icon="▤"
                        title="No orders yet"
                        description="New customer orders will appear here."
                      />
                    )}
                  </div>
                </section>

                {/* Top Selling */}

                <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">
                  <div className="mb-5">
                    <h2 className="text-base font-black text-slate-950 sm:text-lg">
                      Top Selling Items
                    </h2>

                    <p className="mt-1 text-xs text-slate-400">
                      Your best-performing menu items
                    </p>
                  </div>

                  <div className="space-y-3">
                    {dashboard.topSellingItems
                      .slice(0, 6)
                      .map((item, index) => (
                        <div
                          key={`${item.itemName}-${index}`}
                          className="flex items-center gap-3"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-500">
                            #{index + 1}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-900">
                              {item.itemName}
                            </p>

                            <p className="mt-1 text-[11px] text-slate-400">
                              {item.quantitySold} sold
                            </p>
                          </div>

                          <p className="text-sm font-black text-slate-900">
                            {formatCurrency(
                              item.revenue,
                            )}
                          </p>
                        </div>
                      ))}

                    {dashboard.topSellingItems.length ===
                      0 && (
                      <EmptyState
                        icon="☷"
                        title="No sales data"
                        description="Your best-selling items will appear here."
                      />
                    )}
                  </div>
                </section>
              </div>
            </section>
          )}

          {/* ==================================================
              ORDERS
          ================================================== */}

          {activeSection === 'orders' && (
            <section>
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="mb-2 inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                    Order management
                  </div>

                  <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    Orders
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    Monitor every order from one place.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Showing
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-900">
                    {ownerOrders.length} orders
                  </p>
                </div>
              </div>

              {/* Filters */}

              <div className="mb-5 -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                <div className="flex w-max gap-2">
                  {orderStatuses.map(
                    (status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() =>
                          setOrderFilter(status)
                        }
                        className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
                          orderFilter === status
                            ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10'
                            : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {formatStatus(status)}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {ordersLoading && (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-44 animate-pulse rounded-3xl bg-white shadow-sm"
                    />
                  ))}
                </div>
              )}

              {ordersError && (
                <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-medium text-red-700">
                  {ordersError}
                </div>
              )}

              {!ordersLoading &&
                !ordersError && (
                  <div className="space-y-4">
                    {ownerOrders.map((order) => (
                      <article
                        key={order.id}
                        className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition duration-200 hover:shadow-md"
                      >
                        {/* Order Header */}

                        <div className="border-b border-slate-100 p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-base font-black text-slate-950 sm:text-lg">
                                  {order.orderNumber}
                                </h2>

                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${getStatusClasses(
                                    order.orderStatus,
                                  )}`}
                                >
                                  {formatStatus(
                                    order.orderStatus,
                                  )}
                                </span>
                              </div>

                              <p className="mt-1 text-xs text-slate-400">
                                {new Date(
                                  order.createdAt,
                                ).toLocaleString(
                                  'en-IN',
                                )}
                              </p>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="text-lg font-black text-slate-950">
                                {formatCurrency(
                                  order.totalAmount,
                                )}
                              </p>

                              <span
                                className={`mt-1 inline-flex rounded-full border px-2 py-1 text-[9px] font-bold ${getStatusClasses(
                                  order.paymentStatus,
                                )}`}
                              >
                                {formatStatus(
                                  order.paymentStatus,
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Customer */}

                        <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
                          <InfoBox
                            label="Customer"
                            value={
                              order.customerName ||
                              'Guest Customer'
                            }
                          />

                          <InfoBox
                            label="Phone"
                            value={
                              order.customerPhone ||
                              'Not provided'
                            }
                          />

                          <InfoBox
                            label="Table"
                            value={
                              order.tableNumber
                                ? `Table ${order.tableNumber}`
                                : 'Not assigned'
                            }
                          />
                        </div>

                        {/* Items */}

                        <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
                          <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">
                            Items
                          </p>

                          <div className="space-y-2">
                            {order.items.map(
                              (item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3.5 py-3"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-slate-900">
                                      {item.itemName}
                                    </p>

                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                      {item.quantity} ×{' '}
                                      {formatCurrency(
                                        item.unitPrice,
                                      )}
                                    </p>
                                  </div>

                                  <p className="shrink-0 text-sm font-black text-slate-900">
                                    {formatCurrency(
                                      item.totalPrice,
                                    )}
                                  </p>
                                </div>
                              ),
                            )}
                          </div>
                        </div>

                        {order.completedBy && (
                          <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
                            <div className="rounded-2xl bg-emerald-50 p-3.5">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                Completed by
                              </p>

                              <p className="mt-1 text-sm font-bold text-emerald-900">
                                {order.completedBy.name}
                              </p>

                              {order.completedAt && (
                                <p className="mt-0.5 text-[11px] text-emerald-700">
                                  {new Date(
                                    order.completedAt,
                                  ).toLocaleString(
                                    'en-IN',
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </article>
                    ))}

                    {ownerOrders.length === 0 && (
                      <EmptyState
                        icon="▤"
                        title="No orders found"
                        description="There are no orders matching this filter."
                      />
                    )}
                  </div>
                )}
            </section>
          )}

          {/* ==================================================
              MENU
          ================================================== */}

          {activeSection === 'menu' && (
            <section>
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="mb-2 inline-flex rounded-full bg-purple-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-700">
                    Menu management
                  </div>

                  <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    Your Menu
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    Manage categories, dishes and availability.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryName('');
                    setCategoryDescription('');
                    setShowCategoryModal(true);
                  }}
                  className="rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 active:scale-[0.98]"
                >
                  + Add Category
                </button>
              </div>

              {menuError && (
                <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {menuError}
                </div>
              )}

              {menuLoading && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-64 animate-pulse rounded-3xl bg-white shadow-sm"
                    />
                  ))}
                </div>
              )}

              {!menuLoading && (
                <div className="space-y-5">
                  {menuCategories.length === 0 ? (
                    <EmptyState
                      icon="☷"
                      title="Your menu is empty"
                      description="Create your first category to start adding dishes."
                      action={
                        <button
                          type="button"
                          onClick={() =>
                            setShowCategoryModal(
                              true,
                            )
                          }
                          className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white"
                        >
                          Create Category
                        </button>
                      }
                    />
                  ) : (
                    menuCategories.map(
                      (category) => (
                        <section
                          key={category.id}
                          className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5"
                        >
                          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-lg font-black text-slate-950">
                                  {category.name}
                                </h2>

                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                                  {category.menuItems
                                    ?.length ??
                                    0}{' '}
                                  items
                                </span>

                                {category.isActive ===
                                  false && (
                                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-600">
                                    Inactive
                                  </span>
                                )}
                              </div>

                              {category.description && (
                                <p className="mt-1 text-xs text-slate-400">
                                  {
                                    category.description
                                  }
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCategoryId(
                                    category.id,
                                  );
                                  setEditingItem(null);
                                  setItemName('');
                                  setItemDescription(
                                    '',
                                  );
                                  setItemPrice('');
                                  setItemImageUrl(
                                    '',
                                  );
                                  setItemIsVeg(true);
                                  setShowItemModal(
                                    true,
                                  );
                                }}
                                className="rounded-xl bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
                              >
                                + Add Item
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategory(
                                    category,
                                  );
                                  setCategoryName(
                                    category.name,
                                  );
                                  setCategoryDescription(
                                    category.description ??
                                      '',
                                  );
                                  setShowCategoryModal(
                                    true,
                                  );
                                }}
                                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  toggleCategory(
                                    category,
                                  )
                                }
                                className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
                              >
                                {category.isActive ===
                                false
                                  ? 'Activate'
                                  : 'Deactivate'}
                              </button>
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {(
                              category.menuItems ??
                              []
                            ).map(
                              (item: any) => (
                                <article
                                  key={item.id}
                                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                                >
                                  {item.imageUrl ? (
                                    <img
                                      src={
                                        item.imageUrl
                                      }
                                      alt={
                                        item.name
                                      }
                                      className="h-44 w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-44 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50 text-3xl text-slate-300">
                                      🍽️
                                    </div>
                                  )}

                                  <div className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <h3 className="truncate text-sm font-black text-slate-950">
                                          {item.name}
                                        </h3>

                                        {item.description && (
                                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                                            {
                                              item.description
                                            }
                                          </p>
                                        )}
                                      </div>

                                      <p className="shrink-0 text-sm font-black text-slate-950">
                                        ₹
                                        {Number(
                                          item.price,
                                        ).toFixed(
                                          2,
                                        )}
                                      </p>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-1.5">
                                      <span
                                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                          item.isVeg
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'bg-red-50 text-red-700'
                                        }`}
                                      >
                                        {item.isVeg
                                          ? '● Veg'
                                          : '● Non-Veg'}
                                      </span>

                                      <span
                                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                          item.isAvailable
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'bg-slate-100 text-slate-500'
                                        }`}
                                      >
                                        {item.isAvailable
                                          ? 'Available'
                                          : 'Unavailable'}
                                      </span>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedCategoryId(
                                            category.id,
                                          );
                                          setEditingItem(
                                            item,
                                          );
                                          setItemName(
                                            item.name,
                                          );
                                          setItemDescription(
                                            item.description ??
                                              '',
                                          );
                                          setItemPrice(
                                            String(
                                              item.price,
                                            ),
                                          );
                                          setItemImageUrl(
                                            item.imageUrl ??
                                              '',
                                          );
                                          setItemIsVeg(
                                            item.isVeg,
                                          );
                                          setShowItemModal(
                                            true,
                                          );
                                        }}
                                        className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                                      >
                                        Edit
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleItemAvailability(
                                            item,
                                          )
                                        }
                                        className={`rounded-xl px-3 py-2.5 text-xs font-bold ${
                                          item.isAvailable
                                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                        }`}
                                      >
                                        {item.isAvailable
                                          ? 'Disable'
                                          : 'Enable'}
                                      </button>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        deleteMenuItem(
                                          item,
                                        )
                                      }
                                      className="mt-2 w-full rounded-xl bg-red-50 px-3 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
                                    >
                                      Delete Item
                                    </button>
                                  </div>
                                </article>
                              ),
                            )}
                          </div>
                        </section>
                      ),
                    )
                  )}
                </div>
              )}
            </section>
          )}

          {/* ==================================================
              TABLES
          ================================================== */}

          {activeSection === 'tables' && (
            <section>
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="mb-2 inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    QR table management
                  </div>

                  <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    Tables
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    Manage tables and customer QR codes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingTable(null);
                    setTableNumber('');
                    setShowTableModal(true);
                  }}
                  className="rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 active:scale-[0.98]"
                >
                  + Add Table
                </button>
              </div>

              {tablesError && (
                <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {tablesError}
                </div>
              )}

              {tablesLoading && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[1, 2, 3, 4].map(
                    (item) => (
                      <div
                        key={item}
                        className="h-80 animate-pulse rounded-3xl bg-white shadow-sm"
                      />
                    ),
                  )}
                </div>
              )}

              {!tablesLoading && (
                <>
                  {tables.length === 0 ? (
                    <EmptyState
                      icon="▦"
                      title="No tables yet"
                      description="Add your restaurant tables to generate customer QR codes."
                      action={
                        <button
                          type="button"
                          onClick={() =>
                            setShowTableModal(
                              true,
                            )
                          }
                          className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white"
                        >
                          Add First Table
                        </button>
                      }
                    />
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      {tables.map((table) => {
                        const tableUrl =
                          `${CUSTOMER_MENU_URL}?table=${encodeURIComponent(
                            table.tableNumber,
                          )}`;

                        return (
                          <article
                            key={table.id}
                            className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-5"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                  Table
                                </p>

                                <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                                  {table.tableNumber}
                                </h2>
                              </div>

                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                  table.isActive
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-red-50 text-red-600'
                                }`}
                              >
                                {table.isActive
                                  ? 'Active'
                                  : 'Inactive'}
                              </span>
                            </div>

                            <div className="mt-4 flex items-center justify-center rounded-2xl bg-slate-50 p-5">
                              <QRCodeSVG
                                id={`table-qr-${table.id}`}
                                value={tableUrl}
                                size={150}
                                level="M"
                                includeMargin
                              />
                            </div>

                            <p className="mt-3 text-center text-[10px] font-medium text-slate-400">
                              Scan to open restaurant menu
                            </p>

                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTable(
                                    table,
                                  );
                                  setTableNumber(
                                    table.tableNumber,
                                  );
                                  setShowTableModal(
                                    true,
                                  );
                                }}
                                className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  toggleTable(
                                    table,
                                  )
                                }
                                className={`rounded-xl px-3 py-2.5 text-xs font-bold ${
                                  table.isActive
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                {table.isActive
                                  ? 'Deactivate'
                                  : 'Activate'}
                              </button>
                            </div>

                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setQrTable(table)
                                }
                                className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                              >
                                View QR
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const svg =
                                    document.getElementById(
                                      `table-qr-${table.id}`,
                                    );

                                  if (!svg) return;

                                  const serializer =
                                    new XMLSerializer();

                                  const source =
                                    serializer.serializeToString(
                                      svg,
                                    );

                                  const blob =
                                    new Blob(
                                      [source],
                                      {
                                        type: 'image/svg+xml;charset=utf-8',
                                      },
                                    );

                                  const url =
                                    URL.createObjectURL(
                                      blob,
                                    );

                                  const link =
                                    document.createElement(
                                      'a',
                                    );

                                  link.href = url;

                                  link.download = `table-${table.tableNumber}-qr.svg`;

                                  link.click();

                                  URL.revokeObjectURL(
                                    url,
                                  );
                                }}
                                className="rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
                              >
                                Download
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </section>
          )}
        </main>
      </div>

      {/* ==================================================
          Mobile Bottom Navigation
      ================================================== */}

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                openSection(item.id)
              }
              className={`relative flex min-h-[58px] flex-col items-center justify-center rounded-2xl text-[10px] font-bold transition ${
                activeSection === item.id
                  ? 'bg-slate-950 text-white'
                  : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              <span className="text-lg leading-none">
                {item.icon}
              </span>

              <span className="mt-1">
                {item.label}
              </span>

              {item.id === 'orders' &&
                newOrderCount > 0 && (
                  <span className="absolute right-3 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-black text-white">
                    {newOrderCount}
                  </span>
                )}
            </button>
          ))}
        </div>
      </nav>

      {/* ==================================================
          Category Modal
      ================================================== */}

      {showCategoryModal && (
        <ModalOverlay
          onClose={() => {
            if (categorySaving) return;

            setShowCategoryModal(false);
            setEditingCategory(null);
            setCategoryName('');
            setCategoryDescription('');
          }}
        >
          <div className="flex max-h-[90vh] flex-col">
            <ModalHeader
              title={
                editingCategory
                  ? 'Edit Category'
                  : 'Add Category'
              }
              description={
                editingCategory
                  ? 'Update your menu category.'
                  : 'Create a new category for your menu.'
              }
              onClose={() => {
                if (categorySaving) return;

                setShowCategoryModal(false);
                setEditingCategory(null);
                setCategoryName('');
                setCategoryDescription('');
              }}
            />

            <div className="overflow-y-auto p-5 sm:p-6">
              <div className="space-y-4">
                <Field
                  label="Category Name"
                  required
                >
                  <input
                    type="text"
                    value={categoryName}
                    onChange={(event) =>
                      setCategoryName(
                        event.target.value,
                      )
                    }
                    placeholder="e.g. Starters"
                    className={inputClass}
                  />
                </Field>

                <Field label="Description">
                  <textarea
                    value={categoryDescription}
                    onChange={(event) =>
                      setCategoryDescription(
                        event.target.value,
                      )
                    }
                    placeholder="e.g. Delicious starters"
                    rows={4}
                    className={`${inputClass} resize-none`}
                  />
                </Field>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={categorySaving}
                  onClick={() => {
                    setShowCategoryModal(
                      false,
                    );
                    setEditingCategory(null);
                    setCategoryName('');
                    setCategoryDescription('');
                  }}
                  className="rounded-2xl border border-slate-200 px-4 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    categorySaving ||
                    !categoryName.trim()
                  }
                  onClick={createCategory}
                  className="rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {categorySaving
                    ? 'Saving...'
                    : editingCategory
                      ? 'Save Changes'
                      : 'Add Category'}
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ==================================================
          Menu Item Modal
      ================================================== */}

      {showItemModal && (
        <ModalOverlay
          onClose={() => {
            if (itemSaving) return;
            setShowItemModal(false);
            setEditingItem(null);
          }}
        >
          <div className="flex max-h-[92vh] flex-col">
            <ModalHeader
              title={
                editingItem
                  ? 'Edit Menu Item'
                  : 'Add Menu Item'
              }
              description={
                editingItem
                  ? 'Update the dish details.'
                  : 'Add a new dish to your menu.'
              }
              onClose={() => {
                if (itemSaving) return;
                setShowItemModal(false);
                setEditingItem(null);
              }}
            />

            <div className="overflow-y-auto p-5 sm:p-6">
              <div className="space-y-4">
                <Field label="Category" required>
                  <select
                    value={selectedCategoryId}
                    onChange={(event) =>
                      setSelectedCategoryId(
                        event.target.value,
                      )
                    }
                    className={inputClass}
                  >
                    <option value="">
                      Select category
                    </option>

                    {menuCategories.map(
                      (category) => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <Field label="Item Name" required>
                  <input
                    type="text"
                    value={itemName}
                    onChange={(event) =>
                      setItemName(
                        event.target.value,
                      )
                    }
                    placeholder="e.g. Chicken Biryani"
                    className={inputClass}
                  />
                </Field>

                <Field label="Description">
                  <textarea
                    value={itemDescription}
                    onChange={(event) =>
                      setItemDescription(
                        event.target.value,
                      )
                    }
                    placeholder="Describe the dish"
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </Field>

                <Field label="Price" required>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      ₹
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={itemPrice}
                      onChange={(event) =>
                        setItemPrice(
                          event.target.value,
                        )
                      }
                      placeholder="220"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </Field>

                <Field label="Image URL">
                  <input
                    type="url"
                    value={itemImageUrl}
                    onChange={(event) =>
                      setItemImageUrl(
                        event.target.value,
                      )
                    }
                    placeholder="https://..."
                    className={inputClass}
                  />
                </Field>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Vegetarian
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Mark this item as vegetarian.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setItemIsVeg(
                        (value) => !value,
                      )
                    }
                    className={`relative h-7 w-12 rounded-full transition ${
                      itemIsVeg
                        ? 'bg-emerald-500'
                        : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                        itemIsVeg
                          ? 'left-6'
                          : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={itemSaving}
                  onClick={() =>
                    setShowItemModal(false)
                  }
                  className="rounded-2xl border border-slate-200 px-4 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={itemSaving}
                  onClick={createMenuItem}
                  className="rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {itemSaving
                    ? 'Saving...'
                    : editingItem
                      ? 'Save Changes'
                      : 'Add Item'}
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ==================================================
          Table Modal
      ================================================== */}

      {showTableModal && (
        <ModalOverlay
          onClose={() => {
            if (tableSaving) return;
            setShowTableModal(false);
            setEditingTable(null);
            setTableNumber('');
          }}
        >
          <div>
            <ModalHeader
              title={
                editingTable
                  ? 'Edit Table'
                  : 'Add Table'
              }
              description={
                editingTable
                  ? 'Update the table number.'
                  : 'Add a table to your restaurant.'
              }
              onClose={() => {
                if (tableSaving) return;
                setShowTableModal(false);
                setEditingTable(null);
                setTableNumber('');
              }}
            />

            <div className="p-5 sm:p-6">
              <Field label="Table Number" required>
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(event) =>
                    setTableNumber(
                      event.target.value,
                    )
                  }
                  placeholder="e.g. 1"
                  className={`${inputClass} text-lg font-bold`}
                />
              </Field>

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={tableSaving}
                  onClick={() => {
                    setShowTableModal(false);
                    setEditingTable(null);
                    setTableNumber('');
                  }}
                  className="rounded-2xl border border-slate-200 px-4 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    tableSaving ||
                    !tableNumber.trim()
                  }
                  onClick={createTable}
                  className="rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {tableSaving
                    ? 'Saving...'
                    : editingTable
                      ? 'Save Changes'
                      : 'Add Table'}
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ==================================================
          QR Modal
      ================================================== */}

      {qrTable && (
        <ModalOverlay
          onClose={() => setQrTable(null)}
        >
          <div>
            <ModalHeader
              title={`Table ${qrTable.tableNumber}`}
              description="Customers can scan this QR to open your menu."
              onClose={() =>
                setQrTable(null)
              }
            />

            <div className="p-5 sm:p-6">
              <div className="flex justify-center rounded-3xl bg-slate-50 p-6 sm:p-8">
                <QRCodeSVG
                  value={`${CUSTOMER_MENU_URL}?table=${encodeURIComponent(
                    qrTable.tableNumber,
                  )}`}
                  size={260}
                  level="M"
                  includeMargin
                />
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                <p className="break-all text-center text-[10px] leading-5 text-slate-400">
                  {CUSTOMER_MENU_URL}?table=
                  {encodeURIComponent(
                    qrTable.tableNumber,
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setQrTable(null)
                }
                className="mt-4 w-full rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

/* ======================================================
   Reusable Components
====================================================== */

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-slate-400 focus:ring-4 focus:ring-slate-100';

function StatCard({
  label,
  value,
  icon,
  accent = 'slate',
}: {
  label: string;
  value: string | number;
  icon: string;
  accent?: 'slate' | 'amber' | 'green' | 'blue' | 'purple';
}) {
  const accentClasses = {
    slate: 'bg-slate-100 text-slate-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
  };

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black ${accentClasses[accent]}`}
        >
          {icon}
        </div>

        <span className="hidden text-[9px] font-bold uppercase tracking-wider text-slate-300 sm:block">
          DinePilot
        </span>
      </div>

      <p className="mt-4 text-[11px] font-semibold text-slate-400 sm:text-xs">
        {label}
      </p>

      <p className="mt-1 break-words text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3.5">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center sm:p-12">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-400">
        {icon}
      </div>

      <h3 className="mt-4 text-base font-black text-slate-900">
        {title}
      </h3>

      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-400">
        {description}
      </p>

      {action && (
        <div className="mt-5 flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}

function ModalOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[94vh] w-full overflow-hidden rounded-t-[2rem] bg-white shadow-2xl shadow-slate-950/30 sm:max-w-lg sm:rounded-[2rem]">
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />

        {children}
      </div>
    </div>
  );
}

function ModalHeader({
  title,
  description,
  onClose,
}: {
  title: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-black tracking-tight text-slate-950">
          {title}
        </h2>

        <p className="mt-1 text-xs leading-5 text-slate-400">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg text-slate-500 transition hover:bg-slate-200"
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
}