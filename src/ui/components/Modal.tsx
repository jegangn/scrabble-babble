import { ACCENT } from "../theme.js";

export interface ModalProps {
  readonly children: React.ReactNode;
  readonly onClose?: () => void;
  readonly title?: string;
}

export function Modal({ children, onClose, title }: ModalProps): JSX.Element {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)", zIndex: 100, padding: 20 }}
      onClick={onClose}
    >
      <div
        className="rounded-xl p-5 max-w-md w-full"
        style={{ background: ACCENT.surface, color: ACCENT.text }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="text-xl font-semibold mb-3">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
