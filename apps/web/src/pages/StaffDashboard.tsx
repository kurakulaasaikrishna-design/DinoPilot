import { useEffect, useRef, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

type OrderStatus =
  | 'CREATED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED';

type OrderItem = {
  id: string;
  itemName: string;
  unitPrice: string;
  quantity: number;
  totalPrice: string;
};

type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  paymentStatus: string;
  orderStatus: OrderStatus;
  tableNumber: string | null;
  createdAt: string;
  items: OrderItem[];
};

const statusFilters: Array<{
  label: string;
  value: OrderStatus | 'ALL';
}> = [
  { label: 'All', value: 'ALL' },
  { label: 'New', value: 'CREATED' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Preparing', value: 'PREPARING' },
  { label: 'Ready', value: 'READY' },
  { label: 'Completed', value: 'COMPLETED' },
];

function getNextStatus(status: OrderStatus): OrderStatus | null {
  const nextStatus: Record<string, OrderStatus> = {
    CREATED: 'CONFIRMED',
    CONFIRMED: 'PREPARING',
    PREPARING: 'READY',
    READY: 'COMPLETED',
  };

  return nextStatus[status] ?? null;
}

function getActionLabel(status: OrderStatus) {
  const labels: Record<string, string> = {
    CREATED: 'Confirm Order',
    CONFIRMED: 'Start Preparing',
    PREPARING: 'Mark Ready',
    READY: 'Complete Order',
  };

  return labels[status] ?? '';
}

function getStatusStyle(status: OrderStatus) {
  switch (status) {
    case 'CREATED':
      return {
        label: 'New',
        dot: 'bg-blue-500',
        badge: 'bg-blue-50 text-blue-700 border-blue-100',
      };

    case 'CONFIRMED':
      return {
        label: 'Confirmed',
        dot: 'bg-indigo-500',
        badge: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      };

    case 'PREPARING':
      return {
        label: 'Preparing',
        dot: 'bg-amber-500',
        badge: 'bg-amber-50 text-amber-700 border-amber-100',
      };

    case 'READY':
      return {
        label: 'Ready',
        dot: 'bg-emerald-500',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      };

    case 'COMPLETED':
      return {
        label: 'Completed',
        dot: 'bg-slate-400',
        badge: 'bg-slate-100 text-slate-600 border-slate-200',
      };

    case 'CANCELLED':
      return {
        label: 'Cancelled',
        dot: 'bg-red-500',
        badge: 'bg-red-50 text-red-700 border-red-100',
      };

    case 'REFUNDED':
      return {
        label: 'Refunded',
        dot: 'bg-purple-500',
        badge: 'bg-purple-50 text-purple-700 border-purple-100',
      };

    case 'PAID':
      return {
        label: 'Paid',
        dot: 'bg-green-500',
        badge: 'bg-green-50 text-green-700 border-green-100',
      };

    default:
      return {
        label: status,
        dot: 'bg-slate-400',
        badge: 'bg-slate-100 text-slate-600 border-slate-200',
      };
  }
}

function formatOrderNumber(orderNumber: string) {
  if (!orderNumber) return 'Order';

  const parts = orderNumber.split('-');

  if (parts.length >= 3) {
    return `#${parts[parts.length - 1]}`;
  }

  return `#${orderNumber}`;
}

function formatTime(dateString: string) {
  try {
    return new Date(dateString).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function StaffDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);

  const [activeFilter, setActiveFilter] =
    useState<OrderStatus | 'ALL'>('ALL');

  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] =
    useState<string | null>(null);

  const [error, setError] = useState('');

  const [tableInputs, setTableInputs] =
    useState<Record<string, string>>({});

  const [assigningTableId, setAssigningTableId] =
    useState<string | null>(null);

  const [editingTableId, setEditingTableId] =
    useState<string | null>(null);

  const [newOrderCount, setNewOrderCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);

  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const notificationInitializedRef = useRef(false);
  const notificationPollingStartedRef = useRef(false);

  function playNotificationSound() {
    const audio = new Audio('/notification.mp3');
    audio.volume = 1.0;

    audio.play().catch(() => {
      // Browser autoplay restrictions are ignored intentionally.
    });
  }

  async function loadOrders() {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('dinepilot_token');

      if (!token) {
        throw new Error('Authentication required');
      }

      const url =
        activeFilter === 'ALL'
          ? `${API_URL}/api/staff/orders`
          : `${API_URL}/api/staff/orders?status=${activeFilter}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load orders');
      }

      const data = await response.json();

      setOrders(
        Array.isArray(data)
          ? data
          : data.value ?? [],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load orders',
      );
    } finally {
      setLoading(false);
    }
  }

  async function checkForNewOrders() {
    try {
      const token = localStorage.getItem('dinepilot_token');

      if (!token) return;

      const response = await fetch(
        `${API_URL}/api/staff/orders`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) return;

      const data = await response.json();

      const allOrders: Order[] = Array.isArray(data)
        ? data
        : data.value ?? [];

      const currentOrderIds = new Set(
        allOrders.map((order) => order.id),
      );

      if (!notificationInitializedRef.current) {
        knownOrderIdsRef.current = currentOrderIds;
        notificationInitializedRef.current = true;
        return;
      }

      const newOrders = allOrders.filter(
        (order) =>
          !knownOrderIdsRef.current.has(order.id) &&
          order.orderStatus === 'CREATED',
      );

      if (newOrders.length > 0) {
        setNewOrderCount(newOrders.length);
        setShowNotification(true);
        playNotificationSound();
      }

      knownOrderIdsRef.current = currentOrderIds;
    } catch {
      // Notification polling should never break the dashboard.
    }
  }

  async function updateStatus(
    orderId: string,
    status: OrderStatus,
  ) {
    try {
      setUpdatingOrderId(orderId);
      setError('');

      const token = localStorage.getItem('dinepilot_token');

      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `${API_URL}/api/staff/orders/${orderId}/status`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to update order');
      }

      await loadOrders();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to update order',
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function assignTable(orderId: string) {
    try {
      setAssigningTableId(orderId);
      setError('');

      const token = localStorage.getItem('dinepilot_token');

      if (!token) {
        throw new Error('Authentication required');
      }

      const tableNumber =
        tableInputs[orderId]?.trim();

      if (!tableNumber) {
        throw new Error('Enter a table number');
      }

      const response = await fetch(
        `${API_URL}/api/staff/orders/${orderId}/assign-table`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tableNumber,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to assign table',
        );
      }

      setTableInputs((current) => ({
        ...current,
        [orderId]: '',
      }));

      setEditingTableId(null);

      await loadOrders();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to assign table',
      );
    } finally {
      setAssigningTableId(null);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [activeFilter]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadOrders();
    }, 10000);

    return () => {
      window.clearInterval(interval);
    };
  }, [activeFilter]);

  useEffect(() => {
    if (notificationPollingStartedRef.current) {
      return;
    }

    notificationPollingStartedRef.current = true;

    checkForNewOrders();

    const interval = window.setInterval(() => {
      checkForNewOrders();
    }, 10000);

    return () => {
      window.clearInterval(interval);
      notificationPollingStartedRef.current = false;
    };
  }, []);

  const newOrders = orders.filter(
    (order) => order.orderStatus === 'CREATED',
  ).length;

  const preparingOrders = orders.filter(
    (order) => order.orderStatus === 'PREPARING',
  ).length;

  const readyOrders = orders.filter(
    (order) => order.orderStatus === 'READY',
  ).length;

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-900">

      {/* ================================================= */}
      {/* MOBILE / DESKTOP HEADER */}
      {/* ================================================= */}

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
              <span className="text-lg font-black">
                D
              </span>
            </div>

            <div>
              <h1 className="text-[17px] font-extrabold tracking-tight text-slate-950">
                DinePilot
              </h1>

              <p className="hidden text-xs font-medium text-slate-400 sm:block">
                Run Your Restaurant Smarter
              </p>

              <p className="text-[11px] font-medium text-slate-400 sm:hidden">
                Staff
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">

            <button
              type="button"
              onClick={() => {
                if (newOrderCount > 0) {
                  setShowNotification(true);
                }
              }}
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition active:scale-95 ${
                showNotification
                  ? 'border-blue-200 bg-blue-50 text-blue-600'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
              aria-label="Notifications"
            >
              <span className="text-lg">🔔</span>

              {newOrderCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                  {newOrderCount}
                </span>
              )}
            </button>

            <div className="hidden h-9 items-center gap-2 rounded-xl bg-slate-100 px-3 sm:flex">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-[10px] font-bold text-slate-700 shadow-sm">
                S
              </div>

              <span className="text-xs font-bold text-slate-600">
                Staff
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('dinepilot_token');
                localStorage.removeItem('dinepilot_user');
                window.location.reload();
              }}
              className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 sm:block"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ================================================= */}
      {/* MAIN */}
      {/* ================================================= */}

      <main className="mx-auto w-full max-w-[1600px] px-4 pb-28 pt-5 sm:px-6 sm:pb-10 sm:pt-7 lg:px-8">

        {/* ================================================= */}
        {/* WELCOME / SUMMARY */}
        {/* ================================================= */}

        <section className="mb-6">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                Restaurant Operations
              </p>

              <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Orders
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage today's incoming orders.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:flex">

              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  New
                </p>

                <p className="mt-0.5 text-lg font-black text-blue-600">
                  {newOrders}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Cooking
                </p>

                <p className="mt-0.5 text-lg font-black text-amber-600">
                  {preparingOrders}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Ready
                </p>

                <p className="mt-0.5 text-lg font-black text-emerald-600">
                  {readyOrders}
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ================================================= */}
        {/* NEW ORDER ALERT */}
        {/* ================================================= */}

        {showNotification && newOrderCount > 0 && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-white shadow-sm">

            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200">
                  🔔
                </div>

                <div>
                  <p className="text-sm font-extrabold text-slate-950">
                    New order received
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {newOrderCount === 1
                      ? 'A new customer order is waiting.'
                      : `${newOrderCount} new customer orders are waiting.`}
                  </p>
                </div>

              </div>

              <button
                type="button"
                onClick={() => {
                  setShowNotification(false);
                  setNewOrderCount(0);
                  setActiveFilter('CREATED');
                }}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 active:scale-[0.98] sm:w-auto"
              >
                View New Orders
              </button>

            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* FILTERS */}
        {/* ================================================= */}

        <div className="mb-5">

          <div className="-mx-4 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0">
            <div className="flex min-w-max gap-2">

              {statusFilters.map((filter) => {
                const active =
                  activeFilter === filter.value;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() =>
                      setActiveFilter(filter.value)
                    }
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all active:scale-[0.97] ${
                      active
                        ? 'bg-slate-950 text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {filter.label}

                    {filter.value === 'CREATED' &&
                      newOrderCount > 0 && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                            active
                              ? 'bg-white text-slate-950'
                              : 'bg-red-500 text-white'
                          }`}
                        >
                          {newOrderCount}
                        </span>
                      )}
                  </button>
                );
              })}

            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* ERROR */}
        {/* ================================================= */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span className="mt-0.5">⚠️</span>

            <div>
              <p className="font-bold">
                Something went wrong
              </p>

              <p className="mt-0.5 text-xs text-red-600">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* LOADING */}
        {/* ================================================= */}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-3xl border border-slate-200 bg-white p-5"
              >
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <div className="h-3 w-20 rounded bg-slate-200" />
                    <div className="h-5 w-32 rounded bg-slate-200" />
                  </div>

                  <div className="h-7 w-20 rounded-full bg-slate-200" />
                </div>

                <div className="mt-6 h-16 rounded-2xl bg-slate-100" />

                <div className="mt-5 space-y-3">
                  <div className="h-4 rounded bg-slate-100" />
                  <div className="h-4 w-3/4 rounded bg-slate-100" />
                </div>

                <div className="mt-6 h-11 rounded-xl bg-slate-200" />
              </div>
            ))}

          </div>
        ) : orders.length === 0 ? (

          /* ================================================= */
          /* EMPTY STATE */
          /* ================================================= */

          <div className="flex min-h-[380px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 text-center">

            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              🍽️
            </div>

            <h3 className="mt-5 text-lg font-black text-slate-900">
              No orders found
            </h3>

            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
              Orders matching this filter will appear here automatically.
            </p>

          </div>

        ) : (

          /* ================================================= */
          /* ORDER GRID */
          /* ================================================= */

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">

            {orders.map((order) => {
              const nextStatus =
                getNextStatus(order.orderStatus);

              const status =
                getStatusStyle(order.orderStatus);

              const isNew =
                order.orderStatus === 'CREATED';

              return (
                <article
                  key={order.id}
                  className={`group relative overflow-hidden rounded-3xl border bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                    isNew
                      ? 'border-blue-200 shadow-md shadow-blue-100/60'
                      : 'border-slate-200 shadow-sm'
                  }`}
                >

                  {/* New order accent */}
                  {isNew && (
                    <div className="absolute inset-x-0 top-0 h-1 bg-blue-600" />
                  )}

                  <div className="p-4 sm:p-5">

                    {/* ======================================= */}
                    {/* ORDER HEADER */}
                    {/* ======================================= */}

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <div className="flex items-center gap-2">

                          <span className="text-sm font-black text-slate-950">
                            {formatOrderNumber(
                              order.orderNumber,
                            )}
                          </span>

                          {isNew && (
                            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                              New
                            </span>
                          )}

                        </div>

                        <h3 className="mt-1 truncate text-base font-extrabold text-slate-900">
                          {order.customerName}
                        </h3>

                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {formatTime(order.createdAt)}
                        </p>

                      </div>

                      <span
                        className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold ${status.badge}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                        />

                        {status.label}
                      </span>

                    </div>

                    {/* ======================================= */}
                    {/* TABLE */}
                    {/* ======================================= */}

                    <div className="mt-4 rounded-2xl bg-slate-50 p-3">

                      <div className="flex items-center justify-between">

                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                            Table
                          </p>

                          {order.tableNumber &&
                          editingTableId !== order.id ? (
                            <p className="mt-1 text-sm font-extrabold text-slate-900">
                              Table {order.tableNumber}
                            </p>
                          ) : (
                            <p className="mt-1 text-sm font-semibold text-slate-400">
                              No table assigned
                            </p>
                          )}
                        </div>

                        {order.tableNumber &&
                        editingTableId !== order.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTableId(order.id);

                              setTableInputs(
                                (current) => ({
                                  ...current,
                                  [order.id]:
                                    order.tableNumber ?? '',
                                }),
                              );
                            }}
                            className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-blue-600 transition hover:bg-white"
                          >
                            Change
                          </button>
                        ) : null}

                      </div>

                      {(!order.tableNumber ||
                        editingTableId === order.id) && (
                        <div className="mt-3 flex gap-2">

                          <input
                            type="text"
                            value={
                              tableInputs[order.id] ?? ''
                            }
                            onChange={(event) =>
                              setTableInputs(
                                (current) => ({
                                  ...current,
                                  [order.id]:
                                    event.target.value,
                                }),
                              )
                            }
                            placeholder="Table number"
                            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              assignTable(order.id)
                            }
                            disabled={
                              assigningTableId ===
                              order.id
                            }
                            className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {assigningTableId ===
                            order.id
                              ? '...'
                              : 'Assign'}
                          </button>

                          {order.tableNumber && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTableId(null);

                                setTableInputs(
                                  (current) => ({
                                    ...current,
                                    [order.id]: '',
                                  }),
                                );
                              }}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-500"
                            >
                              ×
                            </button>
                          )}

                        </div>
                      )}

                    </div>

                    {/* ======================================= */}
                    {/* ITEMS */}
                    {/* ======================================= */}

                    <div className="mt-5">

                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                          Order Items
                        </p>

                        <span className="text-[10px] font-bold text-slate-400">
                          {order.items.length}{' '}
                          {order.items.length === 1
                            ? 'item'
                            : 'items'}
                        </span>
                      </div>

                      <div className="space-y-3">

                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-start justify-between gap-3"
                          >

                            <div className="min-w-0">

                              <p className="truncate text-sm font-bold text-slate-800">
                                {item.itemName}
                              </p>

                              <p className="mt-0.5 text-[11px] text-slate-400">
                                ₹{item.unitPrice} ×{' '}
                                {item.quantity}
                              </p>

                            </div>

                            <p className="shrink-0 text-sm font-extrabold text-slate-900">
                              ₹{item.totalPrice}
                            </p>

                          </div>
                        ))}

                      </div>
                    </div>

                    {/* ======================================= */}
                    {/* TOTAL */}
                    {/* ======================================= */}

                    <div className="mt-5 border-t border-slate-100 pt-4">

                      <div className="flex items-end justify-between">

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Total
                          </p>

                          <p className="mt-0.5 text-xl font-black tracking-tight text-slate-950">
                            ₹{order.totalAmount}
                          </p>
                        </div>

                        <div className="text-right">

                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Payment
                          </p>

                          <p
                            className={`mt-0.5 text-xs font-bold ${
                              order.paymentStatus === 'PAID'
                                ? 'text-emerald-600'
                                : 'text-amber-600'
                            }`}
                          >
                            {order.paymentStatus}
                          </p>

                        </div>

                      </div>
                    </div>

                    {/* ======================================= */}
                    {/* ACTION */}
                    {/* ======================================= */}

                    {nextStatus && (
                      <button
                        type="button"
                        disabled={
                          updatingOrderId === order.id
                        }
                        onClick={() =>
                          updateStatus(
                            order.id,
                            nextStatus,
                          )
                        }
                        className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-extrabold text-white shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                          isNew
                            ? 'bg-blue-600 shadow-blue-100 hover:bg-blue-700'
                            : order.orderStatus ===
                                'PREPARING'
                              ? 'bg-amber-500 shadow-amber-100 hover:bg-amber-600'
                              : order.orderStatus ===
                                  'READY'
                                ? 'bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700'
                                : 'bg-slate-950 shadow-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {updatingOrderId === order.id ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            Updating...
                          </>
                        ) : (
                          <>
                            {getActionLabel(
                              order.orderStatus,
                            )}

                            <span>→</span>
                          </>
                        )}
                      </button>
                    )}

                  </div>
                </article>
              );
            })}

          </div>
        )}

      </main>

      {/* ================================================= */}
      {/* MOBILE BOTTOM NAVIGATION */}
      {/* ================================================= */}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl sm:hidden">

        <div className="mx-auto grid max-w-md grid-cols-4">

          <button
            type="button"
            onClick={() => setActiveFilter('ALL')}
            className={`flex flex-col items-center gap-1 rounded-xl py-2 transition ${
              activeFilter === 'ALL'
                ? 'text-blue-600'
                : 'text-slate-400'
            }`}
          >
            <span className="text-lg">⌂</span>
            <span className="text-[10px] font-bold">
              Home
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('CREATED')}
            className={`relative flex flex-col items-center gap-1 rounded-xl py-2 transition ${
              activeFilter === 'CREATED'
                ? 'text-blue-600'
                : 'text-slate-400'
            }`}
          >
            <span className="text-lg">🧾</span>

            {newOrderCount > 0 && (
              <span className="absolute right-[25%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-black text-white">
                {newOrderCount}
              </span>
            )}

            <span className="text-[10px] font-bold">
              New
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('PREPARING')}
            className={`flex flex-col items-center gap-1 rounded-xl py-2 transition ${
              activeFilter === 'PREPARING'
                ? 'text-blue-600'
                : 'text-slate-400'
            }`}
          >
            <span className="text-lg">🔥</span>

            <span className="text-[10px] font-bold">
              Kitchen
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('dinepilot_token');
              localStorage.removeItem('dinepilot_user');
              window.location.reload();
            }}
            className="flex flex-col items-center gap-1 rounded-xl py-2 text-slate-400 transition"
          >
            <span className="text-lg">↪</span>

            <span className="text-[10px] font-bold">
              Logout
            </span>
          </button>

        </div>
      </nav>

    </div>
  );
}
