/* eslint-disable dot-notation */

import assert from 'node:assert';
import { Store, Model } from '../index.js';

describe('Model', function () {
	describe('.serialize()', function () {
		it('should serialize a bare model', function () {
			const serializedModel = new Model('datatype', '1337').serialize();
			assert.deepEqual(serializedModel, {
				data: {
					id: '1337',
					type: 'datatype'
				}
			});
		});

		it('should serialize all attributes by default', function () {
			const store = new Store();
			const payload = {
				data: {
					type: 'article',
					id: '1337',
					attributes: {
						title: 'Cool article',
						author: 'Lucas'
					}
				}
			};

			store.sync(payload);
			const [article] = store.findAll('article');
			assert.ok(article instanceof Model);
			const serializedArticle = article.serialize();
			assert.deepEqual(serializedArticle, payload);
		});

		it('should serialize all relationships by default', function () {
			const store = new Store();
			const payload = {
				data: {
					type: 'article',
					id: '1337',
					attributes: {
						title: 'Cool article'
					},
					relationships: {
						author: {
							data: {
								type: 'user',
								id: '3'
							}
						}
					}
				}
			};

			store.sync(payload);
			const [article] = store.findAll('article');
			assert.ok(article instanceof Model);
			const serializedArticle = article.serialize();
			assert.deepEqual(serializedArticle, payload);
		});

		it('should serialize only specified attributes', function () {
			const store = new Store();
			const payload = {
				data: {
					type: 'article',
					id: '1337',
					attributes: {
						title: 'Cool article',
						author: 'Lucas'
					}
				}
			};

			store.sync(payload);
			const [article] = store.findAll('article');
			assert.ok(article instanceof Model);
			const serializedArticle = article.serialize({
				attributes: ['author']
			});
			assert.ok(!Array.isArray(serializedArticle.data));
			assert.ok(typeof serializedArticle.data?.attributes?.['title'] === 'undefined');
		});

		it('should serialize only specified relationships', function () {
			const store = new Store();
			const payload = {
				data: {
					type: 'article',
					id: '1337',
					attributes: {
						title: 'Cool article'
					},
					relationships: {
						author: {
							data: {
								type: 'user',
								id: '3'
							}
						},
						tags: {
							data: [
								{ type: 'tag', id: '12' },
								{ type: 'tag', id: '74' }
							]
						},
						links: {
							data: [
								{ type: 'link', id: '18' },
								{ type: 'link', id: '44' }
							]
						}
					}
				}
			};

			store.sync(payload);
			const [article] = store.findAll('article');
			assert.ok(article instanceof Model);
			const serializedArticle = article.serialize({
				relationships: ['author', 'links']
			});
			assert.ok(!Array.isArray(serializedArticle.data));
			assert.ok(typeof serializedArticle.data?.relationships?.['author'] !== 'undefined');
			assert.ok(typeof serializedArticle.data?.relationships?.['links'] !== 'undefined');
			assert.ok(typeof serializedArticle.data?.relationships?.['tags'] === 'undefined');
		});

		it('should not serialize the id on fresh models', function () {
			const article = new Model('article');
			const serializedArticle = article.serialize();
			assert.ok(!Array.isArray(serializedArticle.data));
			assert.ok(typeof serializedArticle.data?.id === 'undefined');
		});

		it('should handle empty to-one relationships', function () {
			const store = new Store();
			const payload = {
				data: {
					type: 'article',
					id: '1337',
					relationships: {
						author: {
							data: null
						}
					}
				}
			};

			store.sync(payload);
			const [article] = store.findAll('article');
			assert.ok(article instanceof Model);
			const serializedArticle = article.serialize();
			assert.ok(!Array.isArray(serializedArticle.data));
			assert.equal(serializedArticle.data?.relationships?.['author']?.data, null);
		});

		it('should serialize links', function () {
			const store = new Store();
			const payload = {
				data: {
					type: 'article',
					id: '1337',
					links: {
						self: 'http://example.com/articles/1337'
					}
				}
			};

			store.sync(payload);
			const [article] = store.findAll('article');
			assert.ok(article instanceof Model);
			const serializedArticle = article.serialize();
			assert.ok(!Array.isArray(serializedArticle.data));
			assert.equal(serializedArticle.data?.links?.self, 'http://example.com/articles/1337');
		});

		it('should serialize meta', function () {
			const store = new Store();
			const payload = {
				data: {
					type: 'article',
					id: '1337',
					meta: {
						count: 1
					}
				}
			};

			store.sync(payload);
			const [article] = store.findAll('article');
			assert.ok(article instanceof Model);
			const serializedArticle = article.serialize();
			assert.ok(!Array.isArray(serializedArticle.data));
			assert.equal(serializedArticle.data?.meta?.['count'], 1);
		});
	});

	describe('.setAttribute()', function () {
		context('when attribute is not set', function () {
			/** @typedef {Model & {title: string}} Article */
			it('should add a new attribute', function () {
				const article = /** @type {Article}*/ (new Model('article'));
				article.setAttribute('title', 'Cool article');
				assert.equal(article.title, 'Cool article');
			});
		});

		context('when attribute is set', function () {
			/** @typedef {Model & {title: string}} Article */
			it('should modify existing attribute', function () {
				const article = /** @type {Article}*/ (new Model('article'));
				article.setAttribute('title', 'Cool article');
				article.setAttribute('title', 'Cooler article');
				assert.equal(article.title, 'Cooler article');
			});
		});
	});

	describe('.setRelationship()', function () {
		context('when relationship is not set', function () {
			it('should add a new relationship', function () {
				/** @typedef {Model & {author: {name: string}}} Article */
				const user = new Model('user', '13');
				user.setAttribute('name', 'Lucas');
				const article = /** @type {Article}*/ (new Model('article'));
				article.setRelationship('author', user);
				assert.equal(article.author.name, 'Lucas');
			});

			it('should add the new relationship to the list of relationships', function () {
				/** @typedef {Model & {author: Model}} Article */
				const user = new Model('user', '13');
				user.setAttribute('name', 'Lucas');
				const article = /** @type {Article} */ (new Model('article'));
				article.setRelationship('author', user);
				assert.equal(article.author, user);
			});
		});

		context('when relationship is set', function () {
			it('should modify existing relationship', function () {
				/** @typedef {Model & {author: Model}} Article */
				const user1 = new Model('user', '13');
				const user2 = new Model('user', '14');
				const article = /** @type {Article}*/ (new Model('article'));
				article.setRelationship('author', user1);
				article.setRelationship('author', user2);
				assert.equal(article.author.id, '14');
			});

			it('should not duplicate relationship in the list of relationships', function () {
				/** @typedef {Model & {author: Model}} Article */
				const user1 = new Model('user', '13');
				const user2 = new Model('user', '14');
				const article = /** @type {Article}*/ (new Model('article'));
				article.setRelationship('author', user1);
				article.setRelationship('author', user2);
				assert.equal(article.author, user2);
			});

			it('should push relationship to the list of relationships', function () {
				/** @typedef {Model & {author: Model[]}} Article */
				const user1 = new Model('user', '13');
				const user2 = new Model('user', '14');
				const article = /** @type {Article} */ (new Model('article'));
				article.setRelationship('author', []);
				article.setRelationship('author', user1);
				article.setRelationship('author', user2);
				assert.ok(Array.isArray(article.author));
				assert.equal(article.author.length, 2);
			});
		});
	});

	describe('.sync()', function () {
		context('when given a simple payload', function () {
			/** @typedef {Model & {title: string, author: string}} Article */
			const article = /** @type {Article} */ (new Model('article', '1337'));
			const payload = {
				attributes: {
					title: 'Cool article',
					author: 'Lucas'
				}
			};

			it('should set the attributes', function () {
				article.sync(payload);
				assert.equal(article.title, 'Cool article');
				assert.equal(article.author, 'Lucas');
			});
		});

		context('when given a payload with relationships', function () {
			/** @typedef {Model & {author: Model}} Article */
			const article = /** @type {Article} */ (new Model('article', '1337'));
			const payload = {
				relationships: {
					author: {
						data: {
							type: 'user',
							id: '1'
						}
					}
				}
			};

			it('should set the attributes and relationships', function () {
				article.sync(payload);
				assert.equal(article.author.type, 'user');
				assert.equal(article.author.id, '1');
			});
		});
	});
});
