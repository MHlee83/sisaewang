import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

// 이메일 마스킹: boongss@psynet.co.kr → b****@psynet.co.kr
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const head = local.slice(0, 1);
  return `${head}${'*'.repeat(Math.max(local.length - 1, 1))}@${domain}`;
}

// POST /v1/auth/check-device — 기기 가입 가능 여부 (가입 전 호출, 공개)
export async function checkDevice(req: Request, res: Response): Promise<void> {
  const { deviceId } = req.body as { deviceId?: string };
  if (!deviceId) { res.status(400).json({ error: 'INVALID_INPUT', message: 'deviceId가 필요합니다.' }); return; }

  const existing = await prisma.user.findUnique({ where: { deviceId } });
  // 이미 이 기기로 가입한 계정이 있으면 신규 가입 불가
  res.json({ available: !existing });
}

// POST /v1/auth/find-email — 이 기기로 가입한 계정의 이메일(마스킹) 반환 (공개)
export async function findEmailByDevice(req: Request, res: Response): Promise<void> {
  const { deviceId } = req.body as { deviceId?: string };
  if (!deviceId) { res.status(400).json({ error: 'INVALID_INPUT', message: 'deviceId가 필요합니다.' }); return; }

  const user = await prisma.user.findUnique({ where: { deviceId } });
  res.json({ email: user?.email ? maskEmail(user.email) : null });
}
