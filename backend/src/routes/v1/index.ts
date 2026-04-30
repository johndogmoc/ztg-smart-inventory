import { Router } from 'express';

const router = Router();

import authRouter from './auth.routes';

import itemRouter from './item.routes';

import movementRouter from './movement.routes';

import locationRouter from './location.routes';

router.use('/auth', authRouter);
router.use('/items', itemRouter);
router.use('/movements', movementRouter);
router.use('/locations', locationRouter);

export default router;
