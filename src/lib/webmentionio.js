export default fetchWebmentions = async (token) => {
	const res = await fetch(`https://webmention.io/api/mentions.jf2?token=${token}&per-page=1000`)
	if (!res || 200 != res.status) {
		const err = await res.json()
		throw new Error(err?.error_description || `Received ${res.status} from webmention.io`)
	}
	const { children } = await res.json()
	return children
}