import { prisma } from '../lib/prisma.js';

export async function getOwnerOrders(
  restaurantId: string,
  orderStatus?: string,
) {
  return prisma.order.findMany({
    where: {
      restaurantId,
      ...(orderStatus
        ? {
            orderStatus: orderStatus as any,
          }
        : {}),
    },
    orderBy: {
      createdAt: 'desc',
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
      completedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

