import { prisma } from '../lib/prisma.js';

type CreateOrderInput = {
  customerName: string;
  customerPhone: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
  }>;
};

export async function createOrder(
  restaurantId: string,
  input: CreateOrderInput,
) {
  if (input.items.length === 0) {
    throw new Error('Cart is empty');
  }

  const menuItemIds = input.items.map((item) => item.menuItemId);

  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: menuItemIds },
      restaurantId,
      isActive: true,
      isAvailable: true,
    },
  });

  if (menuItems.length !== menuItemIds.length) {
    throw new Error('One or more menu items are unavailable');
  }

  const itemMap = new Map(
    menuItems.map((item) => [item.id, item]),
  );

  const orderItems = input.items.map((item) => {
    const menuItem = itemMap.get(item.menuItemId);

    if (!menuItem) {
      throw new Error('Menu item not found');
    }

    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new Error('Invalid item quantity');
    }

    const unitPrice = Number(menuItem.price);
    const totalPrice = unitPrice * item.quantity;

    return {
      menuItemId: menuItem.id,
      itemName: menuItem.name,
      unitPrice,
      quantity: item.quantity,
      totalPrice,
    };
  });

  const subtotal = orderItems.reduce(
    (sum, item) => sum + item.totalPrice,
    0,
  );

  const totalAmount = subtotal;

  const orderNumber = `ORD-${Date.now()}-${Math.floor(
    Math.random() * 1000,
  )}`;

  return prisma.order.create({
    data: {
      restaurantId,
      orderNumber,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      subtotal,
      taxAmount: 0,
      totalAmount,
      paymentStatus: 'PENDING',
      orderStatus: 'CREATED',

      items: {
        create: orderItems,
      },
    },
    include: {
      items: true,
    },
  });
}

