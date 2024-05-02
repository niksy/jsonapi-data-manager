# jsonapi-data-manager

[![Build Status][ci-img]][ci] [![BrowserStack Status][browserstack-img]][browserstack]

Handle [JSON API][jsonapi] data.

⚠️ **Based on [`jsonapi-data-store`](https://github.com/beauby/jsonapi-datastore) module which is
currently unmaintained.**

The [JSON API][jsonapi] standard is great for exchanging data (which is its purpose), but the format
is not ideal to work directly with in an application. This module is framework-agnostic library that
takes away the burden of handling [JSON API][jsonapi] data on the client side.

What it does:

-   Read JSON API payloads
-   Rebuild the underlying data graph
-   Allows you to query models and access their relationships directly
-   Create new models
-   Serialize models for creation/update

What it does not do:

-   Make requests to your API. You design your endpoints URLs, the way you handle authentication,
    caching, etc. is totally up to you.

## Install

```sh
npm install jsonapi-data-manager --save
```

## Usage

`Store` and `Model` classes are available as named exports.

```js
import { Store, Model } from 'jsonapi-data-manager';
```

### Parsing data

Call the `.sync()` method of your store.

```js
const store = new Store();
store.sync(data);
```

This parses the data and incorporates it in the store, taking care of already existing records (by
updating them) and relationships.

Top level data in your payload (e.g. `meta`) are stored directly on store.

### Retrieving models

Call the `.find(type, id)` method of your store.

```js
const article = store.find('article', '123');
```

or call the `.findAll(type)` method of your store to get all the models of that type.

```js
const articles = store.findAll('article');
```

All the attributes _and_ relationships are accessible through the model as object properties.

```js
article.author.name;
```

In case a related resource has not been fetched yet (either as a primary resource or as an included
resource), the corresponding property on the model will contain only the `type` and `id`. However,
the models are _updated in place_, so you can fetch a related resource later, and your data will
remain consistent.

### Serializing data

Call the `.serialize()` method on the model.

```js
article.serialize();
```

### Examples

```js
import { Store } from 'jsonapi-data-manager';

// Create a store:
const store = new Store();

// Then, given the following payload, containing two `articles`, with a related `user` who is the author of both:
const payload = {
	data: [
		{
			type: 'article',
			id: '1337',
			attributes: {
				title: 'Cool article'
			},
			relationships: {
				author: {
					data: {
						type: 'user',
						id: '1'
					}
				}
			}
		},
		{
			type: 'article',
			id: '300',
			attributes: {
				title: 'Even cooler article'
			},
			relationships: {
				author: {
					data: {
						type: 'user',
						id: '1'
					}
				}
			}
		}
	]
};

// We can sync it:
store.sync(payload);

// We can retrieve list of synced articles:
const articles = store.findAll('article');

// Later, we can retrieve one of those:
const article = store.find('article', '1337');

// If the author resource has not been synced yet, we can only access its id and its type:
article.author;
// { id: 1, type: 'article' }

// If we do sync the author resource later:
const authorPayload = {
	data: {
		type: 'user',
		id: '1',
		attributes: {
			name: 'Lucas'
		}
	}
};

store.sync(authorPayload);

// We can then access the author's name through our old `article` reference:
article.author.name;
// 'Lucas'

// We can also serialize any whole model in a JSONAPI-compliant way:
article.serialize();

// Or just a subset of its attributes/relationships:
article.serialize({ attributes: ['title'], relationships: [] });
```

## Browser support

Tested in IE11+ and all modern browsers.

## Test

For automated tests, run `npm test` (append `:watch` for watcher support).

## License

MIT © [Ivan Nikolić](http://ivannikolic.com)

<!-- prettier-ignore-start -->

[ci]: https://github.com/niksy/jsonapi-data-manager/actions?query=workflow%3ACI
[ci-img]: https://github.com/niksy/jsonapi-data-manager/actions/workflows/ci.yml/badge.svg?branch=master
[browserstack]: https://www.browserstack.com/
[browserstack-img]: https://www.browserstack.com/automate/badge.svg?badge_key=eDV0YitYd2FNR2FNamNDT0tuaGl0QmI3dFNwMkVVcVJUdmtVZ0lCZ0FlYz0tLTZQWUEvdERLS21tRmV3MWRJN0xWQUE9PQ==--465652cfc13a0b91e1905e1f65b6f11d791a9041
[jsonapi]: https://jsonapi.org/

<!-- prettier-ignore-end -->
