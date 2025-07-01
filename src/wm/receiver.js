import { WebMentionHandler } from 'webmention-handler'
import BlobStorage from 'webmention-handler-netlify-blobs'
import isEqual from 'fast-deep-equal'

import HTTP from '../lib/HTTPResponse.js'
import { translate } from '../lib/convert.js'
import fetchWebmentions from '../lib/webmentionio.js'
import sendWebhook from '../lib/webhook.js'

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
		if (!this.#token) return HTTP.INTERNAL_SERVER_ERROR('Missing token')
		if (!token) return HTTP.UNAUTHORIZED()
		if (this.#token != token) return HTTP.FORBIDDEN()
	}

	cleanupHandler = async (req) => {
		if ('GET' !== req.method) return HTTP.METHOD_NOT_ALLOWED()

		const params = new URL(req.url).searchParams
		const token = params.get('token')
		const error = this.#validateRequest(token)
		if (error) return error

		const total = await this.#store.clearAll()
		return HTTP.OK(`Deleted ${total} items`)
	}

	importHandler = async (req) => {
		if ('GET' !== req.method) return HTTP.METHOD_NOT_ALLOWED()

		const params = new URL(req.url).searchParams
		const token = params.get('token')
		const webmentionio = params.get('webmentionio')
		const error = this.#validateRequest(token)
		if (error) return error
		if (!webmentionio) return HTTP.BAD_REQUEST('Missing "webmentionio" token')

		try {
			const webmentions = await fetchWebmentions(webmentionio)
			console.log(`[INFO] Importing ${webmentions.length} items`)
			const targets = {}
			for (const wm of webmentions) {
				const mention = translate(wm)
				targets[mention.target] = targets[mention.target] || []
				targets[mention.target].push(mention)
			}

			for (const [target, mentions] of Object.entries(targets)) {
				await this.#store.storeMentionsForPage(target, mentions)
			}

			return HTTP.OK(`Imported ${webmentions.length} webmentions for ${Object.entries(targets).length} targets`)
		} catch (error) {
			console.error('[ERROR]', error.message)
			return HTTP.BAD_REQUEST(error.message)
		}
	}

	#compareMentions = (m1, m2) => {
		const a = { ...m1 }
		const b = { ...m2 }
		delete a.parsed
		delete b.parsed
		return isEqual(a, b)
	}

	processMention = async (mention) => {
		const processed = await this.#handler.processMention(mention, true)
		if (!processed) return null

		for (const m of processed) {
			let saved = await this.#handler.getMentionsForPage(m.target)
			if (saved) {
				const prev = saved.find(p => p.source === m.source)
				if (this.#compareMentions(prev, m)) continue
			}
			console.log(`[INFO] ${saved ? 'Updating' : 'Adding'} ${m.source} for ${m.target}`)
			await this.#store.storeMentionForPage(m.target, m)
			await sendWebhook(this.#webhook, m, 'processed')
		}
	}

	processHandler = async () => {
		const mentions = await this.#store.getNextPendingMentions()
		await Promise.all(mentions.map(mention => this.processMention(mention)))
		return HTTP.OK()
	}

	webmentionHandler = async (req) => {
		const contentType = req.headers.get('content-type')
		let body
		if ('application/x-www-form-urlencoded' === contentType) {
			body = await req.formData()
		} else {
			body = new URL(req.url).searchParams
		}
		if (!body) return HTTP.BAD_REQUEST('Missing "source" and "target"')
		const source = body.get('source')
		if (!source) return HTTP.BAD_REQUEST('Missing "source"')
		const target = body.get('target')
		if (!target) return HTTP.BAD_REQUEST('Missing "target"')

		const recommendedResponse = await this.#handler.addPendingMention(source, target)
		if ([200, 201, 202].includes(recommendedResponse.code)) {
			await sendWebhook(this.#webhook, { source, target })
		}
		return new Response('accepted', { status: recommendedResponse.code })
	}

	webmentionsHandler = async (req) => {
		if ('GET' !== req.method) return HTTP.METHOD_NOT_ALLOWED()

		const params = new URL(req.url).searchParams
		const url = params.get('url')
		const token = params.get('token')
		if (url) {
			try {
				const type = params.get('type')
				const mentions = await this.#handler.getMentionsForPage(url, type)
				return HTTP.OK({
					[url]: mentions
				})
			} catch (error) {
				console.error('[ERROR]', error.message)
				return HTTP.BAD_REQUEST(`${url} is not valid`)
			}
		} else if (token) {
			const error = this.#validateRequest(token)
			if (error) return error

			const mentions = await this.#store.getAllMentions()
			return HTTP.OK(mentions)
		}

		return HTTP.BAD_REQUEST('Missing "url"')
	}
}