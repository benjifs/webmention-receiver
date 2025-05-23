# Serverless Webmentions

Store [Webmentions](https://www.w3.org/TR/webmention/) in [Netlify](https://netlify.com) using [Functions](https://docs.netlify.com/functions/overview/)
and [Blobs](https://docs.netlify.com/blobs/overview/).

A full working example can be found at the [serverless-webmentions](https://github.com/benjifs/serverless-webmentions) repository.

## Installation
```sh
npm install webmention-receiver --save
```

## Usage
```js
import WebmentionReceiver from 'webmention-receiver'
export const wm = new WebmentionReceiver({
	urls: ['example.com', 'www.example.com', 'example.net'],
	token: 'random-long-string',                                        // optional
	webhook: 'URL to send POST request to after webmention received'    // optional
})
```

By default, this project uses [webmention-handler-netlify-blobs](https://github.com/benjifs/webmention-handler-netlify-blobs)
to store webmentions in [Netlify Blobs](https://docs.netlify.com/blobs/overview/).

You can then set up your [Netlify Functions](https://docs.netlify.com/functions/overview/) to call specific handlers.
For example:

```js
// /functions/webmention.js
import WebmentionReceiver from 'webmention-receiver'
const wm = new WebmentionReceiver({
	urls: ['example.com', 'www.example.com', 'example.net'],
	webhook: process.env.WEBHOOK
})
export const handler = wm.webmentionHandler
```

The above would call `webmentionHandler` when you call your **function** located at `/.netlify/functions/webmention`.

### Configuration
* `urls` (**required**): The only **required** parameter is a list of valid URLs that you accept webmentions to (without `https?://`).
* `token` (optional): There are some parts of the WebmentionReceiver that require a `token` and they will not work unless
it is set and the value passed matches. You can [generate a token](https://generate-random.org/string-generator) or use
any long random string for the `token`.
* `webhook` (optional): This should be a URL which will receive a **POST** request after the webmention is received. It
has specifically been tested with [ntfy.sh](https://ntfy.sh/) but could also be any other endpoint that will accept a
simple **POST** request.

### Handlers
#### `webmentionHandler`
This is the main handler that will accept a webmention given a `source` and valid
`target`. If valid, it will be added to a queue to be processed at a later time.

#### `processHandler`
This will process the queue of pending webmentions and process them and, if valid,
will show up as part of your webmentions for the given target.

#### `webmentionsHandler`
Returns a list of webmentions for a given target `url`, optionally filtered by `type`.
You can also return a list of all webmentions received grouped by target by ommitting
the `url` parameter. Getting the list of all webmentions **requires** passing the
`token` parameter.

#### `importHandler`
You can import all webmentions from [webmention.io](https://webmention.io) by using
this handler. **Requires** `token` and `webmentionio` token as parameters.

#### `cleanupHandler`
> For testing and local use only. Accepts `GET` requests and **requires** `token`.

This handler will go through all the blobs for your site and delete them. This is
mostly useful while testing this setup out and should not be exposed when you deploy
this publicly.
