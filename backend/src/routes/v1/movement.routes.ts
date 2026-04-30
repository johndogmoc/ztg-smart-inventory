import { Router } from 'express';
import { createMovement, getMovements, getItemStock } from '../../controllers/movement.controller';
import { authenticateToken, authorizeRoles } from '../../middlewares/auth.middleware';

const router = Router();

// Stockers log movements — this is their primary action on the floor
router.post('/', authenticateToken, authorizeRoles('STOCKER', 'SUPERVISOR', 'MANAGER', 'ADMIN'), createMovement);

// Anyone authenticated can view movement history
router.get('/', authenticateToken, authorizeRoles('STOCKER', 'SUPERVISOR', 'MANAGER', 'ADMIN'), getMovements);

// Real-time stock level check for a specific item (used by scanner flow)
router.get('/stock/:item_id', authenticateToken, authorizeRoles('STOCKER', 'SUPERVISOR', 'MANAGER', 'ADMIN'), getItemStock);

export default router;
