import { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isVeg: boolean;
  isAvailable: boolean;
};

type Category = {
  id: string;
  name: string;
  description: string | null;
  menuItems: MenuItem[];
};

type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  phone: string | null;
  address: string | null;
  currency: string;
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type CreatedOrder = {
  order?: {
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    subtotal: string;
    taxAmount: string;
    totalAmount: string;
    paymentStatus: string;
    orderStatus: string;
    tableNumber: string | null;
    items: Array<{
      id: string;
      itemName: string;
      unitPrice: string;
      quantity: number;
      totalPrice: string;
    }>;
  };
};

function CustomerMenu() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const params = new URLSearchParams(window.location.search);
  const tableNumber = params.get('table');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [checkoutError, setCheckoutError] = useState('');
  const [orderCreating, setOrderCreating] = useState(false);
  const [createdOrder, setCreatedOrder] =
    useState<CreatedOrder | null>(null);

  const [activeCategory, setActiveCategory] = useState('');

  const currency = restaurant?.currency ?? '₹';

  const availableCategories = useMemo(() => {
    return categories.filter((category) =>
      category.menuItems.some((item) => item.isAvailable),
    );
  }, [categories]);

  const cartItemCount = cart.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  const cartTotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  useEffect(() => {
    async function loadMenu() {
      try {
        setLoading(true);
        setError('');

        const [restaurantResponse, menuResponse] =
          await Promise.all([
            fetch(`${API_URL}/api/restaurant`),
            fetch(`${API_URL}/api/menu`),
          ]);

        const restaurantData = await restaurantResponse.json();
        const menuData = await menuResponse.json();

        if (!restaurantResponse.ok) {
          throw new Error(
            restaurantData.message ||
              'Failed to load restaurant',
          );
        }

        if (!menuResponse.ok) {
          throw new Error(
            menuData.message || 'Failed to load menu',
          );
        }

        setRestaurant(restaurantData);

        const nextCategories = Array.isArray(menuData)
          ? menuData
          : [];

        setCategories(nextCategories);

        const firstCategory = nextCategories.find(
          (category: Category) =>
            category.menuItems?.some(
              (item) => item.isAvailable,
            ),
        );

        if (firstCategory) {
          setActiveCategory(firstCategory.id);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load menu',
        );
      } finally {
        setLoading(false);
      }
    }

    loadMenu();
  }, []);

  function addToCart(item: MenuItem) {
    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (cartItem) => cartItem.id === item.id,
      );

      if (existingItem) {
        return currentCart.map((cartItem) =>
          cartItem.id === item.id
            ? {
                ...cartItem,
                quantity: cartItem.quantity + 1,
              }
            : cartItem,
        );
      }

      return [
        ...currentCart,
        {
          id: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: 1,
        },
      ];
    });
  }

  function updateCartQuantity(
    itemId: string,
    change: number,
  ) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity: item.quantity + change,
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function getItemQuantity(itemId: string) {
    return (
      cart.find((item) => item.id === itemId)?.quantity ?? 0
    );
  }

  function scrollToMenu() {
    const menu = document.getElementById('menu-section');

    if (menu) {
      menu.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }

  function scrollToCategory(categoryId: string) {
    setActiveCategory(categoryId);

    const element = document.getElementById(
      `category-${categoryId}`,
    );

    if (element) {
      const top =
        element.getBoundingClientRect().top +
        window.scrollY -
        125;

      window.scrollTo({
        top,
        behavior: 'smooth',
      });
    }
  }

  function openCheckout() {
    if (cart.length === 0) return;

    setCheckoutError('');
    setShowCart(false);
    setShowCheckout(true);
  }

  async function createOrder() {
    try {
      setCheckoutError('');

      if (!customerName.trim()) {
        setCheckoutError('Please enter your name.');
        return;
      }

      if (!customerPhone.trim()) {
        setCheckoutError(
          'Please enter your phone number.',
        );
        return;
      }

      if (!tableNumber) {
        setCheckoutError(
          'Table number is missing. Please scan the table QR code again.',
        );
        return;
      }

      if (cart.length === 0) {
        setCheckoutError('Your cart is empty.');
        return;
      }

      setOrderCreating(true);

      const response = await fetch(
        `${API_URL}/api/orders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            tableNumber,
            items: cart.map((item) => ({
              menuItemId: item.id,
              quantity: item.quantity,
            })),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to create order',
        );
      }

      setCreatedOrder(data);
      setShowCheckout(false);
      setCart([]);
    } catch (err) {
      setCheckoutError(
        err instanceof Error
          ? err.message
          : 'Failed to create order',
      );
    } finally {
      setOrderCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-6xl px-3 py-3 sm:px-5 sm:py-5">
          <div className="animate-pulse overflow-hidden rounded-[30px] bg-slate-200">
            <div className="h-[70vh] min-h-[520px] max-h-[760px]" />
          </div>

          <div className="mx-auto mt-5 max-w-3xl space-y-4">
            <div className="h-7 w-48 rounded bg-slate-200" />
            <div className="h-4 w-72 rounded bg-slate-200" />

            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-11 w-24 shrink-0 rounded-full bg-slate-200"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-5">
        <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-600">
            !
          </div>

          <h2 className="mt-5 text-xl font-black text-slate-900">
            Unable to load menu
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 w-full rounded-2xl bg-[#172554] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#1e3a8a] active:scale-[0.98]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (createdOrder?.order) {
    const order = createdOrder.order;

    return (
      <div className="min-h-screen bg-[#f7f8fa] px-4 py-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-lg items-center">
          <div className="w-full overflow-hidden rounded-[32px] bg-white shadow-[0_25px_80px_rgba(15,23,42,0.12)]">
            <div className="bg-[#172554] px-6 pb-9 pt-10 text-center text-white">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400 text-3xl font-black">
                  ✓
                </div>
              </div>

              <h1 className="mt-5 text-2xl font-black">
                Order Received
              </h1>

              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-blue-100">
                Your order has been sent to the restaurant.
              </p>
            </div>

            <div className="p-6">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500">
                    Order number
                  </span>

                  <span className="text-right font-black text-slate-900">
                    {order.orderNumber}
                  </span>
                </div>

                {order.tableNumber && (
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                      Table
                    </span>

                    <span className="font-bold text-slate-900">
                      {order.tableNumber}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Order Summary
                </p>

                <div className="mt-4 space-y-4">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="font-bold text-slate-900">
                          {item.itemName}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {item.quantity} × {currency}
                          {Number(item.unitPrice).toFixed(2)}
                        </p>
                      </div>

                      <p className="font-bold text-slate-900">
                        {currency}
                        {Number(item.totalPrice).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600">
                    Total
                  </span>

                  <span className="text-xl font-black text-slate-900">
                    {currency}
                    {Number(order.totalAmount).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-900">
                  Payment
                </p>

                <p className="mt-1 text-sm leading-5 text-amber-700">
                  Your order is received. Payment processing
                  will be available here.
                </p>
              </div>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-6 w-full rounded-2xl bg-[#172554] px-5 py-4 text-sm font-black text-white transition hover:bg-[#1e3a8a] active:scale-[0.98]"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f8fa] pb-28 text-slate-900">

      {/* ================================================= */}
      {/* HERO */}
      {/* ================================================= */}

      <section className="relative px-3 pt-3 sm:px-5 sm:pt-5">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[30px] sm:rounded-[38px]">

          {restaurant?.coverImageUrl ? (
            <img
              src={restaurant.coverImageUrl}
              alt={restaurant.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#172554] via-[#1e3a8a] to-[#020617]" />
          )}

          {/* Hero overlays */}
          <div className="absolute inset-0 bg-black/25" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/80" />

          {/* Decorative glow */}
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="relative flex min-h-[620px] flex-col justify-between p-5 text-white sm:min-h-[680px] sm:p-8 md:p-12 lg:min-h-[720px]">

            {/* Top bar */}
            <div className="flex items-center justify-between gap-4">

              <div className="flex items-center gap-3">
                {restaurant?.logoUrl ? (
                  <img
                    src={restaurant.logoUrl}
                    alt={restaurant.name}
                    className="h-12 w-12 rounded-2xl border border-white/30 object-cover shadow-2xl sm:h-14 sm:w-14"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg font-black text-[#172554] shadow-2xl sm:h-14 sm:w-14">
                    {restaurant?.name
                      ?.slice(0, 1)
                      .toUpperCase() || 'D'}
                  </div>
                )}

                <div className="hidden sm:block">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">
                    Welcome to
                  </p>

                  <p className="font-bold">
                    {restaurant?.name}
                  </p>
                </div>
              </div>

              {tableNumber && (
                <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3.5 py-2 backdrop-blur-xl sm:px-4">
                  <span className="text-sm">🪑</span>

                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/60">
                      Your table
                    </p>

                    <p className="text-xs font-black sm:text-sm">
                      Table {tableNumber}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Hero content */}
            <div className="max-w-3xl pb-5 pt-20 sm:pb-8 sm:pt-28">

              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold backdrop-blur-xl">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                Open for dine-in
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                {restaurant?.name ||
                  'Good Food. Great Moments.'}
              </h1>

              {restaurant?.description ? (
                <p className="mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
                  {restaurant.description}
                </p>
              ) : (
                <p className="mt-5 max-w-xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
                  Discover our menu, choose your favourites,
                  and enjoy a delicious dining experience.
                </p>
              )}

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={scrollToMenu}
                  className="group flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-sm font-black text-slate-950 shadow-2xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-50 active:scale-[0.98]"
                >
                  Explore Menu

                  <span className="transition-transform duration-300 group-hover:translate-y-1">
                    ↓
                  </span>
                </button>

                {tableNumber && (
                  <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-black/20 px-6 py-4 text-sm font-semibold text-white backdrop-blur-xl">
                    <span>Table {tableNumber}</span>
                    <span className="text-white/40">•</span>
                    <span>Ready to order</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom stats */}
            <div className="grid max-w-xl grid-cols-3 gap-2 border-t border-white/15 pt-5 sm:gap-5 sm:pt-6">
              <div>
                <p className="text-lg font-black sm:text-xl">
                  {availableCategories.length}
                </p>
                <p className="text-[10px] font-medium text-white/55 sm:text-xs">
                  Categories
                </p>
              </div>

              <div>
                <p className="text-lg font-black sm:text-xl">
                  {availableCategories.reduce(
                    (total, category) =>
                      total +
                      category.menuItems.filter(
                        (item) => item.isAvailable,
                      ).length,
                    0,
                  )}
                </p>

                <p className="text-[10px] font-medium text-white/55 sm:text-xs">
                  Menu Items
                </p>
              </div>

              <div>
                <p className="text-lg font-black sm:text-xl">
                  {currency}
                </p>

                <p className="text-[10px] font-medium text-white/55 sm:text-xs">
                  Local Currency
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* RESTAURANT INFO */}
      {/* ================================================= */}

      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-10">
        <div className="grid gap-3 sm:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                🍽️
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Experience
                </p>

                <p className="text-sm font-bold text-slate-900">
                  Dine-in ordering
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                ✓
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Service
                </p>

                <p className="text-sm font-bold text-slate-900">
                  Freshly prepared
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
                ⚡
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Ordering
                </p>

                <p className="text-sm font-bold text-slate-900">
                  Quick & easy
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ================================================= */}
      {/* MENU */}
      {/* ================================================= */}

      <main
        id="menu-section"
        className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-12 sm:px-6 sm:pt-16"
      >
        {availableCategories.length === 0 ? (
          <div className="rounded-[30px] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              🍽️
            </div>

            <h2 className="mt-5 text-xl font-black text-slate-900">
              Menu unavailable
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              There are currently no menu items available.
            </p>
          </div>
        ) : (
          <>
            {/* Menu heading */}
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                Our Menu
              </p>

              <div className="mt-2 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                    What are you craving?
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                    Browse our menu and add your favourites to
                    your order.
                  </p>
                </div>
              </div>
            </div>

            {/* Category tabs */}
            <div className="sticky top-0 z-30 -mx-4 border-y border-slate-200/80 bg-[#f7f8fa]/95 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
              <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {availableCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() =>
                      scrollToCategory(category.id)
                    }
                    className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
                      activeCategory === category.id
                        ? 'bg-[#172554] text-white shadow-lg shadow-blue-950/15'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="mt-8 space-y-14">
              {availableCategories.map((category) => {
                const availableItems =
                  category.menuItems.filter(
                    (item) => item.isAvailable,
                  );

                return (
                  <section
                    key={category.id}
                    id={`category-${category.id}`}
                    className="scroll-mt-28"
                  >
                    <div className="mb-5 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                          Category
                        </p>

                        <h3 className="mt-1 text-2xl font-black text-slate-900">
                          {category.name}
                        </h3>

                        {category.description && (
                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            {category.description}
                          </p>
                        )}
                      </div>

                      <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm">
                        {availableItems.length}{' '}
                        {availableItems.length === 1
                          ? 'item'
                          : 'items'}
                      </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {availableItems.map((item) => {
                        const quantity = getItemQuantity(
                          item.id,
                        );

                        return (
                          <article
                            key={item.id}
                            className="group overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                          >
                            {item.imageUrl ? (
                              <div className="relative h-52 overflow-hidden">
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                />

                                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />

                                <div className="absolute left-4 top-4 rounded-full bg-white/95 px-2.5 py-1.5 shadow">
                                  <span className="flex items-center gap-1.5 text-[10px] font-black">
                                    <span
                                      className={`h-2.5 w-2.5 rounded-full ${
                                        item.isVeg
                                          ? 'bg-emerald-500'
                                          : 'bg-red-500'
                                      }`}
                                    />

                                    {item.isVeg
                                      ? 'VEG'
                                      : 'NON-VEG'}
                                  </span>
                                </div>

                                <div className="absolute bottom-4 left-4 rounded-full bg-black/70 px-3 py-1.5 text-sm font-black text-white backdrop-blur">
                                  {currency}
                                  {Number(
                                    item.price,
                                  ).toFixed(2)}
                                </div>
                              </div>
                            ) : (
                              <div className="flex h-32 items-center justify-between bg-gradient-to-br from-slate-100 to-slate-50 px-5">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                                  🍽️
                                </div>

                                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-black shadow-sm">
                                  {currency}
                                  {Number(
                                    item.price,
                                  ).toFixed(2)}
                                </span>
                              </div>
                            )}

                            <div className="p-5">
                              <div className="flex items-start gap-3">
                                <span
                                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                                    item.isVeg
                                      ? 'bg-emerald-500'
                                      : 'bg-red-500'
                                  }`}
                                />

                                <div className="min-w-0">
                                  <h4 className="font-black text-slate-900">
                                    {item.name}
                                  </h4>

                                  {item.description && (
                                    <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {quantity === 0 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    addToCart(item)
                                  }
                                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#172554] px-4 py-3.5 text-sm font-black text-white transition hover:bg-[#1e3a8a] active:scale-[0.98]"
                                >
                                  <span className="text-lg">
                                    +
                                  </span>

                                  Add to Cart
                                </button>
                              ) : (
                                <div className="mt-5 flex items-center justify-between rounded-2xl bg-blue-50 p-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateCartQuantity(
                                        item.id,
                                        -1,
                                      )
                                    }
                                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg font-black shadow-sm"
                                  >
                                    −
                                  </button>

                                  <div className="text-center">
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-blue-500">
                                      Qty
                                    </p>

                                    <p className="font-black text-slate-900">
                                      {quantity}
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateCartQuantity(
                                        item.id,
                                        1,
                                      )
                                    }
                                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#172554] text-lg font-black text-white shadow-sm"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* ================================================= */}
      {/* FLOATING CART */}
      {/* ================================================= */}

      {cart.length > 0 &&
        !showCart &&
        !showCheckout && (
          <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:px-6">
            <div className="mx-auto max-w-lg">
              <button
                type="button"
                onClick={() => setShowCart(true)}
                className="flex w-full items-center justify-between rounded-[22px] bg-[#172554] px-4 py-3.5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.28)] transition hover:bg-[#1e3a8a] active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-xl">
                    🛒
                  </div>

                  <div className="text-left">
                    <p className="text-sm font-black">
                      {cartItemCount}{' '}
                      {cartItemCount === 1
                        ? 'item'
                        : 'items'}
                    </p>

                    <p className="text-xs text-blue-100">
                      View your cart
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-black">
                    {currency}
                    {cartTotal.toFixed(2)}
                  </span>

                  <span className="text-lg">→</span>
                </div>
              </button>
            </div>
          </div>
        )}

      {/* ================================================= */}
      {/* CART SHEET */}
      {/* ================================================= */}

      {showCart && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close cart"
            onClick={() => setShowCart(false)}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
          />

          <div className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-[32px] bg-[#f8fafc] shadow-2xl">
            <div className="mx-auto max-w-2xl px-4 pb-8 pt-4 sm:px-6">
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-slate-300" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                    Your selection
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    Your Cart
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCart(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl text-slate-500 shadow-sm"
                >
                  ×
                </button>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Table
                    </p>

                    <p className="mt-1 font-black">
                      {tableNumber
                        ? `Table ${tableNumber}`
                        : 'Not specified'}
                    </p>
                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    Dine-in
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate font-bold">
                          {item.name}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {currency}
                          {item.price.toFixed(2)} each
                        </p>
                      </div>

                      <p className="shrink-0 font-black">
                        {currency}
                        {(
                          item.price * item.quantity
                        ).toFixed(2)}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">
                        Quantity
                      </span>

                      <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateCartQuantity(
                              item.id,
                              -1,
                            )
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg font-black shadow-sm"
                        >
                          −
                        </button>

                        <span className="w-7 text-center text-sm font-black">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            updateCartQuantity(
                              item.id,
                              1,
                            )
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#172554] text-lg font-black text-white"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>

                  <span>
                    {currency}
                    {cartTotal.toFixed(2)}
                  </span>
                </div>

                <div className="mt-2 flex justify-between text-sm text-slate-500">
                  <span>Tax</span>

                  <span>{currency}0.00</span>
                </div>

                <div className="mt-4 flex justify-between border-t border-slate-100 pt-4">
                  <span className="font-bold">
                    Total
                  </span>

                  <span className="text-xl font-black">
                    {currency}
                    {cartTotal.toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={openCheckout}
                  className="mt-5 w-full rounded-2xl bg-[#172554] px-5 py-4 text-sm font-black text-white transition hover:bg-[#1e3a8a] active:scale-[0.99]"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* CHECKOUT */}
      {/* ================================================= */}

      {showCheckout && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#f7f8fa]">
          <div className="mx-auto min-h-screen max-w-2xl px-4 pb-8 pt-5 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCheckout(false);
                  setCheckoutError('');
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-xl shadow-sm"
              >
                ←
              </button>

              <div>
                <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                  Almost there
                </p>

                <h2 className="text-2xl font-black">
                  Checkout
                </h2>
              </div>
            </div>

            <section className="mt-6 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
                  👤
                </div>

                <div>
                  <h3 className="font-black">
                    Customer Details
                  </h3>

                  <p className="text-sm text-slate-500">
                    Used for your order
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Your Name
                  </label>

                  <input
                    type="text"
                    value={customerName}
                    onChange={(event) =>
                      setCustomerName(event.target.value)
                    }
                    placeholder="Enter your name"
                    autoComplete="name"
                    className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Phone Number
                  </label>

                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(event) =>
                      setCustomerPhone(event.target.value)
                    }
                    placeholder="Enter your phone number"
                    autoComplete="tel"
                    inputMode="tel"
                    className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>
            </section>

            <section className="mt-4 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                    Review
                  </p>

                  <h3 className="mt-1 text-lg font-black">
                    Order Summary
                  </h3>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold">
                  {cartItemCount}{' '}
                  {cartItemCount === 1
                    ? 'item'
                    : 'items'}
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="font-bold">
                        {item.name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {item.quantity} × {currency}
                        {item.price.toFixed(2)}
                      </p>
                    </div>

                    <p className="font-bold">
                      {currency}
                      {(
                        item.price * item.quantity
                      ).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t border-slate-100 pt-5">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>

                  <span>
                    {currency}
                    {cartTotal.toFixed(2)}
                  </span>
                </div>

                <div className="mt-2 flex justify-between text-sm text-slate-500">
                  <span>Tax</span>

                  <span>{currency}0.00</span>
                </div>

                <div className="mt-4 flex justify-between">
                  <span className="font-bold">
                    Total
                  </span>

                  <span className="text-xl font-black">
                    {currency}
                    {cartTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </section>

            {checkoutError && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {checkoutError}
              </div>
            )}

            <button
              type="button"
              onClick={createOrder}
              disabled={orderCreating}
              className="mt-5 flex w-full items-center justify-center gap-3 rounded-[20px] bg-[#172554] px-5 py-4 text-sm font-black text-white shadow-xl transition hover:bg-[#1e3a8a] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {orderCreating ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Sending Order...
                </>
              ) : (
                <>
                  Continue to Payment
                  <span>→</span>
                </>
              )}
            </button>

            <p className="mt-3 text-center text-xs leading-5 text-slate-400">
              Your order will be sent to the restaurant
              before payment processing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerMenu;
