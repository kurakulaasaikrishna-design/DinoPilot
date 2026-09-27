import { prisma } from '../lib/prisma';

export async function getOwnerDashboard(restaurantId: string) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    restaurant,
    totalOrders,
    pendingOrders,
    completedOrders,
    todayRevenueResult,
    totalRevenueResult,
    recentOrders,
    topSellingItems,
  ] = await Promise.all([
    prisma.restaurant.findUnique({
      where: {
        id: restaurantId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        logoUrl: true,
        coverImageUrl: true,
      },
    }),

    prisma.order.count({
      where: {
        restaurantId,
      },
    }),

    prisma.order.count({
      where: {
        restaurantId,
        orderStatus: {
          notIn: ['COMPLETED', 'CANCELLED'],
        },
      },
    }),

    prisma.order.count({
      where: {
        restaurantId,
        orderStatus: 'COMPLETED',
      },
    }),

    prisma.order.aggregate({
      where: {
        restaurantId,
        paymentStatus: 'PAID',
        createdAt: {
          gte: startOfToday,
        },
      },
      _sum: {
        totalAmount: true,
      },
    }),

    prisma.order.aggregate({
      where: {
        restaurantId,
        paymentStatus: 'PAID',
      },
      _sum: {
        totalAmount: true,
      },
    }),

    prisma.order.findMany({
      where: {
        restaurantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        totalAmount: true,
        paymentStatus: true,
        orderStatus: true,
        tableNumber: true,
        createdAt: true,
        items: {
          select: {
            itemName: true,
            quantity: true,
            totalPrice: true,
          },
        },
      },
    }),

    prisma.orderItem.groupBy({
      by: ['menuItemId', 'itemName'],
      _sum: {
        quantity: true,
        totalPrice: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 5,
    }),
  ]);

  return {
    restaurant,

    summary: {
      totalOrders,
      pendingOrders,
      completedOrders,
      todayRevenue: todayRevenueResult._sum.totalAmount ?? 0,
      totalRevenue: totalRevenueResult._sum.totalAmount ?? 0,
    },

    recentOrders,

    topSellingItems: topSellingItems.map((item) => ({
      menuItemId: item.menuItemId,
      itemName: item.itemName,
      quantitySold: item._sum.quantity ?? 0,
      revenue: item._sum.totalPrice ?? 0,
    })),
  };
} 