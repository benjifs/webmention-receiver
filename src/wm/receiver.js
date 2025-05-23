import { WebMentionHandler } from 'webmention-handler'
import BlobStorage from 'webmention-handler-netlify-blobs'

import Response from '../lib/Response'
import { translate } from '../lib/convert'
import fetchWebmentions from '../lib/webmentionio'
import sendWebhook from '../lib/webhook'

export default class WebmentionReceiver {
	#store // Defaults to BlobStorage
	#token // (Optional) Generate a random string (https://generate-random.org/string-generator)
	#webhook // (Optional) webhook to send POST request to
	#handler

	constructor({ urls, store, token, webhook }) {
		this.#store = store ? store : new BlobStorage()
		this.#token = token
		this.#webhook = webhook
		this.#handler = new WebMentionHandler({
			supportedHosts: urls, // ['example.com', 'www.example.com', 'example.net']
			storageHandler: this.#store
		})
	}

	#validateRequest = token => {
		if (!this.#token) return { ...Response.INTERNAL_SERVER_ERROR, body: 'Missing token' }
		if (!token) return Response.UNAUTHORIZED
		if (this.#token != token) return Response.FORBIDDEN
	}

	cleanupHandler = async (e) => {
		if ('GET' != e.httpMethod) return Response.NOT_ALLOWED

		const error = this.#validateRequest(e.queryStringParameters.token)
		if (error) return error

		const total = await this.#store.clearAll()
		return {
			...Response.OK,
			body: `Deleted ${total} items`
		}
	}

	importHandler = async (e) => {
		if ('GET' != e.httpMethod) return Response.NOT_ALLOWED

		const { token, webmentionio } = e.queryStringParameters
		const error = this.#validateRequest(token)
		if (error) return error
		if (!webmentionio) return { ...Response.BAD_REQUEST, body: 'Missing "webmentionio" token' }

		try {
			const webmentions = await fetchWebmentions(webmentionio)
			console.log(`[INFO] Importing ${webmentions.length} items`)
			const targets = {}
			for (const wm of webmentions) {
				const mention = translate(wm)
				const id = encodeURIComponent(mention.target)
				targets[id] = targets[id] || []
				targets[id].push(mention)
			}

			for (const [target, mentions] of Object.entries(targets)) {
				await this.#store.storeMentionsForPage(target, mentions)
			}

			return {
				...Response.OK,
				body: `Imported ${webmentions.length} webmentions for ${Object.entries(targets).length} targets`
			}
		} catch (error) {
			console.error('[ERROR]', error.message)
			return {
				...Response.BAD_REQUEST,
				body: error.message
			}
		}
	}

	processHandler = async () => {
		await this.#handler.processPendingMentions()
		return Response.OK
	}

	webmentionHandler = async (e) => {
		const params = new URLSearchParams(e.body)
		const source = params.get('source')
		const target = params.get('target')

		try {
			const recommendedResponse = await this.#handler.addPendingMention(source, target)
			if ([200, 201, 202].includes(recommendedResponse.code)) {
				sendWebhook(this.#webhook, { source, target })
			}
			return {
				statusCode: recommendedResponse.code,
				body: 'accepted'
			}
		} catch (error) {
			console.error('[ERROR]', error.message)
			return {
				...Response.BAD_REQUEST,
				body: error.message
			}
		}
	}

	webmentionsHandler = async (e) => {
		if ('GET' != e.httpMethod) return Response.NOT_ALLOWED

		const { url, type, token } = e.queryStringParameters
		if (url) {
			try {
				const id = encodeURIComponent(url)
				const mentions = await this.#handler.getMentionsForPage(id, type)
				return {
					...Response.OK,
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						[url]: mentions
					})
				}
			} catch (error) {
				console.error('[ERROR]', error.message)
				return {
					...Response.BAD_REQUEST,
					body: `${url} is not valid`
				}
			}
		} else if (token) {
			const error = this.#validateRequest(token)
			if (error) return error

			const mentions = await this.#store.getAllMentions()
			return {
				...Response.OK,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(mentions)
			}
		}

		return {
			...Response.BAD_REQUEST,
			body: 'Missing "url"'
		}
	}
}