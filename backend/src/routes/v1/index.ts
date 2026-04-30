import { Router } from 'express';
import { successResponse } from '../../utils/responseFactory';

const router = Router();

import authRouter from './auth.routes';

const itemsRouter = Router();
itemsRouter.get('/', (req, res) => { res.json(successResponse({ status: 'Items route hit' })); });

const movementsRouter = Router();
movementsRouter.get('/', (req, res) => { res.json(successResponse({ status: 'Movements route hit' })); });

const locationsRouter = Router();
locationsRouter.get('/', (req, res) => { res.json(successResponse({ status: 'Locations route hit' })); });

router.use('/auth', authRouter);
router.use('/items', itemsRouter);
router.use('/movements', movementsRouter);
router.use('/locations', locationsRouter);

export default router;
