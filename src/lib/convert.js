const PROPERTIES = {
	'bookmark-of': 'bookmark',
	'in-reply-to': 'reply',
	'like-of': 'like',
	'mention-of': 'mention',
	'repost-of': 'repost',
}

const translate = wm => ({
	received: wm['wm-received'],
	...(wm['published'] && { parsed: wm['published'] }),
	source: wm['wm-source'],
	target: wm['wm-target'],
	url: wm['url'],
	type: PROPERTIES[wm['wm-property']] || wm['wm-property'],
	...(wm['wm-property'] && { [wm['wm-property']]: wm['wm-target'] }),
	'wm-id': wm['wm-id'],
	...(wm['content'] && { content: wm['content'] }),
	...(wm['author'] && { author: wm['author'] }),
})

export {
	translate
}