"""
출하 추천 API 및 룰베이스 로직
"""
from datetime import date, datetime
from typing import Optional
import os

from fastapi import APIRouter, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import numpy as np

from utils.db import get_recent_prices, get_five_year_average

router   = APIRouter()
security = HTTPBearer()

AI_SERVICE_TOKEN = os.getenv("AI_SERVICE_TOKEN", "")


def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    if credentials.credentials != AI_SERVICE_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid token")
    return credentials


# ===== 응답 스키마 =====

class RecommendationResponse(BaseModel):
    item_code:      str
    target_date:    str
    recommendation: str       # SELL_NOW / SELL_SOON / HOLD
    score:          float     # 0~100
    expected_price: float
    reasoning:      str


# ===== 룰베이스 추천 엔진 =====

def get_recommendation_rule_based(item_code: str, target_date: date,
                                   recent_prices: list, five_year_avg: float) -> dict:
    """
    Phase 1 MVP — 룰베이스 출하 추천.
    Phase 2에서 Prophet 시계열 모델로 고도화 예정.
    """
    if not recent_prices:
        return {
            "item_code":      item_code,
            "target_date":    target_date.isoformat(),
            "recommendation": "HOLD",
            "score":          50.0,
            "expected_price": 0.0,
            "reasoning":      "가격 데이터가 부족합니다. 직접 시장 확인을 권장합니다.",
        }

    current_price  = float(recent_prices[-1]["avg_price"])
    vs_average_rate = (
        (current_price - five_year_avg) / five_year_avg * 100
        if five_year_avg > 0 else 0.0
    )

    # 최근 7일 선형 추세 (기울기)
    recent_7 = recent_prices[-7:] if len(recent_prices) >= 7 else recent_prices
    if len(recent_7) >= 2:
        prices_arr = np.array([float(p["avg_price"]) for p in recent_7])
        x = np.arange(len(prices_arr))
        trend_slope = float(np.polyfit(x, prices_arr, 1)[0])
    else:
        trend_slope = 0.0

    # ===== 룰 적용 (스펙 9.1) =====
    if vs_average_rate >= 15 and trend_slope >= 0:
        recommendation = "SELL_NOW"
        score          = min(95.0, 60.0 + vs_average_rate)
        reasoning      = f"현재 가격이 평년 대비 {vs_average_rate:.1f}% 높고 상승 추세입니다. 지금 출하가 유리합니다."

    elif vs_average_rate >= 5 and trend_slope >= 0:
        recommendation = "SELL_SOON"
        score          = min(80.0, 50.0 + vs_average_rate)
        reasoning      = f"평년 대비 {vs_average_rate:.1f}% 높습니다. 추세 지속 여부를 확인 후 1~2주 내 출하를 권장합니다."

    elif trend_slope < -0.5:
        recommendation = "SELL_NOW"
        score          = 65.0
        reasoning      = f"가격이 하락 추세입니다 (일 평균 -{abs(trend_slope):.0f}원). 지금 출하가 유리할 수 있습니다."

    else:
        recommendation = "HOLD"
        score          = 50.0
        reasoning      = f"평년 대비 {vs_average_rate:+.1f}%. 현재 특별한 시그널이 없습니다. 관망 후 결정을 권장합니다."

    # 7일 후 예상 가격 (단순 선형 추정)
    expected_price = max(0.0, current_price + trend_slope * 7)

    return {
        "item_code":      item_code,
        "target_date":    target_date.isoformat(),
        "recommendation": recommendation,
        "score":          round(score, 2),
        "expected_price": round(expected_price, 2),
        "reasoning":      reasoning,
    }


# ===== 엔드포인트 =====

@router.get("/{item_code}", response_model=RecommendationResponse)
async def get_recommendation(
    item_code:   str,
    target_date: Optional[str] = None,
    _token = Security(verify_token),
):
    """
    품목 출하 추천 조회.
    - item_code: 품목 코드 (예: '111' = 배추)
    - target_date: 추천 기준일 (YYYY-MM-DD, 기본: 오늘)
    """
    try:
        td = date.fromisoformat(target_date) if target_date else date.today()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid target_date format (YYYY-MM-DD)")

    # DB에서 최근 30일 가격 조회
    recent_prices  = await get_recent_prices(item_code, days=30)
    five_year_avg  = await get_five_year_average(item_code, td)

    result = get_recommendation_rule_based(item_code, td, recent_prices, five_year_avg)
    return result
