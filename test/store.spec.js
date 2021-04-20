import { expect } from 'chai';
import { Store } from '../index';

describe('Store', function () {
	describe('.sync()', function () {
		context('when given a simple payload', function () {
			const store = new Store();
			const payload = {
				data: {
					type: 'article',
					id: 1337
				}
			};

			it('should set the id', function () {
				const article = store.sync(payload);
				expect(article.id).to.eq(1337);
			});

			it('should set the _type', function () {
				const article = store.sync(payload);
				expect(article._type).to.eq('article');
			});

			it('should set an empty _relationships', function () {
				const article = store.sync(payload);
				expect(article._relationships).to.deep.eq([]);
			});

			it('should set an empty _attributes', function () {
				const article = store.sync(payload);
				expect(article._relationships).to.deep.eq([]);
			});
		});

		context('when given a payload with simple attributes', function () {
			const store = new Store();
			const payload = {
				data: {
					type: 'article',
					id: 1337,
					attributes: {
						title: 'Cool article',
						author: 'Lucas'
					}
				}
			};

			it('should set the attributes', function () {
				const article = store.sync(payload);
				expect(article.title).to.eq('Cool article');
				expect(article.author).to.eq('Lucas');
			});

			it('should not duplicate the attributes if the record is processed again', function () {
				const article = store.sync(payload);
				store.sync(payload);
				expect(article._attributes.length).to.eq(2);
			});
		});

		context('when given a payload with multiple resources', function () {
			const store = new Store();
			const payload = {
				data: [
					{
						type: 'article',
						id: 1337,
						attributes: {
							title: 'Cool article',
							author: 'Lucas'
						}
					},
					{
						type: 'article',
						id: 1338,
						attributes: {
							title: 'Better article',
							author: 'Romain'
						}
					}
				]
			};

			it('should create as many models', function () {
				const articles = store.sync(payload);
				expect(articles.length).to.eq(2);
			});
		});

		context('when given a payload with relationships', function () {
			const store = new Store();
			const payload = {
				data: {
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
				}
			};

			it('should create placeholder models for related resources', function () {
				const article = store.sync(payload);
				expect(article.author._type).to.eq('user');
				expect(article.author.id).to.eq(1);
				expect(article.author._placeHolder).to.eq(true);
			});

			context('when syncing related resources later', function () {
				const authorPayload = {
					data: {
						type: 'user',
						id: 1,
						attributes: {
							name: 'Lucas'
						}
					}
				};

				it('should update relationships', function () {
					const article = store.sync(payload);
					store.sync(authorPayload);
					expect(article.author.name).to.eq('Lucas');
				});

				it('should remove the _placeHolder flag', function () {
					const article = store.sync(payload);
					store.sync(authorPayload);
					expect(article.author._placeHolder).not.to.eq(true);
				});
			});
		});

		context(
			'when given a payload with included relationships',
			function () {
				const store = new Store();
				const payload = {
					data: {
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
					included: [
						{
							type: 'user',
							id: 1,
							attributes: {
								name: 'Lucas'
							}
						}
					]
				};

				it('should create and link the related model', function () {
					const article = store.sync(payload);
					expect(article.author.name).to.eq('Lucas');
				});
			}
		);

		context('when given a payload with mutual references', function () {
			const store = new Store();
			const payload = {
				data: [
					{
						type: 'article',
						id: 1337,
						attributes: {
							title: 'Cool article'
						},
						relationships: {
							'related_article': {
								data: {
									type: 'article',
									id: 1338
								}
							}
						}
					},
					{
						type: 'article',
						id: 1338,
						attributes: {
							title: 'Better article'
						},
						relationships: {
							'related_article': {
								data: {
									type: 'article',
									id: 1337
								}
							}
						}
					}
				]
			};

			it('should create and link both models', function () {
				const articles = store.sync(payload);
				expect(articles[0].related_article.id).to.eq(1338);
				expect(articles[1].related_article.id).to.eq(1337);
			});
		});

		context('when given a payload with errors', function () {
			const store = new Store();
			const payload = {
				errors: [
					{
						status: 422,
						source: {
							pointer: '/data/attributes/title'
						},
						detail: 'is too short (minimum is 3 characters)'
					}
				]
			};

			it('should return error object', function () {
				const articleErrors = store.sync(payload).errors;
				expect(articleErrors[0].status).to.eq(422);
				expect(articleErrors[0].source).to.eql({
					pointer: '/data/attributes/title'
				});
				expect(articleErrors[0].detail).to.eq(
					'is too short (minimum is 3 characters)'
				);
			});
		});

		context('when given a simple payload with meta', function () {
			const store = new Store();
			const payload = {
				data: {
					type: 'article',
					id: 1337
				},
				meta: {
					test: 'abc'
				}
			};

			it('should return the meta data', function () {
				const result = store.sync(payload, { topLevel: true });
				expect(result.meta.test).to.eq('abc');
			});

			it('should return the data', function () {
				const result = store.sync(payload, { topLevel: true });
				expect(result.data.id).to.eq(1337);
				expect(result.data._type).to.eq('article');
			});
		});

		context('when given a simple payload without meta', function () {
			const store = new Store();
			const payload = {
				data: {
					type: 'article',
					id: 1337
				}
			};

			it('should return empty meta data', function () {
				/* eslint-disable no-undefined */
				const result = store.sync(payload, { topLevel: true });
				expect(result.meta).to.deep.eq(undefined);
			});

			it('should return the data', function () {
				const result = store.sync(payload, { topLevel: true });
				expect(result.data.id).to.eq(1337);
				expect(result.data._type).to.eq('article');
			});

			context(
				'when given a simple payload with meta as different key',
				function () {
					const store = new Store();
					const payload = {
						data: {
							type: 'article',
							id: 1337
						},
						metadata: {
							test: 'abc'
						}
					};

					it('should return empty meta data when not setting meta key', function () {
						/* eslint-disable no-undefined */
						const result = store.sync(payload, { topLevel: true });
						expect(result.meta).to.deep.eq(undefined);
					});
				}
			);
		});
	});

	describe('.reset()', function () {
		const store = new Store();
		const payload = {
			data: {
				type: 'article',
				id: 1337
			}
		};

		it('should empty the store', function () {
			store.sync(payload);
			store.reset();
			expect(store.graph).to.deep.eq({});
		});

		it('should not invalidate previous references', function () {
			const article = store.sync(payload);
			store.reset();
			expect(article.id).to.eq(1337);
		});
	});

	describe('.find()', function () {
		const store = new Store();
		const payload = {
			data: [
				{
					type: 'article',
					id: 1337
				},
				{
					type: 'article',
					id: 1338
				}
			]
		};

		it('should find an existing model', function () {
			store.sync(payload);
			const article = store.find('article', 1337);
			expect(article.id).to.eq(1337);
		});

		it('should not find a non-existing model', function () {
			store.sync(payload);
			const article = store.find('article', 9999);
			expect(article).to.eq(null);
		});

		it('should not find a non-existing model type', function () {
			store.sync(payload);
			const article = store.find('bad', 1337);
			expect(article).to.eq(null);
		});
	});

	describe('.findAll()', function () {
		const store = new Store();
		const payload = {
			data: [
				{
					type: 'article',
					id: 1338
				},
				{
					type: 'article',
					id: 1336
				},
				{
					type: 'article',
					id: 1337
				}
			]
		};

		it('should find all existing models in order of the given payload', function () {
			store.sync(payload);
			const articles = store.findAll('article');
			expect(articles.length).to.eq(3);
			expect(articles[0].id).to.eq(1338);
			expect(articles[1].id).to.eq(1336);
			expect(articles[2].id).to.eq(1337);
		});

		it('should not find a non-existing model', function () {
			store.sync(payload);
			const articles = store.findAll('bad');
			expect(articles.length).to.eq(0);
		});
	});

	describe('.destroy()', function () {
		const store = new Store();
		const payload = {
			data: [
				{
					type: 'article',
					id: 1337,
					attributes: {
						title: 'Cool article'
					},
					relationships: {
						'related_article': {
							data: {
								type: 'article',
								id: 1338
							}
						}
					}
				},
				{
					type: 'article',
					id: 1338,
					attributes: {
						title: 'Better article'
					},
					relationships: {
						'related_article': {
							data: {
								type: 'article',
								id: 1337
							}
						}
					}
				}
			]
		};

		it('should destroy an existing model and remove the id from the order cache', function () {
			store.sync(payload);
			store.destroy(store.find('article', 1337));
			const article = store.find('article', 1337);
			expect(article).to.eq(null);
			expect(store.order.article.length).to.eq(1);
		});

		it('should detach references on dependent models', function () {
			store.sync(payload);
			store.destroy(store.find('article', 1337));
			const article = store.find('article', 1338);
			expect(article.related_article).to.eq(null);
			expect(article._dependents.length).to.eq(0);
		});
	});
});
