import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { successResponse, errorResponse } from '../utils/responseFactory';

export const createItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sku, name, description, reorder_threshold, max_stock_level } = req.body;

    if (!sku || !name) {
      return res.status(400).json(errorResponse('VALIDATION_ERROR', 'SKU and Name are required fields.'));
    }

    const existing = await prisma.item.findUnique({ where: { sku } });
    if (existing) {
      return res.status(409).json(errorResponse('CONFLICT', 'An item with this SKU already exists.'));
    }

    const item = await prisma.item.create({
      data: {
        sku,
        name,
        description,
        reorder_threshold: reorder_threshold || 0,
        max_stock_level
      }
    });

    res.status(201).json(successResponse(item));
  } catch (error) {
    next(error);
  }
};

export const getItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.item.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' }
    });
    
    // Note: If physical stock calculation is needed across all items, it would require mapping stock movements.
    // That is typically served via an aggregate inventory view, rather than the raw item catalog endpoint.

    res.json(successResponse(items, { total: items.length }));
  } catch (error) {
    next(error);
  }
};

export const getItemById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    
    const item = await prisma.item.findFirst({
      where: { id, deleted_at: null }
    });

    if (!item) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Item not found in catalog.'));
    }

    res.json(successResponse(item));
  } catch (error) {
    next(error);
  }
};

export const updateItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { name, description, reorder_threshold, max_stock_level } = req.body;

    const item = await prisma.item.findFirst({
      where: { id, deleted_at: null }
    });

    if (!item) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Item not found.'));
    }

    const updated = await prisma.item.update({
      where: { id },
      data: { name, description, reorder_threshold, max_stock_level }
    });

    res.json(successResponse(updated));
  } catch (error) {
    next(error);
  }
};

export const deleteItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    
    const item = await prisma.item.findFirst({
      where: { id, deleted_at: null }
    });

    if (!item) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Item not found.'));
    }

    await prisma.item.update({
      where: { id },
      data: { deleted_at: new Date() }
    });

    res.json(successResponse({ message: 'Item safely archived from catalog.' }));
  } catch (error) {
    next(error);
  }
};
