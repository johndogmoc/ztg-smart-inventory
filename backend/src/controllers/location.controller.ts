import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { successResponse, errorResponse } from '../utils/responseFactory';

export const createLocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { aisle, shelf, bin } = req.body;

    if (!aisle || !shelf || !bin) {
      return res.status(400).json(errorResponse('VALIDATION_ERROR', 'Aisle, shelf, and bin are required.'));
    }

    const existing = await prisma.location.findUnique({
      where: {
        aisle_shelf_bin: { aisle, shelf, bin }
      }
    });

    if (existing) {
      return res.status(409).json(errorResponse('CONFLICT', 'This location already exists.'));
    }

    const location = await prisma.location.create({
      data: { aisle, shelf, bin }
    });

    res.status(201).json(successResponse(location));
  } catch (error) {
    next(error);
  }
};

export const getLocations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const locations = await prisma.location.findMany({
      where: { deleted_at: null },
      orderBy: [{ aisle: 'asc' }, { shelf: 'asc' }, { bin: 'asc' }]
    });

    res.json(successResponse(locations, { total: locations.length }));
  } catch (error) {
    next(error);
  }
};

export const updateLocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { aisle, shelf, bin } = req.body;

    const location = await prisma.location.findFirst({
      where: { id, deleted_at: null }
    });

    if (!location) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Location not found.'));
    }

    const updated = await prisma.location.update({
      where: { id },
      data: { aisle, shelf, bin }
    });

    res.json(successResponse(updated));
  } catch (error) {
    next(error);
  }
};

export const deleteLocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const location = await prisma.location.findFirst({
      where: { id, deleted_at: null }
    });

    if (!location) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Location not found.'));
    }

    // Soft delete rule
    await prisma.location.update({
      where: { id },
      data: { deleted_at: new Date() }
    });

    res.json(successResponse({ message: 'Location deleted successfully.' }));
  } catch (error) {
    next(error);
  }
};
