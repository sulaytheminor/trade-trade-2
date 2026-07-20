"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData
} from "lightweight-charts";
import { DexPair } from "@/lib/dexscreener";
import { getOhlcv, CandlePoint } from "@/lib/geckoterminal";

const TIMEFRAMES = ["1s", "5s", "1m", "5m", "15m", "1H", "4H", "1D"];

export function TradingChart({ pair }: { pair: DexPair | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const [timeframe, setTimeframe] = useState("1H");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#000000" },
        textColor: "#8A8A8A",
        fontFamily: "JetBrains Mono, monospace"
      },
      grid: {
        vertLines: { color: "#1F1F1F" },
        horzLines: { color: "#1F1F1F" }
      },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: "#1F1F1F" },
      timeScale: { borderColor: "#1F1F1F", timeVisible: true, secondsVisible: true },
      width: containerRef.current.clientWidth,
      height: 480
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#1FCB6B",
      downColor: "#FF3B3B",
      borderVisible: false,
      wickUpColor: "#1FCB6B",
      wickDownColor: "#FF3B3B"
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
      color: "#2F6BFF"
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!pair || !candleSeriesRef.current || !volumeSeriesRef.current) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        let effectiveTimeframe = timeframe;
        let data: CandlePoint[];
        try {
          data = await getOhlcv(pair.pairAddress, effectiveTimeframe);
        } catch (err) {
          if (timeframe === "1s" || timeframe === "5s") {
            effectiveTimeframe = "1m";
            setError("Second-level charts require a paid data plan — showing 1m instead.");
            data = await getOhlcv(pair.pairAddress, effectiveTimeframe);
          } else {
            throw err;
          }
        }

        if (cancelled) return;

        const candles: CandlestickData[] = data.map((c) => ({
          time: c.time as unknown as CandlestickData["time"],
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close
        }));
        const volumes: HistogramData[] = data.map((c) => ({
          time: c.time as unknown as HistogramData["time"],
          value: c.volume,
          color: c.close >= c.open ? "#1FCB6B55" : "#FF3B3B55"
        }));

        candleSeriesRef.current?.setData(candles);
        volumeSeriesRef.current?.setData(volumes);
        chartRef.current?.timeScale().fitContent();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load chart data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [pair, timeframe]);

  return (
    <div className="flex flex-col h-full border border-border bg-panel">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-1 text-xs mono border ${
                timeframe === tf
                  ? "bg-blue border-blue text-white"
                  : "border-border text-muted hover:text-white hover:border-white"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
        {pair && (
          <div className="mono text-xs text-muted">
            {pair.baseToken.symbol}/{pair.quoteToken.symbol} — {pair.dexId}
          </div>
        )}
      </div>
      {error && (
        <div className="px-3 py-1 text-xs text-orange border-b border-border">{error}</div>
      )}
      {!pair ? (
        <div className="flex-1 flex items-center justify-center text-muted text-sm">
          Search and select a token to load its chart.
        </div>
      ) : (
        <div ref={containerRef} className="w-full" />
      )}
      {loading && <div className="px-3 py-1 text-xs text-muted">Loading candles…</div>}
    </div>
  );
}
