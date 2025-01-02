"use client";

import { shoes } from "@/shoes";
import Image from "next/image";
import { Fragment, useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

// we need a function that given an array and a number
// it loops over the array filling out a new array
// but if it gets to the end of the array before reaching the number
// it starts over from the beginning of the array, until it reaches the number
function loopArray<Array extends any[]>(array: Array, number: number) {
  const newArray = [];
  for (let i = 0; i < number; i++) {
    newArray.push(array[i % array.length]);
  }
  return newArray as Array;
}

// takes an array of [] and makes it into a 2D array
// duplicating the array n times
function duplicateArray<Array extends any[]>(array: Array, n: number) {
  const newArray = [];
  for (let i = 0; i < n; i++) {
    newArray.push(array);
  }
  return newArray as Array[];
}

// randomise the order of an array
function randomiseArray<Array extends any[]>(array: Array) {
  return array.sort(() => Math.random() - 0.5);
}

const shoeMatrix = duplicateArray(loopArray(shoes, 50), 50);

export default function ShoeWall() {
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [scale, setScale] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId: number | null = null;
    let lastX = posX;
    let lastY = posY;
    let lastScale = scale;

    const controller = new AbortController();

    const updateTransform = () => {
      if (contentRef.current) {
        contentRef.current.style.transform = `translate3d(${lastX}px, ${lastY}px, 0) scale(${lastScale})`;
      }
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      // For smooth trackpad pinch gestures
      if (event.ctrlKey || event.metaKey) {
        // Get mouse position
        const mouseX = event.clientX;
        const mouseY = event.clientY;

        // Point relative to transformed origin
        const pointX = (mouseX - lastX) / lastScale;
        const pointY = (mouseY - lastY) / lastScale;

        // More precise scale calculation for trackpad
        // Using smaller multiplier since trackpad events are more frequent
        const delta = -event.deltaY * 0.005; // Reduced from 0.01 for smoother zoom
        const newScale = Math.min(Math.max(lastScale * (1 + delta), 0.5), 5);

        // Update position to maintain zoom point
        lastX = mouseX - pointX * newScale;
        lastY = mouseY - pointY * newScale;
        lastScale = newScale;
      } else {
        // Regular panning
        const moveSpeed = 1 / lastScale;
        lastX -= event.deltaX * moveSpeed;
        lastY -= event.deltaY * moveSpeed;
      }

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setPosX(lastX);
        setPosY(lastY);
        setScale(lastScale);
        updateTransform();
      });
    };

    window.addEventListener("wheel", handleWheel, {
      passive: false,
      signal: controller.signal,
    });

    return () => {
      controller.abort();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const visibleRect = {
    start: -posY,
    end: -posY + window.innerHeight,
    leftStart: -posX,
    rightEnd: -posX + window.innerWidth,
  };

  const rowVirtualizer = useVirtualizer({
    count: shoeMatrix.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 384,
    overscan: 5,
    scrollMargin: -visibleRect.start,
  });

  const columnVirtualizer = useVirtualizer({
    count: shoeMatrix[0].length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 384,
    overscan: 5,
    scrollMargin: -visibleRect.leftStart,
  });

  const itemSize = 384 * scale;
  const visibleRows = Math.ceil(window.innerHeight / itemSize) + 2;
  const visibleCols = Math.ceil(window.innerWidth / itemSize) + 2;

  return (
    <div ref={parentRef} className="fixed inset-0 overflow-hidden bg-white">
      <div
        ref={contentRef}
        className="absolute will-change-transform"
        style={{
          transform: `translate3d(${posX}px, ${posY}px, 0) scale(${scale})`,
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: `${columnVirtualizer.getTotalSize()}px`,
        }}
      >
        {rowVirtualizer
          .getVirtualItems()
          .slice(0, visibleRows * 2)
          .map((virtualRow) => (
            <div
              key={virtualRow.index}
              className="absolute top-0 left-0 flex"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {columnVirtualizer
                .getVirtualItems()
                .slice(0, visibleCols * 2)
                .map((virtualCol) => {
                  const shoe = shoeMatrix[virtualRow.index][virtualCol.index];
                  return (
                    <div
                      key={virtualCol.index}
                      style={{
                        transform: `translateX(${virtualCol.start}px)`,
                      }}
                    >
                      <Image
                        src={shoe}
                        alt=""
                        height={384}
                        width={384}
                        className="select-none aspect-square object-contain m-2 p-2 scale-150"
                        draggable={false}
                        loading="lazy"
                        sizes="384px"
                      />
                    </div>
                  );
                })}
            </div>
          ))}
      </div>
    </div>
  );
}
