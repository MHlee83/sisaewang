import { Router } from 'express';
import {
  getAuctionPrices,
  getAuctionHistory,
  getSurveyPrices,
  compareMarketPrices,
} from '../controllers/priceController';

const router = Router();

// GET /v1/prices/auction
router.get('/auction', getAuctionPrices);

// GET /v1/prices/auction/:itemCode/history
router.get('/auction/:itemCode/history', getAuctionHistory);

// GET /v1/prices/survey
router.get('/survey', getSurveyPrices);

// GET /v1/prices/compare
router.get('/compare', compareMarketPrices);

export default router;
