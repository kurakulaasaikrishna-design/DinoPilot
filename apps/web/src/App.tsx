import { useEffect, useMemo, useState } from 'react';
import OwnerDashboard from './pages/OwnerDashboard';
import StaffDashboard from './pages/StaffDashboard';
import StaffLogin from './pages/StaffLogin';
import CustomerMenu from './pages/CustomerMenu';

const API_URL = import.meta.env.VITE_API_URL;

type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  phone?: string | null;
  address?: string | null;
};

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

type CartItem = MenuItem & {
  quantity: number;
};

type OrderResponse = {
  message: string;
  order: {
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    paymentStatus: string;
    orderStatus: string;
    items: Array<{
      id: string;
      itemName: string;
      unitPrice: number;
      quantity: number;
      totalPrice: number;
    }>;
  };
};

function formatPrice(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}

// function App() {
//   <div className=" "></div>const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
//   const [categories, setCategories] = useState<Category[]>([]);
//   const [activeCategory, setActiveCategory] = useState('');
//   const [cart, setCart] = useState<CartItem[]>([]);

//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   const [showCart, setShowCart] = useState(false);
//   const [showCheckout, setShowCheckout] = useState(false);

//   const [customerName, setCustomerName] = useState('');
//   const [customerPhone, setCustomerPhone] = useState('');

//   const [placingOrder, setPlacingOrder] = useState(false);
//   const [order, setOrder] = useState<OrderResponse['order'] | null>(null);
//   const [orderError, setOrderError] = useState('');

//   useEffect(() => {
//     async function loadRestaurant() {
//       try {
//         setLoading(true);
//         setError('');

//         const [restaurantResponse, menuResponse] = await Promise.all([
//           fetch(`${API_URL}/api/restaurant`),
//           fetch(`${API_URL}/api/menu`),
//         ]);

//         if (!restaurantResponse.ok) {
//           throw new Error('Failed to load restaurant');
//         }

//         if (!menuResponse.ok) {
//           throw new Error('Failed to load menu');
//         }

//         const restaurantData = await restaurantResponse.json();
//         const menuData: Category[] = await menuResponse.json();

//         setRestaurant(restaurantData);
//         setCategories(menuData);

//         if (menuData.length > 0) {
//           setActiveCategory(menuData[0].id);
//         }
//       } catch (err) {
//         setError(
//           err instanceof Error
//             ? err.message
//             : 'Unable to load restaurant',
//         );
//       } finally {
//         setLoading(false);
//       }
//     }

//     loadRestaurant();
//   }, []);

//   const cartCount = useMemo(
//     () => cart.reduce((sum, item) => sum + item.quantity, 0),
//     [cart],
//   );

//   const cartTotal = useMemo(
//     () =>
//       cart.reduce(
//         (sum, item) => sum + item.price * item.quantity,
//         0,
//       ),
//     [cart],
//   );

//   function addToCart(item: MenuItem) {
//     if (!item.isAvailable) return;

//     setCart((current) => {
//       const existing = current.find(
//         (cartItem) => cartItem.id === item.id,
//       );

//       if (existing) {
//         return current.map((cartItem) =>
//           cartItem.id === item.id
//             ? {
//                 ...cartItem,
//                 quantity: cartItem.quantity + 1,
//               }
//             : cartItem,
//         );
//       }

//       return [...current, { ...item, quantity: 1 }];
//     });
//   }

//   function updateQuantity(itemId: string, quantity: number) {
//     if (quantity <= 0) {
//       setCart((current) =>
//         current.filter((item) => item.id !== itemId),
//       );
//       return;
//     }

//     setCart((current) =>
//       current.map((item) =>
//         item.id === itemId
//           ? { ...item, quantity }
//           : item,
//       ),
//     );
//   }

//   function openCart() {
//     setShowCart(true);
//     setShowCheckout(false);
//   }

//   function startCheckout() {
//     if (cart.length === 0) return;

//     setShowCart(false);
//     setShowCheckout(true);
//     setOrderError('');
//   }

//   async function placeOrder() {
//     setOrderError('');

//     if (customerName.trim().length < 2) {
//       setOrderError('Please enter your name.');
//       return;
//     }

//     if (!/^[6-9]\d{9}$/.test(customerPhone.trim())) {
//       setOrderError('Please enter a valid 10-digit mobile number.');
//       return;
//     }

//     if (cart.length === 0) {
//       setOrderError('Your cart is empty.');
//       return;
//     }

//     try {
//       setPlacingOrder(true);

