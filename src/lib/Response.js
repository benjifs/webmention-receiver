export default {
	OK: { statusCode: 200 },
	CREATED: { statusCode: 201 },
	ACCEPTED: { statusCode: 202 },
	BAD_REQUEST: { statusCode: 400, body: 'bad request' },
	UNAUTHORIZED: { statusCode: 401, body: 'unauthorized' },
	FORBIDDEN: { statusCode: 403, body: 'forbidden' },
	SCOPE: { statusCode: 403, body: 'insufficient_scope' },
	NOT_ALLOWED: { statusCode: 405, body: 'method_not_allowed' },
	INTERNAL_SERVER_ERROR: { statusCode: 500 }
}