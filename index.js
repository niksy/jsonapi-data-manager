function hasOwnProperty_(object, key) {
	return Object.prototype.hasOwnProperty.call(object, key);
}

class Model {
	/**
	 * @param {string} type
	 * @param {string} id
	 */
	constructor(type, id) {
		this.id = id;
		this._type = type;
		this._attributes = [];
		this._dependents = [];
		this._relationships = [];
		this._links = this.links = {};
		this._relationshipLinks = {};
		this._meta = this.meta = {};
		this._relationshipMeta = {};
		this._destroyed = false;
	}

	/**
	 * @param {string} type
	 * @param {string} id
	 * @param {string} key
	 */
	_addDependence(type, id, key) {
		const found = this._dependents.find((dependent) => {
			return (
				dependent.id === id &&
				dependent.type === type &&
				dependent.relation === key
			);
		});
		if (typeof found === 'undefined') {
			this._dependents.push({ id: id, type: type, relation: key });
		}
	}

	/**
	 * @param {string} type
	 * @param {string} id
	 */
	_removeDependence(type, id) {
		this._dependents.forEach((value, index) => {
			if (value.id === id && value.type === type) {
				this._dependents.splice(index, 1);
			}
		});
	}

	/**
	 * @param {string} type
	 * @param {string} id
	 * @param {string} relationshipName
	 */
	removeRelationship(type, id, relationshipName) {
		this._removeDependence(type, id);
		if (Array.isArray(this[relationshipName])) {
			this[relationshipName].forEach((value, index) => {
				if (value.id === id && value._type === type) {
					this[relationshipName].splice(index, 1);
				}
			});
		} else if (this[relationshipName].id === id) {
			this[relationshipName] = null;
		}
	}

	/**
	 * @param {object} options
	 * @param {Array} options.attributes
	 * @param {Array} options.relationships
	 * @param {Array} options.links
	 * @param {Array} options.meta
	 *
	 * @returns {object}
	 */
	serialize(options = {}) {
		const relationshipIdentifier = (model) => {
			return { type: model._type, id: model.id };
		};

		const response = { data: { type: this._type } };
		const {
			attributes = this._attributes,
			relationships = this._relationships,
			links,
			meta
		} = options;

		if (typeof this.id !== 'undefined') {
			response.data.id = this.id;
		}
		if (attributes.length !== 0) {
			response.data.attributes = {};
		}
		if (relationships.length !== 0) {
			response.data.relationships = {};
		}

		attributes.forEach((key) => {
			response.data.attributes[key] = this[key];
		});

		relationships.forEach((key) => {
			if (!this[key]) {
				response.data.relationships[key] = { data: null };
			} else if (Array.isArray(this[key])) {
				response.data.relationships[key] = {
					data: this[key].map((relationship) =>
						relationshipIdentifier(relationship)
					)
				};
			} else {
				response.data.relationships[key] = {
					data: relationshipIdentifier(this[key])
				};
			}
			if (this._relationshipLinks[key]) {
				response.data.relationships[
					key
				].links = this._relationshipLinks[key];
			}
			if (this._relationshipMeta[key]) {
				response.data.relationships[key].meta = this._relationshipMeta[
					key
				];
			}
		});

		if (Object.keys(this._links).length !== 0) {
			if (typeof links === 'undefined') {
				response.data.links = this._links;
			} else if (Array.isArray(links) && links.length !== 0) {
				response.data.links = {};
				links.forEach((key) => {
					response.data.links[key] = this._links[key];
				});
			}
		}

		if (Object.keys(this._meta).length !== 0) {
			if (typeof meta === 'undefined') {
				response.data.meta = this._meta;
			} else if (Array.isArray(meta) && meta.length !== 0) {
				response.data.meta = {};
				meta.forEach((key) => {
					response.data.meta[key] = this._meta[key];
				});
			}
		}

		return response;
	}

	/**
	 * @param {string} attributeName
	 * @param {*} value
	 */
	setAttribute(attributeName, value) {
		if (typeof this[attributeName] === 'undefined') {
			this._attributes.push(attributeName);
		}
		this[attributeName] = value;
	}

	/**
	 * @param {string} relationshipName
	 * @param {Model[]} models
	 */
	setRelationship(relationshipName, models) {
		if (typeof this[relationshipName] === 'undefined') {
			this._relationships.push(relationshipName);
			this[relationshipName] = models;
		} else if (Array.isArray(this[relationshipName])) {
			this[relationshipName].push(models);
		} else {
			this[relationshipName] = models;
		}
	}
}

class Store {
	constructor() {
		this.graph = {};
		this.order = {};
	}

