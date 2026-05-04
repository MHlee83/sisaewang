import { Router } from 'express';
import {
  getAuctionPrices,
  getAuctionHistory,
  getSurveyPrices,
  getSurveyPriceList,
  compareMarketPrices,
} from '../controllers/priceController';

const router = Router();

// GET /v1/prices/auction
router.get('/auction', getAuctionPrices);

// GET /v1/prices/auction/:itemCode/history
router.get('/auction/:itemCode/history', getAuctionHistory);

// GET /v1/prices/survey/list  (최신 날짜 전체 목록)
router.get('/survey/list', getSurveyPriceList);

// GET /v1/prices/survey  (단일 품목)
router.get('/survey', getSurveyPrices);

// GET /v1/prices/compare
router.get('/compare', compareMarketPrices);

export default router;
