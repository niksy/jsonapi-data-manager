# jsonapi-data-manager

[![Build Status][ci-img]][ci]
[![BrowserStack Status][browserstack-img]][browserstack]

Handle [JSON API][jsonapi] data.

⚠️ **Based on
[`jsonapi-data-store`](https://github.com/beauby/jsonapi-datastore) module.**

The [JSON API][jsonapi] standard is great for exchanging data (which is its
purpose), but the format is not ideal to work directly with in an application.
This module is framework-agnostic library that takes away the burden of handling
[JSON API][jsonapi] data on the client side.

What it does:

-   Read JSON API payloads
-   Rebuild the underlying data graph
-   Allows you to query models and access their relationships directly
-   Create new models
-   Serialize models for creation/update

What it does not do:

-   Make requests to your API. You design your endpoints URLs, the way you
    handle authentication, caching, etc. is totally up to you.

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

This parses the data and incorporates it in the store, taking care of already
existing records (by updating them) and relationships.

### Parsing with top level data

If you have top level data in your payload use the `.sync` method of your store
with `topLevel` property.

```js
const store = new Store();
store.sync(data, { topLevel: true });
```

This does everything that `.sync()` does, but returns an object with top level
properties split.

### Retrieving models

Call the `.find(type, id)` method of your store.

```js
const article = store.find('article', 123);
```

or call the `.findAll(type)` method of your store to get all the models of that
type.

```js
const articles = store.findAll('article');
```

All the attributes _and_ relationships are accessible through the model as
object properties.

```js
console.log(article.author.name);
```

In case a related resource has not been fetched yet (either as a primary
resource or as an included resource), the corresponding property on the model
will contain only the `type` and `id` (and the `._placeHolder` property will be
set to `true`). However, the models are _updated in place_, so you can fetch a
related resource later, and your data will remain consistent.

### Serializing data

Call the `.serialize()` method on the model.

```js
console.log(article.serialize());
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
			id: 1337,
			attributes: {
				title: 'Cool article'
			},
			relationships: {
				author: {
					data: {
						type: 'user',
						id: 1
					}
				}
			}
		},
		{
			type: 'article',
			id: 300,
			attributes: {
				title: 'Even cooler article'
			},
			relationships: {
				author: {
					data: {
						type: 'user',
						id: 1
					}
				}
			}
		}
	]
};

// We can sync it:
const articles = store.sync(payload);

// Which will return the list of synced articles.

// Later, we can retrieve one of those:
const article = store.find('article', 1337);

// If the author resource has not been synced yet, we can only access its id and its type:
console.log(article.author);
// { id: 1, _type: 'article' }

// If we do sync the author resource later:
const authorPayload = {
	data: {
		type: 'user',
		id: 1,
		attributes: {
			name: 'Lucas'
		}
	}
};

store.sync(authorPayload);

// We can then access the author's name through our old `article` reference:
console.log(article.author.name);
// 'Lucas'

// We can also serialize any whole model in a JSONAPI-compliant way:
console.log(article.serialize());
// Or just a subset of its attributes/relationships:
console.log(article.serialize({ attributes: ['title'], relationships: [] }));
```

## API

### Model#constructor(type, id)

| Property | Type     | Description            |
| -------- | -------- | ---------------------- |
| `type`   | `string` | The type of the model. |
| `id`     | `string` | The id of the model.   |

### Model#\_addDependence(type, id, key)

Add a dependent to a model.

| Property | Type     | Description                                            |
| -------- | -------- | ------------------------------------------------------ |
| `type`   | `string` | The type of the dependent model.                       |
| `id`     | `string` | The id of the dependent model.                         |
| `key`    | `string` | The name of the relation found on the dependent model. |

### Model#\_removeDependence(type, id)

Removes a dependent from a model.

| Property | Type     | Description                      |
| -------- | -------- | -------------------------------- |
| `type`   | `string` | The type of the dependent model. |
| `id`     | `string` | The id of the dependent model.   |

### Model#removeRelationship(type, id, relName)

Removes a relationship from a model.

| Property  | Type     | Description                      |
| --------- | -------- | -------------------------------- |
| `type`    | `string` | The type of the dependent model. |
| `id`      | `string` | The id of the dependent model.   |
| `relName` | `string` | The name of the relationship.    |

### Model#serialize(opts)

Serialize a model.

| Property                      | Type     | Description                                       |
| ----------------------------- | -------- | ------------------------------------------------- |
| `opts`                        | `Object` | The options for serialization.                    |
| `otps.attributes`             | `Array`  | The list of attributes to be serialized (default: |
| all attributes)               |
| `opts.relationships`          | `Array`  | The list of relationships to be serialized        |
| (default: all relationships). |

Returns: `Object`

JSON API-compliant object

### Model#setAttribute(attrName, value)

Set/add an attribute to a model.

| Property   | Type     | Description                 |
| ---------- | -------- | --------------------------- |
| `attrName` | `string` | The name of the attribute.  |
| `value`    | `Object` | The value of the attribute. |

### Model#setRelationship(relName, models)

Set/add a relationships to a model.

| Property  | Type     | Description                   |
| --------- | -------- | ----------------------------- |
| `relName` | `string` | The name of the relationship. |
| `models`  | `Object` | The linked model(s).          |

### Store#constructor()

### Store#destroy(model)

Remove a model from the store.

| Property | Type     | Description           |
| -------- | -------- | --------------------- |
| `model`  | `Object` | The model to destroy. |

### Store#find(type, id)

Retrieve a model by type and id. Constant-time lookup.

| Property | Type     | Description            |
| -------- | -------- | ---------------------- |
| `type`   | `string` | The type of the model. |
| `id`     | `string` | The id of the model.   |

Returns: `Object`

The corresponding model if present, and null otherwise.

### Store#findAll(type)

Retrieve all models by type.

| Property | Type     | Description            |
| -------- | -------- | ---------------------- |
| `type`   | `string` | The type of the model. |

Returns: `Object`

Array of the corresponding model if present, and empty array otherwise.

### Store#reset()

Empty the store.

### Store#sync(data, opts)

Sync a JSON API-compliant payload with the store and return any top level
properties included in the payload.

| Property        | Type      | Description                                     |
| --------------- | --------- | ----------------------------------------------- |
| `data`          | `Object`  | The JSON API payload.                           |
| `opts`          | `Object`  | The options for sync.                           |
| `opts.topLevel` | `boolean` | Return top level properties (default: `false`). |

Returns: `Object`

The model/array of models corresponding to the payload's primary resource(s) and
any top level properties.

## Browser support

Tested in IE11+ and all modern browsers.

## Test

For automated tests, run `npm run test:automated` (append `:watch` for watcher
support).

## License

MIT © [Ivan Nikolić](http://ivannikolic.com)

<!-- prettier-ignore-start -->

[ci]: https://travis-ci.com/niksy/jsonapi-data-manager
[ci-img]: https://travis-ci.com/niksy/jsonapi-data-manager.svg?branch=master
[browserstack]: https://www.browserstack.com/
[browserstack-img]: https://www.browserstack.com/automate/badge.svg?badge_key=<badge_key>
[jsonapi]: https://jsonapi.org/

<!-- prettier-ignore-end -->
