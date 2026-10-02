import { type RefObject, useLayoutEffect, useState } from 'react';

export interface Size {
  width: number;
  height: number;
}

function contentBox(element: HTMLElement): Size {
  const style = getComputedStyle(element);
  return {
    width: element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
    height: element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
  };
}

/** The element's content-box size, kept current as it resizes. */
export function useElementSize(ref: RefObject<HTMLElement | null>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const next = contentBox(element);
      setSize((current) =>
        current.width === next.width && current.height === next.height ? current : next,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
