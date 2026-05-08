"""
PostgreSQL DB 연결 및 쿼리 유틸
"""
import os
from datetime import date, timedelta
from typing import List, Dict, Any

import databases
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
database     = databases.Database(DATABASE_URL)


async def get_recent_prices(item_code: str, days: int = 30) -> List[Dict[str, Any]]:
    """품목의 최근 N일 경락가격 조회 (전 시장 평균)"""
    start_date = date.today() - timedelta(days=days)

    query = """
        SELECT
            ap.sale_date,
            AVG(ap.avg_price) AS avg_price,
            MAX(ap.max_price) AS max_price,
            MIN(ap.min_price) AS min_price,
            SUM(ap.total_qty) AS total_qty
        FROM auction_prices ap
        JOIN items i ON ap.item_id = i.id
        WHERE i.item_code = :item_code
          AND ap.sale_date >= :start_date
        GROUP BY ap.sale_date
        ORDER BY ap.sale_date ASC
    """
    try:
        if not database.is_connected:
            await database.connect()
        rows = await database.fetch_all(
            query=query,
            values={"item_code": item_code, "start_date": start_date},
        )
        return [dict(row) for row in rows]
    except Exception as e:
        print(f"[DB] 가격 조회 오류: {e}")
        return []


async def get_five_year_average(item_code: str, target_date: date) -> float:
    """최근 5년 동기(같은 월) 평균 경락가 계산"""
    query = """
        SELECT AVG(ap.avg_price) AS five_year_avg
        FROM auction_prices ap
        JOIN items i ON ap.item_id = i.id
        WHERE i.item_code = :item_code
          AND EXTRACT(MONTH FROM ap.sale_date) = :month
          AND ap.sale_date >= (CURRENT_DATE - INTERVAL '5 years')
    """
    try:
        if not database.is_connected:
            await database.connect()
        row = await database.fetch_one(
            query=query,
            values={"item_code": item_code, "month": target_date.month},
        )
        if row and row["five_year_avg"]:
            return float(row["five_year_avg"])
        return 0.0
    except Exception as e:
        print(f"[DB] 평년 평균 조회 오류: {e}")
        return 0.0


async def save_recommendation(
    item_id: int,
    target_date: date,
    recommendation: str,
    score: float,
    expected_price: float,
    reasoning: str,
) -> None:
    """AI 추천 결과를 DB에 저장"""
    query = """
        INSERT INTO ai_recommendations
            (item_id, target_date, recommendation, score, expected_price, reasoning)
        VALUES
            (:item_id, :target_date, :recommendation, :score, :expected_price, :reasoning)
        ON CONFLICT (item_id, target_date)
        DO UPDATE SET
            recommendation = EXCLUDED.recommendation,
            score          = EXCLUDED.score,
            expected_price = EXCLUDED.expected_price,
            reasoning      = EXCLUDED.reasoning
    """
    try:
        if not database.is_connected:
            await database.connect()
        await database.execute(
            query=query,
            values={
                "item_id":       item_id,
                "target_date":   target_date,
                "recommendation": recommendation,
                "score":         score,
                "expected_price": expected_price,
                "reasoning":     reasoning,
            },
        )
    except Exception as e:
        print(f"[DB] 추천 저장 오류: {e}")
