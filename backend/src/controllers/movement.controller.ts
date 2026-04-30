import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { successResponse, errorResponse } from '../utils/responseFactory';

const VALID_MOVEMENT_TYPES = ['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'];

export const createMovement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { item_id, location_id, quantity_change, movement_type } = req.body;
    const user_id = req.user!.id;

    // ── Validation ──
    if (!item_id || !location_id || quantity_change === undefined || !movement_type) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'item_id, location_id, quantity_change, and movement_type are required.')
      );
    }

    if (!VALID_MOVEMENT_TYPES.includes(movement_type)) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', `movement_type must be one of: ${VALID_MOVEMENT_TYPES.join(', ')}`)
      );
    }

    if (typeof quantity_change !== 'number' || quantity_change === 0) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'quantity_change must be a non-zero integer.')
      );
    }

    // ── Verify Item exists and is active ──
    const item = await prisma.item.findFirst({ where: { id: item_id, deleted_at: null } });
    if (!item) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Item not found in catalog.'));
    }

    // ── Verify Location exists and is active ──
    const location = await prisma.location.findFirst({ where: { id: location_id, deleted_at: null } });
    if (!location) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Location not found.'));
    }

    // ── Create Movement Record ──
    const movement = await prisma.stockMovement.create({
      data: {
        item_id,
        user_id,
        location_id,
        quantity_change,
        movement_type
      },
      include: {
        item: { select: { sku: true, name: true } },
        location: { select: { aisle: true, shelf: true, bin: true } },
        user: { select: { first_name: true, last_name: true, email: true } }
      }
    });

    // ── Check low-stock alert after OUT or ADJUSTMENT ──
    let alert = null;
    if (movement_type === 'OUT' || movement_type === 'ADJUSTMENT') {
      const aggregation = await prisma.stockMovement.aggregate({
        where: { item_id, deleted_at: null },
        _sum: { quantity_change: true }
      });

      const currentStock = aggregation._sum.quantity_change || 0;
      if (currentStock <= item.reorder_threshold) {
        alert = {
          type: 'LOW_STOCK',
          message: `⚠️ ${item.name} (${item.sku}) has dropped to ${currentStock} units — at or below reorder threshold of ${item.reorder_threshold}.`,
          current_stock: currentStock,
          reorder_threshold: item.reorder_threshold
        };
      }
    }

    res.status(201).json(successResponse({ movement, alert }));
  } catch (error) {
    next(error);
  }
};

export const getMovements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { item_id, location_id, movement_type, limit = '50', offset = '0' } = req.query;

    const where: any = { deleted_at: null };
    if (item_id) where.item_id = item_id as string;
    if (location_id) where.location_id = location_id as string;
    if (movement_type) where.movement_type = movement_type as string;

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          item: { select: { sku: true, name: true } },
          location: { select: { aisle: true, shelf: true, bin: true } },
          user: { select: { first_name: true, last_name: true, email: true } }
        },
        orderBy: { created_at: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10)
      }),
      prisma.stockMovement.count({ where })
    ]);

    res.json(successResponse(movements, { total, limit: parseInt(limit as string, 10), offset: parseInt(offset as string, 10) }));
  } catch (error) {
    next(error);
  }
};

export const getItemStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item_id = req.params.item_id as string;

    const item = await prisma.item.findFirst({ where: { id: item_id, deleted_at: null } });
    if (!item) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Item not found.'));
    }

    // Aggregate total stock across all movements
    const aggregation = await prisma.stockMovement.aggregate({
      where: { item_id, deleted_at: null },
      _sum: { quantity_change: true }
    });

    const currentStock = aggregation._sum.quantity_change || 0;

    // Breakdown by location
    const locationBreakdown = await prisma.stockMovement.groupBy({
      by: ['location_id'],
      where: { item_id, deleted_at: null },
      _sum: { quantity_change: true }
    });

    res.json(successResponse({
      item: { id: item.id, sku: item.sku, name: item.name },
      current_stock: currentStock,
      reorder_threshold: item.reorder_threshold,
      max_stock_level: item.max_stock_level,
      is_low_stock: currentStock <= item.reorder_threshold,
      by_location: locationBreakdown
    }));
  } catch (error) {
    next(error);
  }
};
