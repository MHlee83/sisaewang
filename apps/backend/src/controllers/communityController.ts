import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth';
import { z } from 'zod';

// 신고 누적 시 자동 블라인드 임계값
const BLIND_THRESHOLD = 5;

// ===== 게시글 목록 =====
export async function getPosts(req: AuthRequest, res: Response): Promise<void> {
    const { page = '1', limit = '20', itemCode } = req.query as Record<string, string>;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit));
    const skip     = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {
        isBlinded: false,
        ...(itemCode && { itemCode }),
  };

  const [posts, total] = await Promise.all([
        prisma.communityPost.findMany({
                where,
                include: {
                          author: { select: { nickname: true } },
                          images: { select: { url: true, sortOrder: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
                          _count: { select: { comments: true, likes: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum,
        }),
        prisma.communityPost.count({ where }),
      ]);

  res.json({
        posts: posts.map((p) => formatPost(p, req.user?.id)),
        total,
        page: pageNum,
  });
}

// ===== 게시글 상세 =====
export async function getPost(req: AuthRequest, res: Response): Promise<void> {
    const id = BigInt(String(req.params.id));

  const post = await prisma.communityPost.findUnique({
        where: { id },
        include: {
                author: { select: { nickname: true } },
                images: { orderBy: { sortOrder: 'asc' } },
                _count: { select: { comments: true, likes: true } },
        },
  });

  if (!post) { res.status(404).json({ error: 'POST_NOT_FOUND' }); return; }
    if (post.isBlinded) { res.status(403).json({ error: 'BLINDED_POST', message: '신고 누적으로 블라인드 처리된 게시글입니다.' }); return; }

  // 조회수 증가 (fire-and-forget)
  prisma.communityPost.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  // 현재 사용자 좋아요 여부
  const liked = req.user
      ? !!(await prisma.communityLike.findUnique({
                where: { uq_like_user_post: { userId: req.user.id, postId: id } },
      }))
        : false;

  res.json({ ...formatPost(post, req.user?.id), liked });
}

// ===== 게시글 작성 =====
const CreatePostSchema = z.object({
    title:       z.string().min(2).max(100),
    content:     z.string().min(5).max(5000),
    itemCode:    z.string().optional(),
    isAnonymous: z.boolean().default(false),
    imageUrls:   z.array(z.string().url()).max(5).default([]),
});

export async function createPost(req: AuthRequest, res: Response): Promise<void> {
    const parsed = CreatePostSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.errors }); return; }

  const { title, content, itemCode, isAnonymous, imageUrls } = parsed.data;

  const post = await prisma.communityPost.create({
        data: {
                authorId: req.user!.id,
                title,
                content,
                itemCode: itemCode ?? null,
                isAnonymous,
                images: {
                          create: imageUrls.map((url, i) => ({ url, sortOrder: i })),
                },
        },
        include: { images: true },
  });

  res.status(201).json({ id: post.id.toString() });
}

// ===== 게시글 수정 =====
const UpdatePostSchema = z.object({
    title:   z.string().min(2).max(100).optional(),
    content: z.string().min(5).max(5000).optional(),
});

export async function updatePost(req: AuthRequest, res: Response): Promise<void> {
    const id     = BigInt(String(req.params.id));
    const parsed = UpdatePostSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'INVALID_INPUT' }); return; }

  const post = await prisma.communityPost.findUnique({ where: { id } });
    if (!post)                           { res.status(404).json({ error: 'POST_NOT_FOUND' }); return; }
    if (post.authorId !== req.user!.id)  { res.status(403).json({ error: 'FORBIDDEN' }); return; }

  await prisma.communityPost.update({ where: { id }, data: parsed.data });
    res.status(204).send();
}

// ===== 게시글 삭제 =====
export async function deletePost(req: AuthRequest, res: Response): Promise<void> {
    const id   = BigInt(String(req.params.id));
    const post = await prisma.communityPost.findUnique({ where: { id } });
    if (!post)                          { res.status(404).json({ error: 'POST_NOT_FOUND' }); return; }
    if (post.authorId !== req.user!.id) { res.status(403).json({ error: 'FORBIDDEN' }); return; }

  await prisma.communityPost.delete({ where: { id } });
    res.status(204).send();
}

