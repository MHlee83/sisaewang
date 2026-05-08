"""
시세왕 AI 서비스 — FastAPI
Phase 1: 룰베이스 출하 추천
Phase 2: Prophet 시계열 모델 (예정)
"""
import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware

from models.recommendation import router as recommendation_router

load_dotenv()

app = FastAPI(
    title="시세왕 AI 서비스",
    description="농수축산물 출하 추천 AI 모듈",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(recommendation_router, prefix="/recommendations", tags=["recommendations"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "sisaewang-ai"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=True)
