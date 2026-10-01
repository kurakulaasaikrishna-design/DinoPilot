import { prisma } from '../lib/prisma';
export async function getStaffOrders(restaurantId, orderStatus) {
    return prisma.order.findMany({
        where: {
            restaurantId,
            ...(orderStatus
                ? { orderStatus: orderStatus }
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
export async function getStaffOrder(restaurantId, orderId) {
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
export async function assignTable(restaurantId, orderId, tableNumber) {
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
export async function updateOrderStatus(restaurantId, orderId, userId, orderStatus) {
    const order = await prisma.order.findFirst({
        where: {
            id: orderId,
            restaurantId,
        },
    });
    if (!order) {
        throw new Error('Order not found');
    }
    const data = {
        orderStatus,
    };
    if (orderStatus === 'COMPLETED') {
        data.completedAt = new Date();
        data.completedById = userId;
    }
    return prisma.order.update({
        where: {
            id: orderId,
        },
        data,
        include: {
            items: true,
        },
    });
}
