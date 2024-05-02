import assert from 'node:assert';
import { Store, Model } from '../index.js';

/**
 * @typedef {import('../internal.ts').JSONAPIDocument} JSONAPIDocument
 */

describe('Store', function () {
	describe('.sync()', function () {
		context('when given a simple payload', function () {
			const store = new Store();
			const payload = {
				data: {
					type: 'article',
					id: '1337'
				}
			};

			it('should set the id', function () {
				store.sync(payload);
				const [article] = store.findAll('article');
				assert.ok(article instanceof Model);
				assert.equal(article.id, '1337');
			});

			it('should set the type', function () {
				store.sync(payload);
				const [article] = store.findAll('article');
				assert.ok(article instanceof Model);
				assert.equal(article.type, 'article');
			});
		});

		context('when given a payload with simple attributes', function () {
			/** @typedef {Model & {title: string, author: string}} Article */
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

			it('should set the attributes', function () {
				store.sync(payload);
				const [article] = /** @type {Article[]} */ (store.findAll('article'));
				assert.ok(article instanceof Model);
				assert.equal(article.title, 'Cool article');
				assert.equal(article.author, 'Lucas');
			});
		});

		context('when given a payload with multiple resources', function () {
			const store = new Store();
			const payload = {
				data: [
					{
						type: 'article',
						id: '1337',
						attributes: {
							title: 'Cool article',
							author: 'Lucas'
						}
					},
					{
						type: 'article',
						id: '1338',
						attributes: {
							title: 'Better article',
							author: 'Romain'
						}
					}
				]
			};

			it('should create as many models', function () {
				store.sync(payload);
				const articles = store.findAll('article');
				assert.ok(Array.isArray(articles));
				assert.equal(articles.length, 2);
			});
		});

		context('when given a payload with relationships', function () {
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
								id: '1'
							}
						}
					}
				}
			};

			context('when syncing related resources later', function () {
				/** @typedef {Model & {author: {name: string}}} Article */
				const authorPayload = {
					data: {
						type: 'user',
						id: '1',
						attributes: {
							name: 'Lucas'
						}
					}
				};

				it('should update relationships', function () {
					store.sync(payload);
					const [article] = /** @type {Article[]} */ (store.findAll('article'));
					store.sync(authorPayload);
					assert.ok(article instanceof Model);
					assert.equal(article.author.name, 'Lucas');
				});
			});
		});

		context('when given a payload with included relationships', function () {
			/** @typedef {Model & {author: {name: string}}} Article */
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
								id: '1'
							}
						}
					}
				},
				included: [
					{
						type: 'user',
						id: '1',
						attributes: {
							name: 'Lucas'
						}
					}
				]
			};

			it('should create and link the related model', function () {
				store.sync(payload);
				const [article] = /** @type {Article[]} */ (store.findAll('article'));
				assert.ok(article instanceof Model);
				assert.equal(article.author.name, 'Lucas');
			});
		});

		context('when given a payload with mutual references', function () {
			/** @typedef {Model & {related_article: {id: string}}} Article */
			const store = new Store();
			const payload = {
				data: [
					{
						type: 'article',
						id: '1337',
						attributes: {
							title: 'Cool article'
						},
						relationships: {
							'related_article': {
								data: {
									type: 'article',
									id: '1338'
								}
							}
						}
					},
					{
						type: 'article',
						id: '1338',
						attributes: {
							title: 'Better article'
						},
						relationships: {
							'related_article': {
								data: {
									type: 'article',
									id: '1337'
								}
							}
						}
					}
				]
			};

			it('should create and link both models', function () {
				store.sync(payload);
				const articles = /** @type {Article[]} */ (store.findAll('article'));
				assert.ok(Array.isArray(articles));
				assert.equal(articles[0]?.related_article.id, '1338');
				assert.equal(articles[1]?.related_article.id, '1337');
			});
		});

		context('when given a payload with errors', function () {
			const store = new Store();
			const payload = {
				errors: [
					{
						status: '422',
						source: {
							pointer: '/data/attributes/title'
						},
						detail: 'is too short (minimum is 3 characters)'
					}
				]
			};

			it('should contain error object', function () {
				store.sync(payload);
				const articleErrors = store.errors;
				assert.equal(articleErrors?.[0]?.status, '422');
				assert.deepEqual(articleErrors?.[0]?.source, {
					pointer: '/data/attributes/title'
				});
				assert.equal(articleErrors?.[0]?.detail, 'is too short (minimum is 3 characters)');
			});
		});

		context('when given a simple payload with meta', function () {
			const store = new Store();
			const payload = {
				data: {
					type: 'article',
					id: '1337'
				},
				meta: {
					test: 'abc'
				}
			};

			it('should contain meta data', function () {
				store.sync(payload);
				// eslint-disable-next-line dot-notation
				assert.equal(store?.meta?.['test'], 'abc');
			});

			it('should contain models', function () {
				store.sync(payload);
				const [article] = store.findAll('article');
				assert.ok(article instanceof Model);
				assert.equal(article.id, '1337');
				assert.equal(article.type, 'article');
			});
		});

		context('when given a simple payload without meta', function () {
			const store = new Store();
			const payload = {
				data: {
					type: 'article',
					id: '1337'
				}
			};

			it('should contain empty meta data', function () {
				store.sync(payload);
				assert.ok(typeof store.meta === 'undefined');
			});

			it('should contain models', function () {
				store.sync(payload);
				const [article] = store.findAll('article');
				assert.ok(article instanceof Model);
				assert.equal(article.id, '1337');
				assert.equal(article.type, 'article');
			});
		});

		context('when given a simple payload with meta as different key', function () {
			const store = new Store();
			const payload = {
				data: {
					type: 'article',
					id: '1337'
				},
				metadata: {
					test: 'abc'
				}
			};

			it('should contain empty meta data when not setting meta key', function () {
				store.sync(payload);
				assert.ok(typeof store.meta === 'undefined');
			});
		});
	});

	describe('.reset()', function () {
		const store = new Store();
		const payload = {
			data: {
				type: 'article',
				id: '1337'
			},
			meta: {
				test: 'abc'
			}
		};

		it('should empty the store', function () {
			store.sync(payload);
			assert.ok(typeof store.meta !== 'undefined');
			store.reset();
			assert.ok(typeof store.meta === 'undefined');
		});

		it('should not invalidate previous references', function () {
			store.sync(payload);
			const [article] = store.findAll('article');
			store.reset();
			assert.ok(article instanceof Model);
			assert.equal(article.id, '1337');
		});
	});

	describe('.find()', function () {
		const store = new Store();
		const payload = {
			data: [
				{
					type: 'article',
					id: '1337'
				},
				{
					type: 'article',
					id: '1338'
				}
			]
		};

		it('should find an existing model', function () {
			store.sync(payload);
			const article = store.find('article', '1337');
			assert.ok(article instanceof Model);
			assert.equal(article.id, '1337');
		});

		it('should not find a non-existing model', function () {
			store.sync(payload);
			const article = store.find('article', '9999');
			assert.equal(article, null);
		});

		it('should not find a non-existing model type', function () {
			store.sync(payload);
			const article = store.find('bad', '1337');
			assert.equal(article, null);
		});
	});

	describe('.findAll()', function () {
		const store = new Store();
		const payload = {
			data: [
				{
					type: 'article',
					id: '1338'
				},
				{
					type: 'article',
					id: '1336'
				},
				{
					type: 'article',
					id: '1337'
				}
			]
		};

		it('should find all existing models in order of the given payload', function () {
			store.sync(payload);
			const articles = store.findAll('article');
			assert.equal(articles.length, 3);
			assert.equal(articles[0]?.id, '1338');
			assert.equal(articles[1]?.id, '1336');
			assert.equal(articles[2]?.id, '1337');
		});

		it('should not find a non-existing model', function () {
			store.sync(payload);
			const articles = store.findAll('bad');
			assert.equal(articles.length, 0);
		});
	});

	describe('.destroy()', function () {
		const store = new Store();
		const payload = {
			data: [
				{
					type: 'article',
					id: '1337',
					attributes: {
						title: 'Cool article'
					},
					relationships: {
						'related_article': {
							data: {
								type: 'article',
								id: '1338'
							}
						}
					}
				},
				{
					type: 'article',
					id: '1338',
					attributes: {
						title: 'Better article'
					},
					relationships: {
						'related_article': {
							data: {
								type: 'article',
								id: '1337'
							}
						}
					}
				}
			]
		};

		it('should destroy an existing model and remove the id from the order cache', function () {
			store.sync(payload);
			store.destroy(store.find('article', '1337'));
			const article = store.find('article', '1337');
			assert.equal(article, null);
		});

		it('should detach references on dependent models', function () {
			/** @typedef {Model & {related_article: ?Model}} Article */
			store.sync(payload);
			const article = /** @type {Article}*/ (store.find('article', '1338'));
			const relatedArticle = /** @type {Article}*/ (store.find('article', '1337'));
			assert.equal(article.related_article, relatedArticle);
			store.destroy(relatedArticle);
			assert.equal(article.related_article, null);
		});
	});
});
