import { expect } from 'chai';
import { Store, Model } from '../index';

describe('Model', function () {
	describe('.serialize()', function () {
		it('should serialize a bare model', function () {
			const serializedModel = new Model('datatype', 1337).serialize();
			expect(serializedModel).to.deep.eq({
				data: {
					id: 1337,
					type: 'datatype'
				}
			});
		});

		it('should serialize all attributes by default', function () {
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

			const article = store.sync(payload);
			const serializedArticle = article.serialize();
			expect(serializedArticle).to.deep.eq(payload);
		});

		it('should serialize all relationships by default', function () {
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
								id: 3
							}
						}
					}
				}
			};

			const article = store.sync(payload);
			const serializedArticle = article.serialize();
			expect(serializedArticle).to.deep.eq(payload);
		});

		it('should serialize only specified attributes', function () {
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

			const article = store.sync(payload);
			const serializedArticle = article.serialize({
				attributes: ['author']
			});
			expect(serializedArticle.data.attributes.title).to.be.undefined;
		});

		it('should serialize only specified relationships', function () {
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
								id: 3
							}
						},
						tags: {
							data: [
								{ type: 'tag', id: 12 },
								{ type: 'tag', id: 74 }
							]
						}
					}
				}
			};

			const article = store.sync(payload);
			const serializedArticle = article.serialize({
				relationships: ['author']
			});
			expect(serializedArticle.data.relationships.tags).to.be.undefined;
		});

		it('should not serialize the id on fresh models', function () {
			const article = new Model('article');
			const serializedArticle = article.serialize();
			expect(serializedArticle.data.id).to.be.undefined;
		});

		it('should handle empty to-one relationships', function () {
			const store = new Store();
			const payload = {
				data: {
					type: 'article',
					id: 1337,
					relationships: {
						author: {
							data: null
						}
					}
				}
			};

			const article = store.sync(payload);
			const serializedArticle = article.serialize();
			expect(serializedArticle.data.relationships.author.data).to.be.null;
		});

		it('should serialize links', function () {
			const store = new Store();
			const payload = {
				data: {
					type: 'article',
					id: 1337,
					links: {
						self: 'http://example.com/articles/1337'
					}
				}
			};

			const article = store.sync(payload);
			const serializedArticle = article.serialize();
			expect(serializedArticle.data.links.self).to.eq(
				'http://example.com/articles/1337'
			);
		});

		it('should serialize meta', function () {
			const store = new Store();
			const payload = {
				data: {
					type: 'article',
					id: 1337,
					meta: {
						count: 1
					}
				}
			};

			const article = store.sync(payload);
			const serializedArticle = article.serialize();
			expect(serializedArticle.data.meta.count).to.eq(1);
		});
	});

	describe('.setAttribute()', function () {
		context('when attribute is not set', function () {
			it('should add a new attribute', function () {
				const article = new Model('article');
				article.setAttribute('title', 'Cool article');
				expect(article.title).to.eq('Cool article');
			});

			it('should add the new attribute to the list of attributes', function () {
				const article = new Model('article');
				article.setAttribute('title', 'Cool article');
				expect(article._attributes).to.include('title');
			});
		});

		context('when attribute is set', function () {
			it('should modify existing attribute', function () {
				const article = new Model('article');
				article.setAttribute('title', 'Cool article');
				article.setAttribute('title', 'Cooler article');
				expect(article.title).to.eq('Cooler article');
			});

			it('should not duplicate attribute in the list of attributes', function () {
				const article = new Model('article');
				article.setAttribute('title', 'Cool article');
				article.setAttribute('title', 'Cooler article');
				expect(
					article._attributes.filter(function (value) {
						return value === 'title';
					}).length
				).to.eq(1);
			});
		});
	});

	describe('.setRelationship()', function () {
		context('when relationship is not set', function () {
			it('should add a new relationship', function () {
				const user = new Model('user', 13);
				user.setAttribute('name', 'Lucas');
				const article = new Model('article');
				article.setRelationship('author', user);
				expect(article.author.name).to.eq('Lucas');
			});

			it('should add the new relationship to the list of relationships', function () {
				const user = new Model('user', 13);
				user.setAttribute('name', 'Lucas');
				const article = new Model('article');
				article.setRelationship('author', user);
				expect(article._relationships).to.include('author');
			});
		});

		context('when relationship is set', function () {
			it('should modify existing relationship', function () {
				const user1 = new Model('user', 13);
				const user2 = new Model('user', 14);
				const article = new Model('article');
				article.setRelationship('author', user1);
				article.setRelationship('author', user2);
				expect(article.author.id).to.eq(14);
			});

			it('should not duplicate relationship in the list of relationships', function () {
				const user1 = new Model('user', 13);
				const user2 = new Model('user', 14);
				const article = new Model('article');
				article.setRelationship('author', user1);
				article.setRelationship('author', user2);
				expect(
					article._relationships.filter(function (value) {
						return value === 'author';
					}).length
				).to.eq(1);
			});

			it('should push relationship to the list of relationships', function () {
				const user1 = new Model('user', 13);
				const user2 = new Model('user', 14);
				const article = new Model('article');
				article.setRelationship('author', []);
				article.setRelationship('author', user1);
				article.setRelationship('author', user2);
				expect(Array.isArray(article.author)).to.eq(true);
				expect(article.author.length).to.eq(2);
			});
		});
	});
});
