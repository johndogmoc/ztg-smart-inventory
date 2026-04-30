import { Router } from 'express';
import { createLocation, getLocations, updateLocation, deleteLocation } from '../../controllers/location.controller';
import { authenticateToken, authorizeRoles } from '../../middlewares/auth.middleware';

const router = Router();

// Only STOCKER, MANAGER, ADMIN can view locations
router.get('/', authenticateToken, authorizeRoles('STOCKER', 'MANAGER', 'ADMIN'), getLocations);

// Only MANAGER, ADMIN can create/edit/delete structural locations
router.post('/', authenticateToken, authorizeRoles('MANAGER', 'ADMIN'), createLocation);
router.patch('/:id', authenticateToken, authorizeRoles('MANAGER', 'ADMIN'), updateLocation);
router.delete('/:id', authenticateToken, authorizeRoles('MANAGER', 'ADMIN'), deleteLocation);

export default router;
