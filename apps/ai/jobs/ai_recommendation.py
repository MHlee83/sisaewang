"""
AI 출하 추천 배치 잡 — 매일 밤 11시 실행
cron: 0 23 * * * python jobs/ai_recommendation.py
"""
import asyncio
import os
import sys
from datetime import date

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

from utils.db import database, get_recent_prices, get_five_year_average, save_recommendation
from models.recommendation import get_recommendation_rule_based

# 배치 대상 품목 코드
BATCH_ITEM_CODES = [
    '111', '112', '113', '151', '152',  # 채소류
    '211', '212', '222', '221',          # 과일류
    '411', '421', '441',                  # 축산물
    '511',                                # 곡물
]


async def run_batch():
    await database.connect()
    print(f"[ai_recommendation] 배치 시작 — {date.today()}")
    today = date.today()

    success = 0
    error   = 0

    for item_code in BATCH_ITEM_CODES:
        try:
            # 아이템 ID 조회
            item_row = await database.fetch_one(
                "SELECT id FROM items WHERE item_code = :code",
                values={"code": item_code}
            )
            if not item_row:
                print(f"  [skip] 품목 없음: {item_code}")
                continue

            recent_prices = await get_recent_prices(item_code, days=30)
            five_year_avg = await get_five_year_average(item_code, today)

            result = get_recommendation_rule_based(
                item_code, today, recent_prices, five_year_avg
            )

            await save_recommendation(
                item_id        = item_row["id"],
                target_date    = today,
                recommendation = result["recommendation"],
                score          = result["score"],
                expected_price = result["expected_price"],
                reasoning      = result["reasoning"],
            )

            print(f"  ✅ {item_code}: {result['recommendation']} (score={result['score']})")
            success += 1

        except Exception as e:
            print(f"  ❌ {item_code}: {e}")
            error += 1

    await database.disconnect()
    print(f"[ai_recommendation] 완료 — 성공: {success}, 오류: {error}")


if __name__ == "__main__":
    asyncio.run(run_batch())
