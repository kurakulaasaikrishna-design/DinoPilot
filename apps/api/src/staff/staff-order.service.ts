import { prisma } from '../lib/prisma.js';

export async function getStaffOrders(
  restaurantId: string,
  orderStatus?: string,
) {
  return prisma.order.findMany({
    where: {
      restaurantId,
      ...(orderStatus
        ? { orderStatus: orderStatus as any }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        select: {
          id: true,
          itemName: true,
          unitPrice: true,
          quantity: true,
          totalPrice: true,
        },
      },
    },
  });
}

export async function getStaffOrder(
  restaurantId: string,
  orderId: string,
) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      restaurantId,
    },
    include: {
      items: {
        select: {
          id: true,
          itemName: true,
          unitPrice: true,
          quantity: true,
          totalPrice: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  return order;
}

export async function assignTable(
  restaurantId: string,
  orderId: string,
  tableNumber: string,
) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      restaurantId,
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  return prisma.order.update({
    where: {
      id: orderId,
    },
    data: {
      tableNumber,
    },
  });
}

export async function updateOrderStatus(
  restaurantId: string,
  orderId: string,
  userId: string,
  orderStatus:
    | 'CREATED'
    | 'PAYMENT_PENDING'
    | 'PAID'
    | 'CONFIRMED'
    | 'PREPARING'
    | 'READY'
    | 'COMPLETED'
    | 'CANCELLED',
) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      restaurantId,
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  if (orderStatus === 'COMPLETED') {
    return prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        orderStatus,
        completedAt: new Date(),
        completedBy: {
          connect: {
            id: userId,
          },
        },
      },
      include: {
        items: true,
      },
    });
  }

  return prisma.order.update({
    where: {
      id: orderId,
    },
    data: {
      orderStatus,
    },
    include: {
      items: true,
    },
  });
}



