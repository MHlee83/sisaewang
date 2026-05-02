/**
 * Prisma Seed — 시장 + 품목 초기 데이터 (KAMIS 공식 품목 코드)
 * 실행: npx ts-node prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MARKETS = [
  { code: '110001', name: '서울가락', region: '서울' },
  { code: '110002', name: '서울강서', region: '서울' },
  { code: '210001', name: '부산엄궁', region: '부산' },
  { code: '310001', name: '대구북부', region: '대구' },
  { code: '410001', name: '인천삼산', region: '인천' },
  { code: '510001', name: '광주각화', region: '광주' },
  { code: '610001', name: '대전오정', region: '대전' },
];

const ITEMS = [
  // 채소류
  { categoryCode: '100', categoryName: '채소류', itemCode: '111', itemName: '배추',      unitName: 'kg' },
  { categoryCode: '100', categoryName: '채소류', itemCode: '112', itemName: '무',        unitName: 'kg' },
  { categoryCode: '100', categoryName: '채소류', itemCode: '113', itemName: '양배추',    unitName: 'kg' },
  { categoryCode: '100', categoryName: '채소류', itemCode: '114', itemName: '시금치',    unitName: 'kg' },
  { categoryCode: '100', categoryName: '채소류', itemCode: '115', itemName: '상추',      unitName: 'kg' },
  { categoryCode: '100', categoryName: '채소류', itemCode: '116', itemName: '미나리',    unitName: 'kg' },
  { categoryCode: '100', categoryName: '채소류', itemCode: '117', itemName: '깻잎',      unitName: 'kg' },
  { categoryCode: '100', categoryName: '채소류', itemCode: '121', itemName: '부추',      unitName: 'kg' },
  { categoryCode: '100', categoryName: '채소류', itemCode: '131', itemName: '오이',      unitName: 'kg' },
  { categoryCode: '100', categoryName: '채소류', itemCode: '132', itemName: '애호박',    unitName: 'kg' },
  { categoryCode: '100', categoryName: '채소류', itemCode: '133', itemName: '가지',      unitName: 'kg' },
  { categoryCode: '100', categoryName: '채소류', itemCode: '134', itemName: '토마토',    unitName: 'kg' },
  { categoryCode: '100', categoryName: '채소류', itemCode: '135', itemName: '방울토마토',unitName: 'kg' },
  { categoryCode: '100', categoryName: '채소류', itemCode: '136', itemName: '파프리카',  unitName: 'kg' },
  // 양념류
  { categoryCode: '200', categoryName: '양념류', itemCode: '211', itemName: '건고추',    unitName: 'kg' },
  { categoryCode: '200', categoryName: '양념류', itemCode: '215', itemName: '마늘',      unitName: 'kg' },
  { categoryCode: '200', categoryName: '양념류', itemCode: '216', itemName: '양파',      unitName: 'kg' },
  { categoryCode: '200', categoryName: '양념류', itemCode: '217', itemName: '대파',      unitName: 'kg' },
  { categoryCode: '200', categoryName: '양념류', itemCode: '218', itemName: '쪽파',      unitName: 'kg' },
  { categoryCode: '200', categoryName: '양념류', itemCode: '219', itemName: '생강',      unitName: 'kg' },
  // 서류
  { categoryCode: '300', categoryName: '서류',   itemCode: '221', itemName: '감자',      unitName: 'kg' },
  { categoryCode: '300', categoryName: '서류',   itemCode: '222', itemName: '고구마',    unitName: 'kg' },
  // 과일류
  { categoryCode: '400', categoryName: '과일류', itemCode: '411', itemName: '사과',      unitName: 'kg' },
  { categoryCode: '400', categoryName: '과일류', itemCode: '412', itemName: '배',        unitName: 'kg' },
  { categoryCode: '400', categoryName: '과일류', itemCode: '413', itemName: '감귤',      unitName: 'kg' },
  { categoryCode: '400', categoryName: '과일류', itemCode: '414', itemName: '단감',      unitName: 'kg' },
  { categoryCode: '400', categoryName: '과일류', itemCode: '415', itemName: '수박',      unitName: 'kg' },
  { categoryCode: '400', categoryName: '과일류', itemCode: '416', itemName: '참외',      unitName: 'kg' },
  { categoryCode: '400', categoryName: '과일류', itemCode: '417', itemName: '딸기',      unitName: 'kg' },
  { categoryCode: '400', categoryName: '과일류', itemCode: '418', itemName: '포도',      unitName: 'kg' },
  { categoryCode: '400', categoryName: '과일류', itemCode: '419', itemName: '복숭아',    unitName: 'kg' },
  { categoryCode: '400', categoryName: '과일류', itemCode: '431', itemName: '바나나',    unitName: 'kg' },
  { categoryCode: '400', categoryName: '과일류', itemCode: '432', itemName: '키위',      unitName: 'kg' },
  { categoryCode: '400', categoryName: '과일류', itemCode: '435', itemName: '한라봉',    unitName: 'kg' },
  { categoryCode: '400', categoryName: '과일류', itemCode: '437', itemName: '메론',      unitName: 'kg' },
  // 축산물
  { categoryCode: '500', categoryName: '축산물', itemCode: '511', itemName: '쇠고기',    unitName: 'kg' },
  { categoryCode: '500', categoryName: '축산물', itemCode: '512', itemName: '돼지고기',  unitName: 'kg' },
  { categoryCode: '500', categoryName: '축산물', itemCode: '513', itemName: '닭고기',    unitName: 'kg' },
  { categoryCode: '500', categoryName: '축산물', itemCode: '514', itemName: '계란',      unitName: '개' },
  // 수산물
  { categoryCode: '600', categoryName: '수산물', itemCode: '611', itemName: '고등어',    unitName: 'kg' },
  { categoryCode: '600', categoryName: '수산물', itemCode: '612', itemName: '갈치',      unitName: 'kg' },
  { categoryCode: '600', categoryName: '수산물', itemCode: '613', itemName: '오징어',    unitName: 'kg' },
  { categoryCode: '600', categoryName: '수산물', itemCode: '614', itemName: '꽃게',      unitName: 'kg' },
  { categoryCode: '600', categoryName: '수산물', itemCode: '615', itemName: '전복',      unitName: 'kg' },
  { categoryCode: '600', categoryName: '수산물', itemCode: '616', itemName: '굴',        unitName: 'kg' },
  { categoryCode: '600', categoryName: '수산물', itemCode: '617', itemName: '명태',      unitName: 'kg' },
  { categoryCode: '600', categoryName: '수산물', itemCode: '619', itemName: '새우',      unitName: 'kg' },
  { categoryCode: '600', categoryName: '수산물', itemCode: '621', itemName: '낙지',      unitName: 'kg' },
  { categoryCode: '600', categoryName: '수산물', itemCode: '623', itemName: '미역',      unitName: 'kg' },
  { categoryCode: '600', categoryName: '수산물', itemCode: '624', itemName: '김',        unitName: 'kg' },
  // 곡류
  { categoryCode: '700', categoryName: '곡류',   itemCode: '711', itemName: '쌀',        unitName: 'kg' },
  { categoryCode: '700', categoryName: '곡류',   itemCode: '712', itemName: '찹쌀',      unitName: 'kg' },
  { categoryCode: '700', categoryName: '곡류',   itemCode: '713', itemName: '콩',        unitName: 'kg' },
];

async function main() {
  console.log('Seed start...');
  for (const m of MARKETS) {
    await prisma.market.upsert({ where: { code: m.code }, update: { name: m.name }, create: { ...m, isActive: true } });
  }
  console.log(`Markets: ${MARKETS.length}`);
  for (const item of ITEMS) {
    await prisma.item.upsert({ where: { itemCode: item.itemCode }, update: { itemName: item.itemName }, create: { ...item, isActive: true } });
  }
  console.log(`Items: ${ITEMS.length}`);
  console.log('Seed done!');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
