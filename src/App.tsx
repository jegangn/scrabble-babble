import { APP_NAME } from "./config/branding.js";

export function App(): JSX.Element {
  return (
    <div className="flex h-full items-center justify-center">
      <h1 className="text-3xl font-semibold">{APP_NAME}</h1>
    </div>
  );
}
