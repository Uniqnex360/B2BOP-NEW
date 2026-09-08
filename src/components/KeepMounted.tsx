import { ReactNode, useState, useEffect, useRef } from "react";

interface KeepMountedProps {
  activePage: string;
  pageId: string;
  children: ReactNode;
  timeLimitMs?: number; // Optional timer in milliseconds (default: 60000ms / 1 min)
}

export function KeepMounted({
  activePage,
  pageId,
  children,
  timeLimitMs = 60000, // 1 minute default
}: KeepMountedProps) {
  const isActive = activePage === pageId;
  const [mountKey, setMountKey] = useState(0);
  const hiddenTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      // Record the exact time the component became hidden
      hiddenTimeRef.current = Date.now();
    } else {
      // Component just became active again: check how long it was hidden
      if (hiddenTimeRef.current) {
        const timeHidden = Date.now() - hiddenTimeRef.current;

        if (timeHidden >= timeLimitMs) {
          // Time limit exceeded: increment key to force remount & reload
          setMountKey((prev) => prev + 1);
        }
      }
      hiddenTimeRef.current = null;
    }
  }, [isActive, timeLimitMs]);

  return (
    <div className={isActive ? "block" : "hidden"}>
      {/* Changing key forces React to completely reload this child */}
      <div key={mountKey}>{children}</div>
    </div>
  );
}
