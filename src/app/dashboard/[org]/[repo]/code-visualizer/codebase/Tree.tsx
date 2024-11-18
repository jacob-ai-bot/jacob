import React, { useMemo, useRef, useState } from "react";
import {
  extent,
  forceCollide,
  forceSimulation,
  forceX,
  forceY,
  hierarchy,
  pack,
  range,
  scaleLinear,
  scaleSqrt,
  timeFormat,
} from "d3";
import { type FileType } from "./types";
import countBy from "lodash/countBy";
import maxBy from "lodash/maxBy";
import entries from "lodash/entries";
import uniqBy from "lodash/uniqBy";
import flatten from "lodash/flatten";
import defaultFileColors from "./language-colors.json";
import { CircleText } from "./CircleText";
import { keepBetween, keepCircleInsideCircle, truncateString } from "./utils";
import { type ContextItem } from "~/server/utils/codebaseContext";
import { standardizePath } from "~/app/utils";

type Props = {
  data: FileType;
  filesChanged: string[];
  maxDepth: number;
  colorEncoding: "type" | "number-of-changes" | "last-change";
  customFileColors?: Record<string, string>;
  onNodeClick?: (path: string) => void;
  width?: number;
  height?: number;
  selectedItem?: ContextItem | null;
  selectedFolder?: string | null;
  viewMode: "folder" | "taxonomy";
  theme: "light" | "dark";
  scalingMode: "size" | "importance";
};

type ExtendedFileType = {
  extension?: string;
  pathWithoutExtension?: string;
  label?: string;
  color?: string;
  value?: number;
  sortOrder?: number;
  fileColors?: Record<string, string>;
} & FileType;

type ProcessedDataItem = {
  data: ExtendedFileType;
  depth: number;
  height: number;
  r: number;
  x: number;
  y: number;
  parent: ProcessedDataItem | null;
  children: Array<ProcessedDataItem>;
};

const looseFilesId = "__structure_loose_file__";
const maxChildren = 9000;
const lastCommitAccessor = (d) => new Date(d.commits?.[0]?.date + "0");
const numberOfCommitsAccessor = (d) => d?.commits?.length || 0;

const getWeightedCircleSize = (textLength: number, importance: number) => {
  const sizeFromLength = Math.floor(textLength / 50);
  return sizeFromLength + importance;
};

