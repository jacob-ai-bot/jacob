// Note: this code is adopted from the GitHub Next repo visualization tool.
// It is MIT licensed and can be found here: https://github.com/githubocto/repo-visualizer
// We are ignoring build issues for this file since it is not part of the main application code.
// @ts-nocheck
/* eslint-disable */

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
// file colors are from the github/linguist repo
import defaultFileColors from "./language-colors.json";
import { CircleText } from "./CircleText";
import { keepBetween, keepCircleInsideCircle, truncateString } from "./utils";
import { type ContextItem } from "~/server/utils/codebaseContext";

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
    // @ts-ignore
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

    // const valueScale = scaleLog()
    //   .domain(colorExtent)
    //   .range([0, 1])
    //   .clamp(true);
    // const colorScale = scaleSequential((d) => interpolateBuPu(valueScale(d)));
    const colors = [
      "#f4f4f4",
      "#f4f4f4",
      "#f4f4f4",
      // @ts-ignore
      colorEncoding === "last-change" ? "#C7ECEE" : "#FEEAA7",
      // @ts-ignore
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
      "#E0F2F1", // Very light teal
      "#DCEDC8", // Light lime
      "#FFF9C4", // Light yellow
      "#FFECB3", // Light amber
      "#FFCCBC", // Light deep orange
      "#D1C4E9", // Light purple
      "#C5CAE9", // Light indigo
      "#BBDEFB", // Light blue
      "#B2EBF2", // Light cyan
      "#B2DFDB", // Light teal
    ];

    // Split the file path into parts
    const parts = (filePath ?? "").split("/").filter(Boolean); // filter(Boolean) removes empty strings

    const lastFolder = parts.length > 1 ? parts[parts.length - 2] : parts[0];
    // return a random color but keep it the same for each filePath so it's stable, mod on the length of the file path
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
      ),
    )
      .sum((d) => d.value)
      .sort((a, b) => {
        if (b.data?.path?.startsWith("src/fonts")) {
          //   a.data.sortOrder,
          //   b.data.sortOrder,
          //   (b.data.sortOrder - a.data.sortOrder) ||
          //     (b.data.name > a.data.name ? 1 : -1),
          //   a,
          //   b,
          // );
        }
        return (
          b.data.sortOrder - a.data.sortOrder ||
          (b.data.name > a.data.name ? 1 : -1)
        );
      });

    const packedTree = pack()
      .size([width, height * 1.3]) // we'll reflow the tree to be more horizontal, but we want larger bubbles (.pack() sizes the bubbles to fit the space)
      .padding((d) => {
        if (d.depth <= 0) return 0;
        const hasChildWithNoChildren =
          d.children.filter((d) => !d.children?.length).length > 1;
        if (hasChildWithNoChildren) return 5;
        return 13;
        // const hasChildren = !!d.children?.find((d) => d?.children?.length);
        // return hasChildren ? 60 : 8;
        // return [60, 20, 12][d.depth] || 5;
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
  }, [data, fileColors, viewMode]);

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
        // if there's a selected node, grab the parent node and call onNodeClick with the parent node's path
        // otherwise, call onNodeClick with null to deselect the node
        debugger;
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
        const runningR = r;
        // if (depth <= 1 && !children) runningR *= 3;
        if (data.path === looseFilesId) return null;
        const isHighlighted =
          viewMode === "folder"
            ? selectedItem?.file?.includes(data.path)
            : selectedItem?.file?.includes(data.path);
        console.log("isHighlighted", isHighlighted);
        console.log("selectedItem", selectedItem);
        console.log("data.path", data.path);
        console.log("data.file", data.file);
        console.log("data.taxonomy", data.taxonomy);
        const doHighlight = !!selectedItem;

        return (
          <g
            key={data.path + data.file + data.name + data.taxonomy}
            style={{
              fill: isHighlighted ? "#FCE68A" : data.color,
              transition: `transform ${
                isHighlighted ? "0.5s" : "0s"
              } ease-out, fill 0.1s ease-out`,
              opacity: doHighlight && !isHighlighted ? 0.9 : 1,
            }}
            stroke="#000000"
            strokeWidth={5}
            transform={`translate(${x}, ${y})`}
            onClick={(e) => {
              console.log("clicked", data.path);
              console.log(
                "calling onNodeClick",
                viewMode === "folder" ? data.path : data.taxonomy,
              );
              e.stopPropagation();
              onNodeClick?.(viewMode === "folder" ? data.path : data.taxonomy);
            }}
          >
            {isParent ? (
              <>
                <circle
                  r={r}
                  style={{ transition: "all 0.5s ease-out" }}
                  stroke="#290819"
                  strokeOpacity="0.5"
                  strokeWidth="1"
                  fill="white"
                  fillOpacity={0.1}
                />
              </>
            ) : (
              <circle
                style={{
                  filter: isHighlighted ? "url(#glow)" : undefined,
                  transition: "all 0.5s ease-out",
                }}
                r={runningR}
                strokeWidth={isHighlighted ? "5" : "2"}
                stroke={isHighlighted ? "#39ff14" : "#290819"}
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
        );

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
              fill="#E0E7FF"
              stroke="#334155"
              strokeWidth="3"
              strokeOpacity={0.9 - depth * 0.2}
              rotate={depth * 1 - 0}
              text={label}
            />
            <CircleText
              style={{ fontSize, transition: "all 0.5s ease-out" }}
              fill="#E0E7FF"
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
        // if (depth <= 1 && !children) runningR *= 3;
        if (data.path === looseFilesId) return null;
        const isHighlighted =
          viewMode === "folder"
            ? selectedItem?.file?.includes(data.path)
            : selectedItem?.taxonomy?.includes(data.path);

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
              console.log("clicked");
              console.log("viewMode", viewMode);
              console.log("data.path", data.path);
              console.log("data.taxonomy", data.taxonomy);
              onNodeClick?.(viewMode === "folder" ? data.path : data.taxonomy);
            }}
          >
            <text
              style={{
                pointerEvents: "none",
                opacity: 0.9,
                fontSize: "14px",
                fontWeight: 500,
                transition: "all 0.5s ease-out",
              }}
              fill="#4B5563"
              textAnchor="middle"
              dominantBaseline="middle"
              stroke={isHighlighted ? "#fce68a" : data.color}
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
                fontWeight: 500,
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
                fontWeight: 500,
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

      {/* {!filesChanged.length && colorEncoding === "type" && (
        <Legend
          fileTypes={fileTypes}
          fileColors={fileColors}
          width={width}
          height={height}
        />
      )} */}
      {/* {!filesChanged.length && colorEncoding !== "type" && (
        <ColorLegend
          scale={colorScale}
          extent={colorExtent}
          colorEncoding={colorEncoding}
        />
      )} */}
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
        {/* @ts-ignore */}
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
): ExtendedFileType => {
  if (!child) return;
  const isRoot = !child.path;
  let name = child.name;
  let path = viewMode === "folder" ? child.path : child.taxonomy;
  let children = child?.children?.map((c, i) =>
    processChild(c, getColor, cachedOrders, i, fileColors, viewMode),
  );
  if (children?.length === 1) {
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
      (["woff", "woff2", "ttf", "otf", "png", "jpg", "svg"].includes(extension)
        ? 100
        : Math.min(
            15000,
            hasExtension ? child.size : Math.min(child.size, 9000),
          )) + i, // stupid hack to stabilize circle order/position
    value:
      (["woff", "woff2", "ttf", "otf", "png", "jpg", "svg"].includes(extension)
        ? 100
        : Math.min(
            15000,
            hasExtension ? child.size : Math.min(child.size, 9000),
          )) + i, // stupid hack to stabilize circle order/position
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
        // keep within radius
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
  // setTimeout(() => simulation.stop(), 100);
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
          // move cached positions with the parent
          const childCachedPosition =
            repositionedCachedPositions[child.data.path];
          if (childCachedPosition) {
            repositionedCachedPositions[child.data.path] = [
              childCachedPosition[0] + itemPositionDiffFromCached[0],
              childCachedPosition[1] + itemPositionDiffFromCached[1],
            ];
          } else {
            // const diff = getPositionFromAngleAndDistance(100, item.r);
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
  // if (item.depth <= 1 && !item.children) {
  //   // item.value *= 0.33;
  //   return item.value  * 100;
  // }
  // if (item.depth <= 1) return -10;
  return item.value + -i;
  // return b.value - a.value;
};
