/**
 * 순수 View 기반 캔들스틱 차트 (외부 라이브러리 없음)
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export interface Candle {
  date: string;    // 표시용 라벨 (예: "4/28")
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface Props {
  data: Candle[];
  height?: number;
  upColor?: string;
  downColor?: string;
}

const CHART_HEIGHT = 200;
const CANDLE_WIDTH = 10;
const WICK_WIDTH   = 2;
const PADDING      = { top: 16, bottom: 32 };

export default function CandlestickChart({
  data,
  height = CHART_HEIGHT,
  upColor   = '#1B8A4E',
  downColor = '#C62828',
}: Props) {
  const visibleData = data.slice(-28); // 최근 28개만

  const { minPrice, maxPrice, priceRange } = useMemo(() => {
    const allLows  = visibleData.map((c) => c.low);
    const allHighs = visibleData.map((c) => c.high);
    const minPrice = Math.min(...allLows);
    const maxPrice = Math.max(...allHighs);
    const priceRange = maxPrice - minPrice || 1;
    return { minPrice, maxPrice, priceRange };
  }, [visibleData]);

  const chartH = height - PADDING.top - PADDING.bottom;

  function toY(price: number) {
    return chartH - ((price - minPrice) / priceRange) * chartH;
  }

  const priceLabels = useMemo(() => {
    const count = 4;
    return Array.from({ length: count + 1 }, (_, i) => {
      const v = minPrice + (priceRange * i) / count;
      return { y: chartH - (i / count) * chartH, label: Math.round(v).toLocaleString('ko-KR') };
    });
  }, [minPrice, priceRange, chartH]);

  if (!visibleData.length) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>데이터 없음</Text>
      </View>
    );
  }

  const totalWidth = visibleData.length * (CANDLE_WIDTH + 4) + 4;

  return (
    <View style={{ height: height + PADDING.top + PADDING.bottom }}>
      {/* 가격 라벨 (Y축) */}
      <View style={[styles.yAxis, { top: PADDING.top, height: chartH }]}>
        {priceLabels.map((l) => (
          <Text
            key={l.label}
            style={[styles.yLabel, { position: 'absolute', top: l.y - 7 }]}
          >
            {l.label}
          </Text>
        ))}
      </View>

      {/* 차트 스크롤 영역 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginLeft: 52 }}
        contentContainerStyle={{ paddingRight: 8 }}
      >
        {/* 수평 그리드 라인 */}
        <View style={{ width: totalWidth, height: chartH + PADDING.top + PADDING.bottom }}>
          <View style={{ position: 'absolute', top: PADDING.top, left: 0, right: 0, height: chartH }}>
            {priceLabels.map((l) => (
              <View
                key={l.label}
                style={[styles.gridLine, { top: l.y }]}
              />
            ))}

            {/* 캔들 */}
            {visibleData.map((candle, i) => {
              const isUp    = candle.close >= candle.open;
              const color   = isUp ? upColor : downColor;
              const bodyTop = toY(Math.max(candle.open, candle.close));
              const bodyH   = Math.max(Math.abs(toY(candle.open) - toY(candle.close)), 2);
              const wickTop = toY(candle.high);
              const wickH   = Math.max(toY(candle.low) - toY(candle.high), 1);
              const x       = i * (CANDLE_WIDTH + 4) + 2;
              const candleCenterX = x + CANDLE_WIDTH / 2 - WICK_WIDTH / 2;

              return (
                <View key={candle.date} style={{ position: 'absolute', left: x, width: CANDLE_WIDTH }}>
                  {/* Wick (고저) */}
                  <View
                    style={{
                      position: 'absolute',
                      left: CANDLE_WIDTH / 2 - WICK_WIDTH / 2,
                      top: wickTop,
                      width: WICK_WIDTH,
                      height: wickH,
                      backgroundColor: color,
                    }}
                  />
                  {/* Body (시가~종가) */}
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: bodyTop,
                      width: CANDLE_WIDTH,
                      height: bodyH,
                      backgroundColor: isUp ? color : color,
                      borderWidth: isUp ? 0 : 0,
                      opacity: isUp ? 1 : 0.85,
                    }}
                  />
                </View>
              );
            })}
          </View>

          {/* X축 날짜 라벨 */}
          <View style={{ position: 'absolute', bottom: 4, left: 0, right: 0, flexDirection: 'row' }}>
            {visibleData.map((candle, i) => {
              const showLabel = i % Math.max(1, Math.floor(visibleData.length / 6)) === 0;
              if (!showLabel) return <View key={candle.date} style={{ width: CANDLE_WIDTH + 4 }} />;
              return (
                <Text
                  key={candle.date}
                  style={[styles.xLabel, { width: CANDLE_WIDTH + 4 }]}
                  numberOfLines={1}
                >
                  {candle.date}
                </Text>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  empty:     { justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#9CA3AF', fontSize: 13 },
  yAxis:     { position: 'absolute', left: 0, width: 50 },
  yLabel:    { fontSize: 10, color: '#9CA3AF', textAlign: 'right', width: 46 },
  gridLine:  { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#F3F4F6' },
  xLabel:    { fontSize: 9, color: '#9CA3AF', textAlign: 'center' },
});
