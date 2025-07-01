export default async (webhook, item, type = 'received') => {
	if (webhook) await fetch(webhook, {
		method: 'POST',
		headers: {
			'Click': item.source, // https://docs.ntfy.sh/publish/#click-action
		},
		body: `${item.target} ${type} a webmention from ${item.source}`,
	})
}