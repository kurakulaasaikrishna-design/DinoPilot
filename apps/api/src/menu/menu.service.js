import { prisma } from '../lib/prisma';
export async function getMenu(restaurantId) {
    return prisma.category.findMany({
        where: {
            restaurantId,
            isActive: true,
        },
        orderBy: {
            displayOrder: 'asc',
        },
        include: {
            menuItems: {
                where: {
                    isActive: true,
                },
                orderBy: {
                    displayOrder: 'asc',
                },
            },
        },
    });
}
export async function createCategory(restaurantId, data) {
    return prisma.category.create({
        data: {
            restaurantId,
            name: data.name,
            description: data.description,
            imageUrl: data.imageUrl,
            displayOrder: data.displayOrder ?? 0,
        },
    });
}
export async function updateCategory(restaurantId, categoryId, data) {
    const category = await prisma.category.findFirst({
        where: {
            id: categoryId,
            restaurantId,
        },
    });
    if (!category) {
        throw new Error('Category not found');
    }
    return prisma.category.update({
        where: {
            id: categoryId,
        },
        data,
    });
}
export async function deleteCategory(restaurantId, categoryId) {
    const category = await prisma.category.findFirst({
        where: {
            id: categoryId,
            restaurantId,
        },
    });
    if (!category) {
        throw new Error('Category not found');
    }
    // Soft delete so historical order relationships remain safe.
    return prisma.category.update({
        where: {
            id: categoryId,
        },
        data: {
            isActive: false,
        },
    });
}
export async function createMenuItem(restaurantId, data) {
    const category = await prisma.category.findFirst({
        where: {
            id: data.categoryId,
            restaurantId,
            isActive: true,
        },
    });
    if (!category) {
        throw new Error('Category not found');
    }
    return prisma.menuItem.create({
        data: {
            restaurantId,
            categoryId: data.categoryId,
            name: data.name,
            description: data.description,
            price: data.price,
            imageUrl: data.imageUrl,
            isVeg: data.isVeg ?? true,
            displayOrder: data.displayOrder ?? 0,
        },
    });
}
export async function updateMenuItem(restaurantId, menuItemId, data) {
    const item = await prisma.menuItem.findFirst({
        where: {
            id: menuItemId,
            restaurantId,
        },
    });
    if (!item) {
        throw new Error('Menu item not found');
    }
    if (data.categoryId) {
        const category = await prisma.category.findFirst({
            where: {
                id: data.categoryId,
                restaurantId,
                isActive: true,
            },
        });
        if (!category) {
            throw new Error('Category not found');
        }
    }
    return prisma.menuItem.update({
        where: {
            id: menuItemId,
        },
        data,
    });
}
export async function deleteMenuItem(restaurantId, menuItemId) {
    const item = await prisma.menuItem.findFirst({
        where: {
            id: menuItemId,
            restaurantId,
        },
    });
    if (!item) {
        throw new Error('Menu item not found');
    }
    // Soft delete.
    return prisma.menuItem.update({
        where: {
            id: menuItemId,
        },
        data: {
            isActive: false,
        },
    });
}
export async function updateMenuItemAvailability(restaurantId, menuItemId, isAvailable) {
    const item = await prisma.menuItem.findFirst({
        where: {
            id: menuItemId,
            restaurantId,
        },
    });
    if (!item) {
        throw new Error('Menu item not found');
    }
    return prisma.menuItem.update({
        where: {
            id: menuItemId,
        },
        data: {
            isAvailable,
        },
    });
}
