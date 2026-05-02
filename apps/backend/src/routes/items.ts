import { Router } from 'express';
import { getItems, getItemDetail } from '../controllers/itemController';

const router = Router();

// GET /v1/items
router.get('/', getItems);

// GET /v1/items/:itemCode
router.get('/:itemCode', getItemDetail);

export default router;
