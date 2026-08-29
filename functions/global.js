/** The World section was removed. Keep the retired URL from falling back to
 *  any stale static deployment at the edge. */
export function onRequest() {
  return new Response('Not found', {
    status: 404,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