export const Tree = ({
  data,
  filesChanged = [],
  maxDepth = 12,
  colorEncoding = "type",
  customFileColors,
  onNodeClick,
  height = 1000,
  width = 1000,
  selectedItem = null,
  selectedFolder = null,
  viewMode = "folder",
  theme = "light",
  scalingMode = "size",
}: Props) => {
  const fileColors = { ...defaultFileColors, ...customFileColors };
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const cachedPositions = useRef<Record<string, [number, number]>>({});
  const cachedOrders = useRef<Record<string, string[]>>({});

  const { colorScale, colorExtent } = useMemo(() => {
    if (!data) return { colorScale: () => {}, colorExtent: [0, 0] };
    const flattenTree = (d) => {
      return d.children ? flatten(d.children.map(flattenTree)) : d;
    };
    const items = flattenTree(data);
    const flatTree =
      colorEncoding === "last-change"
        ? items
            .map(lastCommitAccessor)
            .sort((a, b) => b - a)
            .slice(0, -8)
        : items
            .map(numberOfCommitsAccessor)
            .sort((a, b) => b - a)
            .slice(2, -2);
    const colorExtent = extent(flatTree);
    const colors = [
      "#f4f4f4",
      "#f4f4f4",
      "#f4f4f4",
      colorEncoding === "last-change" ? "#C7ECEE" : "#FEEAA7",
      colorEncoding === "number-of-changes" ? "#3C40C6" : "#823471",
    ];
    const colorScale = scaleLinear()
      .domain(
        range(0, colors.length).map(
          (i) =>
            +colorExtent[0] +
            ((colorExtent[1] - colorExtent[0]) * i) / (colors.length - 1),
        ),
      )
      .range(colors)
      .clamp(true);
    return { colorScale, colorExtent };
  }, [data]);

  const generateColorByDepth = (filePath: string) => {
    const blueGrayPalette = [
      "#E0F2F1",
      "#FFCCBC",
      "#D1C4E9",
      "#C5CAE9",
      "#BBDEFB",
      "#B2EBF2",
      "#B2DFDB",
      "#E0E7FF",
      "#D7E3FC",
    ];

    const parts = (filePath ?? "").split("/").filter(Boolean);
    const lastFolder = parts.length > 1 ? parts[parts.length - 2] : parts[0];
    return blueGrayPalette[(lastFolder ?? "").length % blueGrayPalette.length];
  };

  const getColor = (d) => {
    return generateColorByDepth(d.path ?? d.taxonomy);
    if (colorEncoding === "type") {
      const isParent = d.children;
      if (isParent) {
        const extensions = countBy(d.children, (c) => c.extension);
        const mainExtension = maxBy(entries(extensions), ([k, v]) => v)?.[0];
        return fileColors[mainExtension] || "#CED6E0";
      }
      return fileColors[d.extension] || "#CED6E0";
    } else if (colorEncoding === "number-of-changes") {
      return colorScale(numberOfCommitsAccessor(d)) || "#f4f4f4";
    } else if (colorEncoding === "last-change") {
      return colorScale(lastCommitAccessor(d)) || "#f4f4f4";
    }
  };

  const packedData = useMemo(() => {
    if (!data) return [];
    const hierarchicalData = hierarchy(
      processChild(
        data,
        getColor,
        cachedOrders.current,
        0,
        fileColors,
        viewMode,
        scalingMode,
      ),
    )
      .sum((d) => d.value)
      .sort((a, b) => {
        if (b.data?.path?.startsWith("src/fonts")) {
        }
        return (
          b.data.sortOrder - a.data.sortOrder ||
          (b.data.name > a.data.name ? 1 : -1)
        );
      });

    const packedTree = pack()
      .size([width, height * 1.3])
      .padding((d) => {
        if (d.depth <= 0) return 0;
        const hasChildWithNoChildren =
          d.children.filter((d) => !d.children?.length).length > 1;
        if (hasChildWithNoChildren) return 5;
        return 13;
      })(hierarchicalData);
    packedTree.children = reflowSiblings(
      packedTree.children,
      cachedPositions.current,
      maxDepth,
      height,
      width,
    );
    const children = packedTree.descendants() as ProcessedDataItem[];

    cachedOrders.current = {};
    cachedPositions.current = {};
    const saveCachedPositionForItem = (item) => {
      cachedOrders.current[item.data.path] = item.data.sortOrder;
      if (item.children) {
        item.children.forEach(saveCachedPositionForItem);
      }
    };
    saveCachedPositionForItem(packedTree);
    children.forEach((d) => {
      cachedPositions.current[d.data.path] = [d.x, d.y];
    });

    return children.slice(0, maxChildren);
  }, [data, fileColors, viewMode, scalingMode]);

  const selectedNode =
    selectedNodeId && packedData.find((d) => d.data.path === selectedNodeId);

  const fileTypes = uniqBy(
    packedData.map((d) => fileColors[d.data.extension] && d.data.extension),
  )
    .sort()
    .filter(Boolean);

  return (
    <svg
      width={width}
      height={height}
      style={{
        background: "transparent",
        fontFamily: "sans-serif",
        overflow: "visible",
      }}
      xmlns="http://www.w3.org/2000/svg"
      onClick={(e) => {
        const parent = selectedFolder?.split("/").slice(0, -1).join("/");
        onNodeClick && parent ? onNodeClick(parent) : null;
      }}
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {packedData.map(({ x, y, r, depth, data, children, ...d }) => {
        if (depth <= 0) return null;
        if (depth > maxDepth) return null;
        const isOutOfDepth = depth >= maxDepth;
        const isParent = !!children;
        const runningR =
          scalingMode === "importance"
            ? getWeightedCircleSize(
                data.text?.length ?? 0,
                data.importance ?? 0,
              )
            : r;
        if (data.path === looseFilesId) return null;
        const isHighlighted =
          viewMode === "folder"
            ? selectedItem?.file === standardizePath(data.path)
            : selectedItem?.file === standardizePath(data.file);
        const doHighlight = !!selectedItem;

        return (
          <g
            key={data.path + data.file + data.name + data.taxonomy}
            style={{
              fill: isHighlighted ? "#FFF9C4" : data.color,
              transition: `transform ${
                isHighlighted ? "0.5s" : "0s"
              } ease-out, fill 0.1s ease-out`,
            }}
            stroke="#000000"
            strokeWidth={5}
            transform={`translate(${x}, ${y})`}
            onClick={(e) => {
              e.stopPropagation();
              onNodeClick?.(viewMode === "folder" ? data.path : data.taxonomy);
            }}
          >
            {isParent ? (
              <>
                <circle
                  r={r}
                  style={{ transition: "all 0.5s ease-out" }}
                  stroke={theme === "dark" ? "#290819" : "#00c8ff"}
                  strokeOpacity="0.5"
                  strokeWidth="1"
                  fill="white"
                  fillOpacity={0.1}
                />
              </>
            ) : (
              <circle
                style={{
                  transition: "all 0.5s ease-out",
                }}
                r={runningR}
                strokeWidth={isHighlighted ? "5" : "2"}
                stroke={
                  isHighlighted
                    ? "#290819"
                    : theme === "dark"
                      ? "#290819"
                      : "#29081922"
                }
              />
            )}
          </g>
        );
      })}

      {packedData.map(({ x, y, r, depth, data, children }) => {
        if (depth <= 0) return null;
        if (depth > maxDepth) return null;
        const isParent = !!children && depth !== maxDepth;
        if (!isParent) return null;
        if (data.path === looseFilesId) return null;
        if (r < 16 && selectedNodeId !== data.path) return null;
        if (data.label.length > r * 0.5) return null;

        const label = truncateString(
          data.label,
          r < 30 ? Math.floor(r / 2.7) + 3 : 100,
        )?.replaceAll("_", " ");

        const offsetR = r + 12 - depth * 4;
        const fontSize = 16 - depth;

        return (
          <g
            key={data.path + data.file + data.name + data.taxonomy}
            style={{ pointerEvents: "none", transition: "all 0.5s ease-out" }}
            transform={`translate(${x}, ${y})`}
            onClick={(e) => {
              e.stopPropagation();
              onNodeClick?.(data.path);
            }}
          >
            <CircleText
              style={{ fontSize, transition: "all 0.5s ease-out" }}
              r={Math.max(20, offsetR - 3)}
              fill={theme === "dark" ? "#E0E7FF" : "#374151"}
              stroke={theme === "dark" ? "#334155" : "white"}
              strokeWidth={theme === "dark" ? "3" : "6"}
              strokeOpacity={0.9 - depth * 0.2}
              rotate={depth * 1 - 0}
              text={label}
            />
            <CircleText
              style={{ fontSize, transition: "all 0.5s ease-out" }}
              fill={theme === "dark" ? "#E0E7FF" : "#374151"}
              rotate={depth * 1 - 0}
              r={Math.max(20, offsetR - 3)}
              text={label}
            />
          </g>
        );
      })}

      {packedData.map(({ x, y, r, depth, data, children }) => {
        if (depth <= 0) return null;
        if (depth > maxDepth) return null;
        const isParent = !!children;
        if (data.path === looseFilesId) return null;
        const isHighlighted =
          viewMode === "folder"
            ? selectedItem?.file === standardizePath(data.path)
            : selectedItem?.file === standardizePath(data.file);

        const doHighlight = false;
        if (isParent && !isHighlighted) return null;
        if (selectedNodeId === data.path && !isHighlighted) return null;
        if (!(isHighlighted || (!doHighlight && !selectedNode && r > 22))) {
          return null;
        }

        const label = isHighlighted
          ? data.label
          : truncateString(data.label, Math.floor(r / 4) + 3);

        return (
          <g
            key={data.path + data.file + data.name + data.taxonomy}
            style={{
              fill: data.color,
              transition: `transform ${isHighlighted ? "0.5s" : "0s"} ease-out`,
            }}
            transform={`translate(${x}, ${y})`}
            onClick={(e) => {
              e.stopPropagation();
              onNodeClick?.(viewMode === "folder" ? data.path : data.taxonomy);
            }}
          >
            <text
              style={{
                pointerEvents: "none",
                opacity: 0.9,
                fontSize: "14px",
                fontWeight: isHighlighted ? 800 : 500,
                transition: "all 0.5s ease-out",
              }}
              fill="#4B5563"
              textAnchor="middle"
              dominantBaseline="middle"
              stroke={isHighlighted ? "#FFF9C4" : data.color}
              strokeWidth="5"
              strokeOpacity={1}
              strokeLinejoin="round"
            >
              {label}
            </text>
            <text
              style={{
                pointerEvents: "none",
                opacity: 1,
                fontSize: "14px",
                fontWeight: isHighlighted ? 800 : 500,
                transition: "all 0.5s ease-out",
              }}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {label}
            </text>
            <text
              style={{
                pointerEvents: "none",
                opacity: 0.9,
                fontSize: "14px",
                fontWeight: isHighlighted ? 800 : 500,
                transition: "all 0.5s ease-out",
              }}
              fill="#110101"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const formatD = (d) => (typeof d === "number" ? d : timeFormat("%b %Y")(d));
const ColorLegend = ({ scale, extent, colorEncoding }) => {
  if (!scale?.ticks) return null;
  const ticks = scale.ticks(10);
  return (
    <g transform={`translate(${width - 160}, ${height - 90})`}>
      <text x={50} y="-5" fontSize="10" textAnchor="middle">
        {colorEncoding === "number-of-changes"
          ? "Number of changes"
          : "Last change date"}
      </text>
      <linearGradient id="gradient">
        {ticks.map((tick, i) => {
          const color = scale(tick);
          return (
            <stop offset={i / (ticks.length - 1)} stopColor={color} key={i} />
          );
        })}
      </linearGradient>
      <rect x="0" width="100" height="13" fill="url(#gradient)" />
      {extent.map((d, i) => (
        <text
          key={i}
          x={i ? 100 : 0}
          y="23"
          fontSize="10"
          textAnchor={i ? "end" : "start"}
        >
          {formatD(d)}
        </text>
      ))}
    </g>
  );
};

const processChild = (
  child: FileType,
  getColor,
  cachedOrders,
  i = 0,
  fileColors,
  viewMode,
  scalingMode,
): ExtendedFileType => {
  if (!child) return;
  const isRoot = !child.path;
  let name = child.name;
  let path = viewMode === "folder" ? child.path : child.taxonomy;
  let children = child?.children?.map((c, i) =>
    processChild(
      c,
      getColor,
      cachedOrders,
      i,
      fileColors,
      viewMode,
      scalingMode,
    ),
  );

  if (children?.length === 1 && children[0].children?.length > 0) {
    name = `${name}/${children[0].name}`;
    path = children[0].path;
    children = children[0].children;
  }
  const pathWithoutExtension = path?.split(".").slice(0, -1).join(".");
  const extension = name?.split(".").slice(-1)[0];
  const hasExtension = !!fileColors[extension];

  if (isRoot && children) {
    const looseChildren = children?.filter((d) => !d.children?.length);
    children = [
      ...children?.filter((d) => d.children?.length),
      {
        name: looseFilesId,
        path: looseFilesId,
        size: 0,
        children: looseChildren,
      },
    ];
  }

  const extendedChild = {
    ...child,
    name,
    path,
    label: name,
    extension,
    pathWithoutExtension,
    size:
      scalingMode === "importance"
        ? getWeightedCircleSize(child.size, child.importance ?? 0)
        : (["woff", "woff2", "ttf", "otf", "png", "jpg", "svg"].includes(
            extension,
          )
            ? 100
            : Math.min(
                15000,
                hasExtension ? child.size : Math.min(child.size, 9000),
              )) + i,
    value:
      scalingMode === "importance"
        ? getWeightedCircleSize(child.size, child.importance ?? 0)
        : (["woff", "woff2", "ttf", "otf", "png", "jpg", "svg"].includes(
            extension,
          )
            ? 100
            : Math.min(
                15000,
                hasExtension ? child.size : Math.min(child.size, 9000),
              )) + i,
    color: "#fff",
    children,
  };
  extendedChild.color = getColor(extendedChild);
  extendedChild.sortOrder = getSortOrder(extendedChild, cachedOrders, i);

  return extendedChild;
};

const reflowSiblings = (
  siblings: ProcessedDataItem[],
  cachedPositions: Record<string, [number, number]> = {},
  maxDepth: number,
  height: number,
  width: number,
  parentRadius?: number,
  parentPosition?: [number, number],
) => {
  if (!siblings) return;
  const items = [
    ...siblings.map((d) => {
      return {
        ...d,
        x: cachedPositions[d.data.path]?.[0] || d.x,
        y: cachedPositions[d.data.path]?.[1] || d.y,
        originalX: d.x,
        originalY: d.y,
      };
    }),
  ];
  const paddingScale = scaleSqrt()
    .domain([maxDepth, 1])
    .range([3, 8])
    .clamp(true);
  const simulation = forceSimulation(items)
    .force(
      "centerX",
      forceX(width / 2).strength(items[0].depth <= 2 ? 0.01 : 0),
    )
    .force(
      "centerY",
      forceY(height / 2).strength(items[0].depth <= 2 ? 0.01 : 0),
    )
    .force(
      "centerX2",
      forceX(parentPosition?.[0]).strength(parentPosition ? 0.3 : 0),
    )
    .force(
      "centerY2",
      forceY(parentPosition?.[1]).strength(parentPosition ? 0.8 : 0),
    )
    .force(
      "x",
      forceX((d) => cachedPositions[d.data.path]?.[0] || width / 2).strength(
        (d) =>
          cachedPositions[d.data.path]?.[1] ? 0.5 : (width / height) * 0.3,
      ),
    )
    .force(
      "y",
      forceY((d) => cachedPositions[d.data.path]?.[1] || height / 2).strength(
        (d) =>
          cachedPositions[d.data.path]?.[0] ? 0.5 : (height / width) * 0.3,
      ),
    )
    .force(
      "collide",
      forceCollide((d) =>
        d.children ? d.r + paddingScale(d.depth) : d.r + 1.6,
      )
        .iterations(8)
        .strength(1),
    )
    .stop();

  for (let i = 0; i < 280; i++) {
    simulation.tick();
    items.forEach((d) => {
      d.x = keepBetween(d.r, d.x, width - d.r);
      d.y = keepBetween(d.r, d.y, height - d.r);

      if (parentPosition && parentRadius) {
        const containedPosition = keepCircleInsideCircle(
          parentRadius,
          parentPosition,
          d.r,
          [d.x, d.y],
          !!d.children?.length,
        );
        d.x = containedPosition[0];
        d.y = containedPosition[1];
      }
    });
  }
  const repositionChildren = (d, xDiff, yDiff) => {
    const newD = { ...d };
    newD.x += xDiff;
    newD.y += yDiff;
    if (newD.children) {
      newD.children = newD.children.map((c) =>
        repositionChildren(c, xDiff, yDiff),
      );
    }
    return newD;
  };
  for (const item of items) {
    const itemCachedPosition = cachedPositions[item.data.path] || [
      item.x,
      item.y,
    ];
    const itemPositionDiffFromCached = [
      item.x - itemCachedPosition[0],
      item.y - itemCachedPosition[1],
    ];

    if (item.children) {
      const repositionedCachedPositions = { ...cachedPositions };
      const itemReflowDiff = [item.x - item.originalX, item.y - item.originalY];

      item.children = item.children.map((child) =>
        repositionChildren(child, itemReflowDiff[0], itemReflowDiff[1]),
      );
      if (item.children.length > 4) {
        if (item.depth > maxDepth) return;
        item.children.forEach((child) => {
          const childCachedPosition =
            repositionedCachedPositions[child.data.path];
          if (childCachedPosition) {
            repositionedCachedPositions[child.data.path] = [
              childCachedPosition[0] + itemPositionDiffFromCached[0],
              childCachedPosition[1] + itemPositionDiffFromCached[1],
            ];
          } else {
            repositionedCachedPositions[child.data.path] = [child.x, child.y];
          }
        });
        item.children = reflowSiblings(
          item.children,
          repositionedCachedPositions,
          maxDepth,
          height,
          width,
          item.r,
          [item.x, item.y],
        );
      }
    }
  }
  return items;
};

const getSortOrder = (item: ExtendedFileType, cachedOrders, i = 0) => {
  if (cachedOrders[item.path]) return cachedOrders[item.path];
  if (cachedOrders[item.path?.split("/")?.slice(0, -1)?.join("/")]) {
    return -100000000;
  }
  if (item.name === "public") return -1000000;
  return item.value + -i;
};
