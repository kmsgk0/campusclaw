import React, { useLayoutEffect, useRef, useState } from "react";
import { cx } from "./ui.jsx";

export const DEFAULT_PANE_WIDTHS = { catalogue: 252, assistant: 420 };
const MIN_CATALOGUE = 200;
const MIN_READER = 320;
const MIN_ASSISTANT = 320;
const clamp = (value, minimum, maximum) =>
  Math.min(Math.max(value, minimum), maximum);

export default function WorkspaceLayout({
  widths,
  onResize,
  withAssistant,
  mobileReader,
  children,
}) {
  const container = useRef(null);
  const drag = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [dragging, setDragging] = useState(null);

  useLayoutEffect(() => {
    const node = container.current;
    setContainerWidth(node.clientWidth);
    const observer = new ResizeObserver(([entry]) =>
      setContainerWidth(entry.contentRect.width),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const catalogue = containerWidth
    ? clamp(
        widths.catalogue,
        MIN_CATALOGUE,
        Math.max(
          MIN_CATALOGUE,
          containerWidth - MIN_READER - (withAssistant ? MIN_ASSISTANT : 0),
        ),
      )
    : widths.catalogue;
  const assistant = withAssistant
    ? containerWidth
      ? clamp(
          widths.assistant,
          MIN_ASSISTANT,
          Math.max(MIN_ASSISTANT, containerWidth - catalogue - MIN_READER),
        )
      : widths.assistant
    : 0;
  const limits = {
    catalogue: [
      MIN_CATALOGUE,
      Math.max(MIN_CATALOGUE, containerWidth - MIN_READER - assistant),
    ],
    assistant: [
      MIN_ASSISTANT,
      Math.max(MIN_ASSISTANT, containerWidth - catalogue - MIN_READER),
    ],
  };

  function resize(pane, value, bounds = limits[pane]) {
    onResize((current) => ({ ...current, [pane]: clamp(value, ...bounds) }));
  }

  function startDrag(event, pane) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pane,
      pointerId: event.pointerId,
      x: event.clientX,
      width: pane === "catalogue" ? catalogue : assistant,
      bounds: limits[pane],
    };
    setDragging(pane);
  }

  function moveDrag(event) {
    const start = drag.current;
    if (!start || start.pointerId !== event.pointerId) return;
    if ((event.buttons & 1) === 0) {
      endDrag(event);
      return;
    }
    const direction = start.pane === "catalogue" ? 1 : -1;
    resize(
      start.pane,
      start.width + (event.clientX - start.x) * direction,
      start.bounds,
    );
  }

  function endDrag(event) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    drag.current = null;
    setDragging(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    event.currentTarget.blur();
  }

  function keyboardResize(event, pane) {
    const current = pane === "catalogue" ? catalogue : assistant;
    const [minimum, maximum] = limits[pane];
    let next;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const movement = event.key === "ArrowRight" ? 20 : -20;
      next = current + movement * (pane === "catalogue" ? 1 : -1);
    } else if (event.key === "Home") {
      next = minimum;
    } else if (event.key === "End") {
      next = maximum;
    } else {
      return;
    }
    event.preventDefault();
    resize(pane, next);
  }

  function separator(pane, width, label) {
    return (
      <div
        className={`pane-resizer pane-resizer-${pane}`}
        role="separator"
        aria-label={label}
        aria-orientation="vertical"
        aria-valuemin={limits[pane][0]}
        aria-valuemax={Math.round(limits[pane][1])}
        aria-valuenow={Math.round(width)}
        aria-valuetext={`${Math.round(width)} 像素`}
        tabIndex={0}
        title="拖动调整宽度，双击恢复默认"
        onPointerDown={(event) => startDrag(event, pane)}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onKeyDown={(event) => keyboardResize(event, pane)}
        onDoubleClick={() => resize(pane, DEFAULT_PANE_WIDTHS[pane])}
      />
    );
  }

  return (
    <div
      ref={container}
      className={cx(
        "library-layout",
        withAssistant && "with-assistant",
        mobileReader && "mobile-reading",
        dragging && "is-resizing",
      )}
      style={{
        "--catalogue-width": `${catalogue}px`,
        "--assistant-width": `${assistant}px`,
      }}
    >
      {children}
      {separator("catalogue", catalogue, "调整材料列表与阅读区宽度")}
      {withAssistant &&
        separator("assistant", assistant, "调整阅读区与对话区宽度")}
    </div>
  );
}