//       const response = await fetch(`${API_URL}/api/orders`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           customerName: customerName.trim(),
//           customerPhone: customerPhone.trim(),
//           items: cart.map((item) => ({
//             menuItemId: item.id,
//             quantity: item.quantity,
//           })),
//         }),
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.message || 'Failed to create order');
//       }

//       setOrder(data.order);
//       setCart([]);
//       setShowCheckout(false);
//     } catch (err) {
//       setOrderError(
//         err instanceof Error
//           ? err.message
//           : 'Failed to create order',
//       );
//     } finally {
//       setPlacingOrder(false);
//     }
//   }

//   if (loading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-stone-950 text-white">
//         <div className="text-center">
//           <div className="mb-4 text-4xl">🍽️</div>
//           <p className="text-stone-400">Loading restaurant...</p>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-stone-950 px-6 text-white">
//         <div className="max-w-md rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
//           <div className="mb-4 text-4xl">⚠️</div>
//           <h1 className="text-xl font-semibold">
//             Unable to load restaurant
//           </h1>
//           <p className="mt-3 text-sm text-red-200">{error}</p>
//         </div>
//       </div>
//     );
//   }

//   if (order) {
//     return (
//       <div className="min-h-screen bg-stone-950 px-5 py-10 text-white">
//         <div className="mx-auto max-w-lg">
//           <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl">
//             <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-4xl">
//               ✓
//             </div>

//             <p className="mt-6 text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">
//               Order Created
//             </p>

//             <h1 className="mt-3 text-3xl font-bold">
//               Thank you, {order.customerName}
//             </h1>

//             <p className="mt-3 text-stone-400">
//               Your order has been successfully created.
//             </p>

//             <div className="mt-8 rounded-2xl bg-black/30 p-5">
//               <p className="text-xs uppercase tracking-widest text-stone-500">
//                 Order Number
//               </p>

//               <p className="mt-2 text-2xl font-bold text-amber-400">
//                 {order.orderNumber}
//               </p>

//               <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
//                 <span className="text-stone-400">
//                   Total
//                 </span>

//                 <span className="text-xl font-bold">
//                   {formatPrice(order.totalAmount)}
//                 </span>
//               </div>

//               <div className="mt-3 flex items-center justify-between">
//                 <span className="text-stone-400">
//                   Payment
//                 </span>

//                 <span className="rounded-full bg-amber-400/10 px-3 py-1 text-sm font-medium text-amber-300">
//                   Payment Pending
//                 </span>
//               </div>
//             </div>

//             <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-6">
//               <div className="text-5xl">▣</div>
//               <p className="mt-3 font-medium">
//                 Order QR will appear here
//               </p>
//               <p className="mt-1 text-sm text-stone-500">
//                 It will be generated after successful payment.
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-stone-950 pb-28 text-white">
//       {/* Header */}
//       <header className="sticky top-0 z-30 border-b border-white/10 bg-stone-950/90 backdrop-blur-xl">
//         <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
//           <div>
//             <p className="text-xs font-medium uppercase tracking-[0.25em] text-amber-400">
//               Welcome
//             </p>

//             <h1 className="mt-1 text-xl font-bold sm:text-2xl">
//               {restaurant?.name}
//             </h1>
//           </div>

//           <button
//             type="button"
//             onClick={openCart}
//             className="relative rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium transition hover:bg-white/10"
//           >
//             Cart

//             {cartCount > 0 && (
//               <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-amber-400 px-1.5 py-0.5 text-xs font-bold text-stone-950">
//                 {cartCount}
//               </span>
//             )}
//           </button>
//         </div>
//       </header>

//       {/* Hero */}
//       <section className="mx-auto max-w-7xl px-5 pb-10 pt-12 lg:px-8 lg:pt-20">
//         <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-amber-400/15 via-white/[0.03] to-transparent p-8 sm:p-12 lg:p-16">
//           <div className="relative max-w-2xl">
//             <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-400">
//               Freshly prepared
//             </p>

//             <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
//               Good food.
//               <br />
//               Great moments.
//             </h2>

//             <p className="mt-5 max-w-xl text-base leading-7 text-stone-400 sm:text-lg">
//               {restaurant?.description ||
//                 'Freshly prepared food made with care.'}
//             </p>
//           </div>
//         </div>
//       </section>

//       {/* Menu */}
//       <main className="mx-auto max-w-7xl px-5 lg:px-8">
//         <div className="flex gap-2 overflow-x-auto pb-5">
//           {categories.map((category) => (
//             <button
//               key={category.id}
//               type="button"
//               onClick={() => setActiveCategory(category.id)}
//               className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium transition ${
//                 activeCategory === category.id
//                   ? 'bg-amber-400 text-stone-950'
//                   : 'border border-white/10 bg-white/5 text-stone-300 hover:bg-white/10'
//               }`}
//             >
//               {category.name}
//             </button>
//           ))}
//         </div>

