export default sendWebhook = async (webhook, item) => {
	if (webhook) await fetch(webhook, {
		method: 'POST',
		headers: {
			'Click': item.source, // https://docs.ntfy.sh/publish/#click-action
		},
		body: `${item.target} received a webmention from ${item.source}`,
	})
}