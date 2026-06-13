import { Router } from 'express';
import { checkDevice, findEmailByDevice } from '../controllers/authController';

const router = Router();

// 공개 엔드포인트 (인증 불필요) — 가입 전/계정 분실 시 사용
// POST /v1/auth/check-device  — 기기 가입 가능 여부
router.post('/check-device', checkDevice);

// POST /v1/auth/find-email    — 기기로 가입한 계정 이메일(마스킹) 찾기
router.post('/find-email', findEmailByDevice);

export default router;
