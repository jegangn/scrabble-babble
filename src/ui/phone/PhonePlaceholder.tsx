export function PhonePlaceholder({ label }: { readonly label: string }): JSX.Element {
  return (
    <div data-testid="phone-root" style={{ height: "var(--app-h)", display: "grid", placeItems: "center" }}>
      <span>phone:{label}</span>
    </div>
  );
}
