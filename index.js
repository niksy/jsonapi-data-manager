/* eslint-disable guard-for-in, no-loop-func, no-undefined */

function arrayFind(array, callback) {
	if (!Array.prototype.find) {
		return array.find(callback);
	}
	return array.find(callback);
}

/**
 * @class Model
 */
class Model {
	/**
	 * @function constructor
	 * @param {string} type - The type of the model.
	 * @param {string} id - The id of the model.
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
	 * Add a dependent to a model.
	 *
	 * @function _addDependence
	 * @param {string} type - The type of the dependent model.
	 * @param {string} id - The id of the dependent model.
	 * @param {string} key - The name of the relation found on the dependent model.
	 */
	_addDependence(type, id, key) {
		var self = this;
		var found;

		found = arrayFind(self._dependents, function (dependent) {
			return (
				dependent.id === id &&
				dependent.type === type &&
				dependent.relation === key
			);
		});
		if (typeof found === 'undefined') {
			self._dependents.push({ id: id, type: type, relation: key });
		}
	}

	/**
	 * Removes a dependent from a model.
	 *
	 * @function _removeDependence
	 * @param {string} type - The type of the dependent model.
	 * @param {string} id - The id of the dependent model.
	 */
	_removeDependence(type, id) {
		var self = this;
		var found;

		self._dependents.forEach(function (value, index) {
			if (value.id === id && value.type === type) {
				self._dependents.splice(index, 1);
			}
		});
	}

	/**
	 * Removes a relationship from a model.
	 *
	 * @function removeRelationship
	 * @param {string} type - The type of the dependent model.
	 * @param {string} id - The id of the dependent model.
	 * @param {string} relName - The name of the relationship.
	 */
	removeRelationship(type, id, relName) {
		var self = this;
		self._removeDependence(type, id);
		if (self[relName].constructor === Array) {
			self[relName].forEach(function (value, index) {
				if (value.id === id && value._type === type) {
					self[relName].splice(index, 1);
				}
			});
		} else if (self[relName].id === id) {
			self[relName] = null;
		}
	}

	/**
	 * Serialize a model.
	 *
	 * @function serialize
	 * @param {object} options - The options for serialization.  Available properties:
	 *
	 * - `{array=}` `attributes` The list of attributes to be serialized (default: all attributes).
	 * - `{array=}` `relationships` The list of relationships to be serialized (default: all relationships).
	 * - `{array=}` `links` The list of links to be serialized (default: all links).
	 * - `{array=}` `meta` The list of meta properties to be serialized (default: all meta properties).
	 *
	 * @returns {object} JSONAPI-compliant object.
	 */
	serialize(options) {
		var self = this;
		var res = { data: { type: this._type } };
		var key;

		options = options || {};
		options.attributes = options.attributes || this._attributes;
		options.relationships = options.relationships || this._relationships;
		options.links = options.links || undefined;
		options.meta = options.meta || undefined;

		if (typeof this.id !== 'undefined') res.data.id = this.id;
		if (options.attributes.length !== 0) res.data.attributes = {};
		if (options.relationships.length !== 0) res.data.relationships = {};

		options.attributes.forEach(function (key) {
			res.data.attributes[key] = self[key];
		});

		options.relationships.forEach(function (key) {
			function relationshipIdentifier(model) {
				return { type: model._type, id: model.id };
			}
			if (!self[key]) {
				res.data.relationships[key] = { data: null };
			} else if (self[key].constructor === Array) {
				res.data.relationships[key] = {
					data: self[key].map(relationshipIdentifier)
				};
			} else {
				res.data.relationships[key] = {
					data: relationshipIdentifier(self[key])
				};
			}
			if (self._relationshipLinks[key]) {
				res.data.relationships[key].links =
					self._relationshipLinks[key];
			}
			if (self._relationshipMeta[key]) {
				res.data.relationships[key].meta = self._relationshipMeta[key];
			}
		});

		if (Object.keys(this._links).length !== 0) {
			if (typeof options.links === 'undefined') {
				res.data.links = this._links;
			} else if (options.links && options.links.length !== 0) {
				res.data.links = {};
				options.links.forEach(function (key) {
					res.data.links[key] = self._links[key];
				});
			}
		}

		if (Object.keys(this._meta).length !== 0) {
			if (typeof options.meta === 'undefined') {
				res.data.meta = this._meta;
			} else if (options.meta && options.meta.length !== 0) {
				res.data.meta = {};
				options.meta.forEach(function (key) {
					res.data.meta[key] = self._meta[key];
				});
			}
		}

		return res;
	}

	/**
	 * Set/add an attribute to a model.
	 *
	 * @function setAttribute
	 * @param {string} attributeName - The name of the attribute.
	 * @param {object} value - The value of the attribute.
	 */
	setAttribute(attributeName, value) {
		if (typeof this[attributeName] === 'undefined')
			this._attributes.push(attributeName);
		this[attributeName] = value;
	}

