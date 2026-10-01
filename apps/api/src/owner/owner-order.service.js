import { prisma } from '../lib/prisma';
export async function getOwnerOrders(restaurantId, orderStatus) {
    return prisma.order.findMany({
        where: {
            restaurantId,
            ...(orderStatus
                ? {
                    orderStatus: orderStatus,
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