	/**
	 * @param {Model} model
	 */
	destroy(model) {
		model._destroyed = true;
		model._dependents.forEach((dependent) => {
			this.graph[dependent.type][dependent.id].removeRelationship(
				model._type,
				model.id,
				dependent.relation
			);
		});
		delete this.graph[model._type][model.id];
		this.order[model._type].splice(
			this.order[model._type].indexOf(model.id),
			1
		);
	}

	/**
	 * @param {string} type
	 * @param {string} id
	 *
	 * @returns {?Model}
	 */
	find(type, id) {
		if (!this.graph[type] || !this.graph[type][id]) {
			return null;
		}
		return this.graph[type][id];
	}

	/**
	 * @param {string} type
	 *
	 * @returns {Model[]}
	 */
	findAll(type) {
		if (!this.graph[type]) {
			return [];
		}
		return this.order[type].map((modelId) => this.graph[type][modelId]);
	}

	reset() {
		this.graph = {};
		this.order = {};
	}

	/**
	 * @param  {string} type
	 * @param  {string} id
	 *
	 * @returns {Model}
	 */
	initModel(type, id) {
		this.graph[type] = this.graph[type] || {};
		this.order[type] = this.order[type] || [];
		this.graph[type][id] = this.graph[type][id] || new Model(type, id);

		const currentOrderIndex = this.order[type].indexOf(id);

		if (currentOrderIndex === -1) {
			this.order[type].push(id);
		} else {
			// Remove the id from the current order and add it to the bottom
			this.order[type].splice(currentOrderIndex, 1);
			this.order[type].push(id);
		}
		return this.graph[type][id];
	}

	/**
	 * @param  {object} record
	 *
	 * @returns {Model}
	 */
	syncRecord(record) {
		const model = this.initModel(record.type, record.id);

		const findOrInit = (resource) => {
			if (!this.find(resource.type, resource.id)) {
				const placeHolderModel = this.initModel(
					resource.type,
					resource.id
				);
				placeHolderModel._placeHolder = true;
			}
			return this.graph[resource.type][resource.id];
		};

		delete model._placeHolder;

		for (const key in record.attributes) {
			if (hasOwnProperty_(record.attributes, key)) {
				const attribute = record.attributes[key];
				if (model._attributes.indexOf(key) === -1) {
					model._attributes.push(key);
				}
				model[key] = attribute;
			}
		}

		if (record.links) {
			model._links = model.links = record.links;
		}

		if (record.meta) {
			model._meta = model.meta = record.meta;
		}

		if (record.relationships) {
			for (const key in record.relationships) {
				if (hasOwnProperty_(record.relationships, key)) {
					const relationship = record.relationships[key];
					if (typeof relationship.data !== 'undefined') {
						if (model._relationships.indexOf(key) === -1) {
							model._relationships.push(key);
						}
						if (relationship.data === null) {
							model[key] = null;
						} else if (Array.isArray(relationship.data)) {
							model[key] = relationship.data.map((relationship) =>
								findOrInit(relationship)
							);
							model[key].forEach((record) => {
								record._addDependence(
									model._type,
									model.id,
									key
								);
							});
						} else {
							model[key] = findOrInit(relationship.data);
							model[key]._addDependence(
								model._type,
								model.id,
								key
							);
						}
					}
					if (relationship.links) {
						model._relationshipLinks[key] = relationship.links;
					}
					if (relationship.meta) {
						model._relationshipMeta[key] = relationship.meta;
					}
				}
			}
		}

		return model;
	}

	/**
	 * @param {object} payload
	 * @param {object} options
	 * @param {boolean} options.topLevel
	 *
	 * @returns {object}
	 */
	sync(payload = {}, options = {}) {
		const { data, meta, links, jsonapi, errors, included } = payload;
		const { topLevel = false } = options;
		const response = {};

		if (typeof meta !== 'undefined') {
			response.meta = meta;
		}

		if (typeof links !== 'undefined') {
			response.links = links;
		}

		if (typeof jsonapi !== 'undefined') {
			response.jsonapi = jsonapi;
		}

		if (typeof errors !== 'undefined') {
			response.errors = errors;
			return response;
		}

		if (typeof data === 'undefined') {
			return [];
		}

		if (typeof included !== 'undefined') {
			if (Array.isArray(included)) {
				included.forEach((record) => {
					this.syncRecord(record);
				});
			}
		}

		if (typeof data !== 'undefined') {
			if (Array.isArray(data)) {
				response.data = data.map((record) => this.syncRecord(record));
			} else {
				response.data = this.syncRecord(data);
			}
		}

		if (topLevel) {
			return response;
		}

		return response.data;
	}
}

export { Store, Model };
