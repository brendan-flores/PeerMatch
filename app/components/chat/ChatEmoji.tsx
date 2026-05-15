type ChatEmojiProps = {
  emoji: string;
  className?: string;
};

/** Renders a reaction/message emoji with a system color-emoji font stack. */
export function ChatEmoji({ emoji, className = "" }: ChatEmojiProps) {
  return (
    <span className={`chat-emoji inline-block select-none leading-none ${className}`.trim()} aria-hidden>
      {emoji}
    </span>
  );
}
