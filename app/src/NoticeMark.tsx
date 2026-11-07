/** The Notice mark, in the current ink. In the Ndash wordmark it stands in for the N. */
export function NoticeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 354 394" className={className} aria-hidden="true" focusable="false">
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M0 0H354V394H0ZM100 0H237V137ZM117 137H237V257H117ZM117 257V394H254Z"
      />
    </svg>
  );
}
