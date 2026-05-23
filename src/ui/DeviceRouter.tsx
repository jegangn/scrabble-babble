import { App } from "../App.js";
import { FitToViewport } from "./FitToViewport.js";
import { PhoneApp } from "./phone/PhoneApp.js";
import { useBootstrap } from "./useBootstrap.js";
import { useDeviceClass } from "./useDeviceClass.js";

/** Top-level fork. Phone-in-portrait gets the native PhoneApp; everything
 *  else (laptop, tablets, iPads, AND a phone held landscape) gets today's
 *  exact FitToViewport→App path. Bootstrap runs here so it's path-agnostic. */
export function DeviceRouter(): JSX.Element {
  useBootstrap();
  const { isPhone, portrait } = useDeviceClass();
  if (isPhone && portrait) return <PhoneApp />;
  return (
    <FitToViewport>
      <App />
    </FitToViewport>
  );
}
