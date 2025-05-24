const HTTPResponse = (statusCode, body = '', headers = {}) =>
	(new Response(typeof body === 'object' ? JSON.stringify(body) : body, {
		status: statusCode,
		headers: {
			...(typeof body === 'object' && { 'Content-Type': 'application/json' }),
			...headers
		},
	}))

export default {
	OK: (body = 'ok', headers) => HTTPResponse(200, body, headers),
	CREATED: (body = 'created', headers) => HTTPResponse(201, body, headers),
	ACCEPTED: (body = 'accepted', headers) => HTTPResponse(202, body, headers),
	BAD_REQUEST: (body = 'bad request', headers) => HTTPResponse(400, body, headers),
	UNAUTHORIZED: (body = 'unauthorized', headers) => HTTPResponse(401, body, headers),
	FORBIDDEN: (body = 'forbidden', headers) => HTTPResponse(403, body, headers),
	NOT_FOUND: (body = 'not found', headers) => HTTPResponse(404, body, headers),
	METHOD_NOT_ALLOWED: (body = 'method not allowed', headers) => HTTPResponse(405, body, headers),
	INTERNAL_SERVER_ERROR: (body = 'internal server error', headers) => HTTPResponse(500, body, headers),
}