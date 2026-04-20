declare module "react-sparklines" {
  import { ComponentType, CSSProperties } from "react";

  interface SparklinesProps {
    data:     number[];
    limit?:   number;
    width?:   number;
    height?:  number;
    svgWidth?:  number;
    svgHeight?: number;
    preserveAspectRatio?: string;
    margin?:  number;
    min?:     number;
    max?:     number;
    style?:   CSSProperties;
    children?: React.ReactNode;
  }

  interface SparklinesLineProps {
    color?:  string;
    style?:  CSSProperties;
    onMouseMove?: (event: string, value: number) => void;
  }

  interface SparklinesReferenceLineProps {
    type?:  "max" | "min" | "mean" | "avg" | "median" | "custom";
    value?: number;
    style?: CSSProperties;
  }

  export const Sparklines:              ComponentType<SparklinesProps>;
  export const SparklinesLine:          ComponentType<SparklinesLineProps>;
  export const SparklinesReferenceLine: ComponentType<SparklinesReferenceLineProps>;
  export const SparklinesSpots:         ComponentType<{ size?: number; style?: CSSProperties }>;
  export const SparklinesNormalBand:    ComponentType<{ style?: CSSProperties }>;
  export const SparklinesBars:          ComponentType<{ style?: CSSProperties; barWidth?: number }>;
}