//         {categories
//           .filter((category) => category.id === activeCategory)
//           .map((category) => (
//             <section key={category.id}>
//               <div className="mb-6">
//                 <h2 className="text-2xl font-bold">
//                   {category.name}
//                 </h2>

//                 {category.description && (
//                   <p className="mt-1 text-sm text-stone-500">
//                     {category.description}
//                   </p>
//                 )}
//               </div>

//               <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
//                 {category.menuItems.map((item) => (
//                   <article
//                     key={item.id}
//                     className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] transition hover:border-white/20"
//                   >
//                     <div className="aspect-[16/10] overflow-hidden bg-stone-900">
//                       {item.imageUrl ? (
//                         <img
//                           src={item.imageUrl}
//                           alt={item.name}
//                           className="h-full w-full object-cover"
//                         />
//                       ) : (
//                         <div className="flex h-full items-center justify-center text-6xl">
//                           🍽️
//                         </div>
//                       )}
//                     </div>

//                     <div className="p-5">
//                       <div className="flex items-start justify-between gap-4">
//                         <div>
//                           <div className="flex items-center gap-2">
//                             <span
//                               className={`h-2.5 w-2.5 rounded-full ${
//                                 item.isVeg
//                                   ? 'bg-emerald-400'
//                                   : 'bg-red-400'
//                               }`}
//                             />

//                             <h3 className="font-semibold">
//                               {item.name}
//                             </h3>
//                           </div>

//                           {item.description && (
//                             <p className="mt-2 text-sm leading-6 text-stone-500">
//                               {item.description}
//                             </p>
//                           )}
//                         </div>

//                         <span className="shrink-0 font-bold text-amber-400">
//                           {formatPrice(item.price)}
//                         </span>
//                       </div>

//                       <button
//                         type="button"
//                         disabled={!item.isAvailable}
//                         onClick={() => addToCart(item)}
//                         className="mt-5 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-stone-500"
//                       >
//                         {item.isAvailable
//                           ? 'Add to cart'
//                           : 'Currently unavailable'}
//                       </button>
//                     </div>
//                   </article>
//                 ))}
//               </div>
//             </section>
//           ))}
//       </main>

//       {/* Bottom cart bar */}
//       {cartCount > 0 && (
//         <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-stone-950/95 p-4 backdrop-blur-xl">
//           <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
//             <div>
//               <p className="text-sm text-stone-400">
//                 {cartCount} item{cartCount !== 1 ? 's' : ''}
//               </p>

//               <p className="text-lg font-bold">
//                 {formatPrice(cartTotal)}
//               </p>
//             </div>

//             <button
//               type="button"
//               onClick={openCart}
//               className="rounded-xl bg-amber-400 px-6 py-3 font-semibold text-stone-950 transition hover:bg-amber-300"
//             >
//               View Cart
//             </button>
//           </div>
//         </div>
//       )}

//       {/* Cart modal */}
//       {showCart && (
//         <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm">
//           <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[90vh] max-w-2xl overflow-y-auto rounded-t-[2rem] border border-white/10 bg-stone-950 p-6 shadow-2xl sm:inset-y-8 sm:bottom-auto sm:rounded-[2rem]">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-xs uppercase tracking-[0.25em] text-amber-400">
//                   Your order
//                 </p>

//                 <h2 className="mt-1 text-2xl font-bold">
//                   Shopping Cart
//                 </h2>
//               </div>

//               <button
//                 type="button"
//                 onClick={() => setShowCart(false)}
//                 className="rounded-full border border-white/10 px-3 py-2 text-stone-400 hover:bg-white/5"
//               >
//                 ✕
//               </button>
//             </div>

//             <div className="mt-6 space-y-3">
//               {cart.map((item) => (
//                 <div
//                   key={item.id}
//                   className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
//                 >
//                   <div className="flex-1">
//                     <p className="font-medium">{item.name}</p>

//                     <p className="mt-1 text-sm text-stone-500">
//                       {formatPrice(item.price)} each
//                     </p>
//                   </div>

//                   <div className="flex items-center rounded-xl border border-white/10">
//                     <button
//                       type="button"
//                       onClick={() =>
//                         updateQuantity(item.id, item.quantity - 1)
//                       }
//                       className="px-3 py-2 text-lg text-stone-300 hover:bg-white/5"
//                     >
//                       −
//                     </button>

