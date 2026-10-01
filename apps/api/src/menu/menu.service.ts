import { prisma } from '../lib/prisma.js';

export async function getMenu(restaurantId: string) {
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

export async function createCategory(
  restaurantId: string,
  data: {
    name: string;
    description?: string;
    imageUrl?: string;
    displayOrder?: number;
  },
) {
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

export async function updateCategory(
  restaurantId: string,
  categoryId: string,
  data: {
    name?: string;
    description?: string;
    imageUrl?: string;
    displayOrder?: number;
    isActive?: boolean;
  },
) {
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

export async function deleteCategory(
  restaurantId: string,
  categoryId: string,
) {
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

export async function createMenuItem(
  restaurantId: string,
  data: {
    categoryId: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    isVeg?: boolean;
    displayOrder?: number;
  },
) {
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

export async function updateMenuItem(
  restaurantId: string,
  menuItemId: string,
  data: {
    categoryId?: string;
    name?: string;
    description?: string;
    price?: number;
    imageUrl?: string;
    isVeg?: boolean;
    isAvailable?: boolean;
    displayOrder?: number;
    isActive?: boolean;
  },
) {
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

export async function deleteMenuItem(
  restaurantId: string,
  menuItemId: string,
) {
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

export async function updateMenuItemAvailability(
  restaurantId: string,
  menuItemId: string,
  isAvailable: boolean,
) {
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