// ===== 댓글 목록 =====
export async function getComments(req: Request, res: Response): Promise<void> {
    const postId = BigInt(String(req.params.id));

  const comments = await prisma.communityComment.findMany({
        where: { postId, isBlinded: false },
        include: { author: { select: { nickname: true } } },
        orderBy: { createdAt: 'asc' },
  });

  res.json(comments.map((c) => ({
        id:          c.id.toString(),
        content:     c.isBlinded ? '블라인드 처리된 댓글입니다.' : c.content,
        authorName:  c.isAnonymous ? '익명' : (c.author?.nickname ?? '탈퇴한 사용자'),
        isAnonymous: c.isAnonymous,
        isBlinded:   c.isBlinded,
        createdAt:   c.createdAt.toISOString(),
  })));
}

// ===== 댓글 작성 =====
export async function createComment(req: AuthRequest, res: Response): Promise<void> {
    const postId  = BigInt(String(req.params.id));
    const { content, isAnonymous = false } = req.body as { content: string; isAnonymous?: boolean };

  if (!content?.trim()) { res.status(400).json({ error: 'INVALID_INPUT', message: '댓글 내용을 입력해주세요.' }); return; }
    if (content.length > 1000) { res.status(400).json({ error: 'INVALID_INPUT', message: '댓글은 1000자 이하로 입력해주세요.' }); return; }

  const comment = await prisma.communityComment.create({
        data: {
                postId,
                authorId:    req.user!.id,
                content:     content.trim(),
                isAnonymous: !!isAnonymous,
        },
  });

  res.status(201).json({ id: comment.id.toString() });
}

// ===== 댓글 삭제 =====
export async function deleteComment(req: AuthRequest, res: Response): Promise<void> {
    const commentId = BigInt(String(req.params.commentId));
    const comment   = await prisma.communityComment.findUnique({ where: { id: commentId } });
    if (!comment)                          { res.status(404).json({ error: 'COMMENT_NOT_FOUND' }); return; }
    if (comment.authorId !== req.user!.id) { res.status(403).json({ error: 'FORBIDDEN' }); return; }

  await prisma.communityComment.delete({ where: { id: commentId } });
    res.status(204).send();
}

// ===== 좋아요 토글 =====
export async function toggleLike(req: AuthRequest, res: Response): Promise<void> {
    const postId = BigInt(String(req.params.id));
    const userId = req.user!.id;

  const existing = await prisma.communityLike.findUnique({
        where: { uq_like_user_post: { userId, postId } },
  });

  if (existing) {
        await prisma.communityLike.delete({ where: { id: existing.id } });
        await prisma.communityPost.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } });
        res.json({ liked: false });
  } else {
        await prisma.communityLike.create({ data: { userId, postId } });
        await prisma.communityPost.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } });
        res.json({ liked: true });
  }
}

// ===== 신고 =====
const ReportSchema = z.object({
    reason: z.string().min(2).max(100),
});

export async function reportContent(req: AuthRequest, res: Response): Promise<void> {
    const parsed = ReportSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'INVALID_INPUT' }); return; }

  const postId    = BigInt(String(req.params.id));
    const commentId = req.params.commentId ? BigInt(String(req.params.commentId)) : null;

  await prisma.communityReport.create({
        data: {
                reporterId: req.user!.id,
                postId:     commentId ? null : postId,
                commentId:  commentId ?? null,
                reason:     parsed.data.reason,
        },
  });

  // 신고 누적 시 자동 블라인드
  if (commentId) {
        const reportCount = await prisma.communityReport.count({ where: { commentId } });
        if (reportCount >= BLIND_THRESHOLD) {
                await prisma.communityComment.update({ where: { id: commentId }, data: { isBlinded: true } });
        }
  } else {
        const reportCount = await prisma.communityReport.count({ where: { postId } });
        if (reportCount >= BLIND_THRESHOLD) {
                await prisma.communityPost.update({ where: { id: postId }, data: { isBlinded: true } });
        }
  }

  res.status(201).json({ message: '신고가 접수되었습니다.' });
}

// ===== 포맷 헬퍼 =====
function formatPost(post: any, currentUserId?: bigint) {
    return {
          id:          post.id.toString(),
          title:       post.title,
          content:     post.content,
          itemCode:    post.itemCode,
          authorName:  post.isAnonymous ? '익명' : (post.author?.nickname ?? '탈퇴한 사용자'),
          isAnonymous: post.isAnonymous,
          isMyPost:    currentUserId ? post.authorId === currentUserId : false,
          likeCount:   post.likeCount,
          viewCount:   post.viewCount,
          commentCount: post._count?.comments ?? 0,
          thumbnail:   post.images?.[0]?.url ?? null,
          images:      post.images?.map((img: any) => img.url) ?? [],
          createdAt:   post.createdAt.toISOString(),
          updatedAt:   post.updatedAt.toISOString(),
    };
}