//                     <span className="min-w-8 text-center text-sm font-semibold">
//                       {item.quantity}
//                     </span>

//                     <button
//                       type="button"
//                       onClick={() =>
//                         updateQuantity(item.id, item.quantity + 1)
//                       }
//                       className="px-3 py-2 text-lg text-stone-300 hover:bg-white/5"
//                     >
//                       +
//                     </button>
//                   </div>

//                   <p className="w-20 text-right font-semibold">
//                     {formatPrice(item.price * item.quantity)}
//                   </p>
//                 </div>
//               ))}
//             </div>

//             <div className="mt-6 border-t border-white/10 pt-5">
//               <div className="flex items-center justify-between">
//                 <span className="text-stone-400">
//                   Subtotal
//                 </span>

//                 <span className="text-xl font-bold">
//                   {formatPrice(cartTotal)}
//                 </span>
//               </div>

//               <button
//                 type="button"
//                 onClick={startCheckout}
//                 className="mt-5 w-full rounded-xl bg-amber-400 px-5 py-4 font-bold text-stone-950 transition hover:bg-amber-300"
//               >
//                 Continue to Checkout
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Checkout modal */}
//       {showCheckout && (
//         <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 px-4 py-8 backdrop-blur-sm">
//           <div className="mx-auto max-w-lg rounded-[2rem] border border-white/10 bg-stone-950 p-6 shadow-2xl sm:p-8">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-xs uppercase tracking-[0.25em] text-amber-400">
//                   Checkout
//                 </p>

//                 <h2 className="mt-1 text-2xl font-bold">
//                   Your Details
//                 </h2>
//               </div>

//               <button
//                 type="button"
//                 onClick={() => setShowCheckout(false)}
//                 className="rounded-full border border-white/10 px-3 py-2 text-stone-400 hover:bg-white/5"
//               >
//                 ✕
//               </button>
//             </div>

//             <div className="mt-7 space-y-5">
//               <div>
//                 <label className="mb-2 block text-sm font-medium text-stone-300">
//                   Name
//                 </label>

//                 <input
//                   value={customerName}
//                   onChange={(event) =>
//                     setCustomerName(event.target.value)
//                   }
//                   placeholder="Enter your name"
//                   className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-stone-600 focus:border-amber-400"
//                 />
//               </div>

//               <div>
//                 <label className="mb-2 block text-sm font-medium text-stone-300">
//                   Mobile number
//                 </label>

//                 <input
//                   value={customerPhone}
//                   onChange={(event) =>
//                     setCustomerPhone(
//                       event.target.value.replace(/\D/g, '').slice(0, 10),
//                     )
//                   }
//                   inputMode="numeric"
//                   placeholder="10-digit mobile number"
//                   className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-stone-600 focus:border-amber-400"
//                 />
//               </div>
//             </div>

//             <div className="mt-7 rounded-2xl bg-white/[0.04] p-5">
//               <div className="flex justify-between text-sm text-stone-400">
//                 <span>Items</span>
//                 <span>{cartCount}</span>
//               </div>

//               <div className="mt-3 flex justify-between border-t border-white/10 pt-3">
//                 <span className="font-medium">
//                   Total
//                 </span>

//                 <span className="text-xl font-bold text-amber-400">
//                   {formatPrice(cartTotal)}
//                 </span>
//               </div>
//             </div>

//             {orderError && (
//               <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
//                 {orderError}
//               </div>
//             )}

//             <button
//               type="button"
//               onClick={placeOrder}
//               disabled={placingOrder}
//               className="mt-6 w-full rounded-xl bg-amber-400 px-5 py-4 font-bold text-stone-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
//             >
//               {placingOrder
//                 ? 'Creating Order...'
//                 : `Place Order • ${formatPrice(cartTotal)}`}
//             </button>

//             <p className="mt-4 text-center text-xs leading-5 text-stone-600">
//               Payment will be available in the next step.
//             </p>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

type User = {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'STAFF';
  restaurantId: string;
};

function App() {
  const [authenticated, setAuthenticated] = useState(
    Boolean(localStorage.getItem('dinepilot_token')),
  );

  const storedUser = localStorage.getItem('dinepilot_user');
  const user: User | null = storedUser
    ? JSON.parse(storedUser)
    : null;

  const pathname = window.location.pathname;

  if (pathname === '/menu') {
    return <CustomerMenu />;
  }

  if (!authenticated || !user) {
    return (
      <StaffLogin
        onLogin={() => setAuthenticated(true)}
      />
    );
  }

  if (user.role === 'OWNER') {
    return <OwnerDashboard />;
  }

  return <StaffDashboard />;
}

export default App;
