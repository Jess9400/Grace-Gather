// Never send a parent author's words or a reporter's text with another
// person's post. Their permission has not been established for this request.
export function privateCommunityCandidate(post) {
  return { id: post.id, title: post.title, body: post.body, perspective: post.perspective };
}