	/**
	 * Set/add a relationships to a model.
	 *
	 * @function setRelationship
	 * @param {string} relName - The name of the relationship.
	 * @param {object} models - The linked model(s).
	 */
	setRelationship(relName, models) {
		var self = this;
		if (typeof self[relName] === 'undefined') {
			self._relationships.push(relName);
			self[relName] = models;
		} else if (self[relName].constructor === Array) {
			self[relName].push(models);
		} else {
			self[relName] = models;
		}
	}
}

/**
 * @class Store
 */
class Store {
	/**
	 * @function constructor
	 */
	constructor() {
		this.graph = {};
		this.order = {};
	}

	/**
	 * Remove a model from the store.
	 *
	 * @function destroy
	 * @param {object} model - The model to destroy.
	 */
	destroy(model) {
		var self = this;
		model._destroyed = true;
		model._dependents.forEach(function (dependent, depIndex) {
			self.graph[dependent.type][dependent.id].removeRelationship(
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
	 * Retrieve a model by type and id. Constant-time lookup.
	 *
	 * @function find
	 * @param {string} type - The type of the model.
	 * @param {string} id - The id of the model.
	 * @returns {object} The corresponding model if present, and null otherwise.
	 */
	find(type, id) {
		if (!this.graph[type] || !this.graph[type][id]) return null;
		return this.graph[type][id];
	}

	/**
	 * Retrieve all models by type.
	 *
	 * @function findAll
	 * @param {string} type - The type of the model.
	 * @returns {object} Array of the corresponding model if present, and empty array otherwise.
	 */
	findAll(type) {
		var self = this;

		if (!this.graph[type]) return [];
		return self.order[type].map(function (modelId) {
			return self.graph[type][modelId];
		});
	}

	/**
	 * Empty the store.
	 *
	 * @function reset
	 */
	reset() {
		this.graph = {};
		this.order = {};
	}

	initModel(type, id) {
		this.graph[type] = this.graph[type] || {};
		this.order[type] = this.order[type] || [];
		this.graph[type][id] = this.graph[type][id] || new Model(type, id);
		let currentOrderIndex = this.order[type].indexOf(id);
		if (currentOrderIndex === -1) {
			this.order[type].push(id);
		} else {
			// Remove the id from the current order and add it to the bottom
			this.order[type].splice(currentOrderIndex, 1);
			this.order[type].push(id);
		}
		return this.graph[type][id];
	}

	syncRecord(rec) {
		var self = this;
		var model = this.initModel(rec.type, rec.id);
		var key;

		function findOrInit(resource) {
			if (!self.find(resource.type, resource.id)) {
				let placeHolderModel = self.initModel(
					resource.type,
					resource.id
				);
				placeHolderModel._placeHolder = true;
			}
			return self.graph[resource.type][resource.id];
		}

		delete model._placeHolder;

		for (key in rec.attributes) {
			if (model._attributes.indexOf(key) === -1) {
				model._attributes.push(key);
			}
			model[key] = rec.attributes[key];
		}

		if (rec.links) {
			model._links = model.links = rec.links;
		}

		if (rec.meta) {
			model._meta = model.meta = rec.meta;
		}

		if (rec.relationships) {
			for (key in rec.relationships) {
				let rel = rec.relationships[key];
				if (typeof rel.data !== 'undefined') {
					if (model._relationships.indexOf(key) === -1) {
						model._relationships.push(key);
					}
					if (rel.data === null) {
						model[key] = null;
					} else if (rel.data.constructor === Array) {
						model[key] = rel.data.map(findOrInit);
						model[key].forEach(function (record) {
							record._addDependence(model._type, model.id, key);
						});
					} else {
						model[key] = findOrInit(rel.data);
						model[key]._addDependence(model._type, model.id, key);
					}
				}
				if (rel.links) {
					model._relationshipLinks[key] = rel.links;
				}
				if (rel.meta) {
					model._relationshipMeta[key] = rel.meta;
				}
			}
		}

		return model;
	}

	/**
	 * Sync a JSONAPI-compliant payload with the store and return any top level properties included in the payload.
	 *
	 * @function sync
	 * @param {object} payload - The JSONAPI payload.
	 * @param {object} options - The options for sync. Available properties:
	 *
	 * - `{boolean=}` `topLevel` Return top level properties (default: false).
	 * @returns {object} The model/array of models corresponding to the payload's primary resource(s) and any top level properties.
	 */
	sync(payload, options) {
		var primary = payload.data;
		var syncRecord = this.syncRecord.bind(this);
		var object = {};
		options = options || {};
		options.topLevel = options.topLevel || false;
		if ('meta' in payload) {
			object.meta = payload.meta;
		}
		if ('links' in payload) {
			object.links = payload.links;
		}
		if ('jsonapi' in payload) {
			object.jsonapi = payload.jsonapi;
		}
		if (payload.errors) {
			object.errors = payload.errors;
			return object;
		}
		if (!primary) return [];
		if (payload.included) payload.included.map(syncRecord);
		object.data =
			primary.constructor === Array
				? primary.map(syncRecord)
				: syncRecord(primary);
		if (options.topLevel) {
			return object;
		}
		return object.data;
	}
}

export { Store, Model };
