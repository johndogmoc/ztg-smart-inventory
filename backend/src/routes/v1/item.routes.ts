import { Router } from 'express';
import { createItem, getItems, getItemById, updateItem, deleteItem } from '../../controllers/item.controller';
import { authenticateToken, authorizeRoles } from '../../middlewares/auth.middleware';

const router = Router();

// Everyone fully authenticated can view the common catalog
router.get('/', authenticateToken, authorizeRoles('STOCKER', 'SUPERVISOR', 'MANAGER', 'ADMIN'), getItems);
router.get('/:id', authenticateToken, authorizeRoles('STOCKER', 'SUPERVISOR', 'MANAGER', 'ADMIN'), getItemById);

// Only catalog maintainers can edit actual SKUs and specifications
router.post('/', authenticateToken, authorizeRoles('MANAGER', 'ADMIN'), createItem);
router.patch('/:id', authenticateToken, authorizeRoles('MANAGER', 'ADMIN'), updateItem);
router.delete('/:id', authenticateToken, authorizeRoles('MANAGER', 'ADMIN'), deleteItem);

export default router;
