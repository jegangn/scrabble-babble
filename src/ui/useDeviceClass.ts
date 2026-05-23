import { useEffect, useState } from "react";
import { classifyDevice, type DeviceClass, type DeviceViewport } from "./deviceClass.js";

function read(): DeviceViewport {
  const isTouch =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(any-pointer: coarse)").matches;
  return { vw: window.innerWidth, vh: window.innerHeight, isTouch };
}

export function useDeviceClass(): DeviceClass {
  const [vp, setVp] = useState<DeviceViewport>(() => read());
  useEffect(() => {
    const onChange = (): void => setVp(read());
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
    };
  }, []);
  return classifyDevice(vp);
}
