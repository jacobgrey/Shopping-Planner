/**
 * Renders text with clickable URLs.
 * URLs are detected and rendered as <a> links that open in default browser.
 */

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;

interface NoteTextProps {
  text: string;
  className?: string;
}

export default function NoteText({ text, className = "" }: NoteTextProps) {
  const parts: (string | { url: string })[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_REGEX)) {
    const idx = match.index!;
    if (idx > lastIndex) {
      parts.push(text.slice(lastIndex, idx));
    }
    parts.push({ url: match[0] });
    lastIndex = idx + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (parts.length === 0) return <span className={className}>{text}</span>;

  return (
    <span className={className}>
      {parts.map((part, i) =>
        typeof part === "string" ? (
          <span key={i}>{part}</span>
        ) : (
          <a
            key={i}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline break-all"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {part.url}
          </a>
        )
      )}
    </span>
  );
}
