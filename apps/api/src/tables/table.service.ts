import { prisma } from '../lib/prisma.js';

export async function getTables(restaurantId: string) {
  return prisma.restaurantTable.findMany({
    where: {
      restaurantId,
    },
    orderBy: {
      tableNumber: 'asc',
    },
  });
}

export async function createTable(
  restaurantId: string,
  data: {
    tableNumber: string;
  },
) {
  const existingTable = await prisma.restaurantTable.findFirst({
    where: {
      restaurantId,
      tableNumber: data.tableNumber,
    },
  });

  if (existingTable) {
    throw new Error('Table number already exists');
  }

  return prisma.restaurantTable.create({
    data: {
      restaurantId,
      tableNumber: data.tableNumber,
    },
  });
}

export async function updateTable(
  restaurantId: string,
  tableId: string,
  data: {
    tableNumber?: string;
    isActive?: boolean;
  },
) {
  const table = await prisma.restaurantTable.findFirst({
    where: {
      id: tableId,
      restaurantId,
    },
  });

  if (!table) {
    throw new Error('Table not found');
  }

  if (data.tableNumber && data.tableNumber !== table.tableNumber) {
    const existingTable = await prisma.restaurantTable.findFirst({
      where: {
        restaurantId,
        tableNumber: data.tableNumber,
        id: {
          not: tableId,
        },
      },
    });

    if (existingTable) {
      throw new Error('Table number already exists');
    }
  }

  return prisma.restaurantTable.update({
    where: {
      id: tableId,
    },
    data,
  });
}

export async function deleteTable(
  restaurantId: string,
  tableId: string,
) {
  const table = await prisma.restaurantTable.findFirst({
    where: {
      id: tableId,
      restaurantId,
    },
  });

  if (!table) {
    throw new Error('Table not found');
  }

  return prisma.restaurantTable.update({
    where: {
      id: tableId,
    },
    data: {
      isActive: false,
    },
  });
}

