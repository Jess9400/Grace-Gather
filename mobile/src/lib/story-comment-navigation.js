/** Wait for the requested story and its asynchronously loaded publisher text. */
export function commentsReadyForJump({ item, id, loading, inlinePublisher, publisherFinished, publisherRetry }) {
  return !!item && item.id === id && !loading && (
    item.origin !== "publisher" || inlinePublisher || publisherFinished === `${id}:${publisherRetry}`
  );
}
