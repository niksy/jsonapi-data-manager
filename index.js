/* eslint-disable jsdoc/require-returns-type */

/**
 * @typedef {{[x: string]: any}} ExtendedModel
 * @typedef {Model & ExtendedModel} IModel
 *
 * @typedef {import('./internal.ts').LinksObject} LinksObject
 * @typedef {import('./internal.ts').Meta} Meta
 * @typedef {import('./internal.ts').Linkage} Linkage
 * @typedef {import('./internal.ts').Relationship} Relationship
 */

class Model {
	/** @type {LinksObject} */
	#links = {};

	/** @type {Meta} */
	#meta = {};

	/** @type {string[]} */
	#attributes = [];

	/** @type {string[]} */
	#relationships = [];

	/** @type {{id: string, type: string, relation: string}[]} */
	#dependents = [];

	/** @type {{[x: string]: LinksObject}} */
	#relationshipLinks = {};

	/** @type {{[x: string]: Meta}} */
	#relationshipMeta = {};

	/**
	 * @param {string} type The type of the model.
	 * @param {string=} id The id of the model.
	 */
	constructor(type, id) {
		this.id = id;
		this.type = type;
		this.links = this.#links;
		this.meta = this.#meta;
	}

	/**
	 * Add a dependent to a model. Mostly used by stores.
	 *
	 * @param {string} type The type of the dependent model.
	 * @param {string} id The id of the dependent model.
	 * @param {string} relation The name of the relation found on the dependent model.
	 *
	 * @ignore
	 */
	addDependence(type, id, relation) {
		const dependents = this.#dependents;
		let found;
		for (const dependent of dependents) {
			if (dependent.id === id && dependent.type === type && dependent.relation === relation) {
				found = dependent;
				break;
			}
		}
		if (!found) {
			dependents.push({ id, type, relation });
		}
	}

	/**
	 * Removes a dependent from a model. Mostly used by stores.
	 *
	 * @param {string} type The type of the dependent model.
	 * @param {string} id The id of the dependent model.
	 *
	 * @ignore
	 */
	removeDependence(type, id) {
		const dependents = this.#dependents;
		for (const [index, dependent] of dependents.entries()) {
			if (dependent.id === id && dependent.type === type) {
				dependents.splice(index, 1);
			}
		}
	}

	/**
	 * Unlink dependent from model. Mostly used by stores.
	 *
	 * @param  {(dependent: {id: string, type: string, relation: string}) => ?Model} findModel
	 *
	 * @ignore
	 */
	unlinkDependence(findModel) {
		const dependents = this.#dependents;
		if (!this.id) {
			return;
		}
		for (const dependent of dependents) {
			// eslint-disable-next-line unicorn/no-array-method-this-argument
			const dependentModel = findModel(dependent);
			dependentModel?.removeRelationship(this.type, this.id, dependent.relation);
		}
	}

	/**
	 * Set/add an attribute to a model.
	 *
	 * @param {string} attributeName The name of the attribute.
	 * @param {any} value The value of the attribute.
	 *
	 * @this {IModel}
	 */
	setAttribute(attributeName, value) {
		if (typeof this[attributeName] === 'undefined') {
			this.#attributes.push(attributeName);
		}
		this[attributeName] = value;
	}

	/**
	 * Set/add a relationships to a model.
	 *
	 * @param {string} relationshipName The name of the relationship.
	 * @param {?Model|Model[]} models The linked model(s).
	 *
	 * @this {IModel}
	 */
	setRelationship(relationshipName, models) {
		if (typeof this[relationshipName] === 'undefined') {
			this.#relationships.push(relationshipName);
		}
		if (Array.isArray(this[relationshipName])) {
			this[relationshipName].push(models);
		} else {
			this[relationshipName] = models;
		}
	}

	/**
	 * Removes a relationship from a model.
	 *
	 * @param {string} type The type of the dependent model.
	 * @param {string} id The id of the dependent model.
	 * @param {string} relationshipName The name of the relationship.
	 *
	 * @this {IModel}
	 */
	removeRelationship(type, id, relationshipName) {
		this.removeDependence(type, id);

		/** @type {Model|Model[]=}*/
		const relationship = this[relationshipName];

		if (Array.isArray(relationship)) {
			for (const [index, model] of relationship.entries())
				if (model.id === id && model.type === type) {
					relationship.splice(index, 1);
				}
		} else if (relationship?.id === id) {
			this[relationshipName] = null;
		}
	}

	/**
	 * @typedef {object} ModelSerializeOptions
	 * @property {string[]=} attributes The list of attributes to be serialized. (Default: all attributes).
	 * @property {string[]=} relationships The list of relationships to be serialized. (Default: all relationships).
	 * @property {string[]=} links Links to be serialized.
	 * @property {string[]=} meta Meta information to be serialized.
	 */

	/**
	 * Serialize a model.
	 *
	 * @param {ModelSerializeOptions=} options The options for serialization.
	 *
	 * @returns JSON API compliant object.
	 *
	 * @this {IModel}
	 */
	serialize(options) {
		const relationshipIdentifier = (/** @type {Model}*/ model) => {
			if (typeof model.id === 'undefined') {
				return null;
			}
			return { type: model.type, id: model.id };
		};

		const response = /** @type {JSONAPIDocument} */ ({});
		response.data = /** @type {ResourceObject} */ ({});

		response.data.type = this.type;

		const {
			attributes = this.#attributes,
			relationships = this.#relationships,
			links,
			meta
		} = options ?? {};

		if (typeof this.id !== 'undefined') {
			response.data.id = this.id;
		}

		if (attributes.length !== 0) {
			response.data.attributes = {};
			for (const key of attributes) {
				response.data.attributes[key] = this[key];
			}
		}

		if (relationships.length !== 0) {
			response.data.relationships = {};
			for (const key of relationships) {
				const relationship = /** @type {?Model|Model[]}*/ (this[key]);
				const result = /** @type {Relationship}*/ ({});
				if (!relationship) {
					result.data = null;
				} else if (Array.isArray(relationship)) {
					/** @type {Linkage[]} */
					const identifiers = [];
					for (const relationshipModel of relationship) {
						const identifier = relationshipIdentifier(relationshipModel);
						if (identifier) {
							identifiers.push(identifier);
						}
					}
					result.data = identifiers;
				} else {
					result.data = relationshipIdentifier(relationship);
				}
				if (this.#relationshipLinks[key]) {
					result.links = this.#relationshipLinks[key];
				}
				if (this.#relationshipMeta[key]) {
					result.meta = this.#relationshipMeta[key];
				}
				response.data.relationships[key] = result;
			}
		}

		if (Object.keys(this.#links).length !== 0) {
			if (typeof links === 'undefined') {
				response.data.links = this.#links;
			} else if (Array.isArray(links) && links.length !== 0) {
				response.data.links = {};
				for (const key of links) {
					// @ts-ignore
					response.data.links[key] = this.#links[key];
				}
			}
		}

		if (Object.keys(this.#meta).length !== 0) {
			if (typeof meta === 'undefined') {
				response.data.meta = this.#meta;
			} else if (Array.isArray(meta) && meta.length !== 0) {
				response.data.meta = {};
				for (const key of meta) {
					response.data.meta[key] = this.#meta[key];
				}
			}
		}

		return response;
	}

	/**
	 * Sync record data to model.
	 *
	 * @param  {import('./internal.ts').Optional<ResourceObject, "id" | "type">} record Record data to sync.
	 * @param  {(resource: ResourceObject|Linkage) => ?Model=} modelFactory Model factory.
	 *
	 * @this {IModel}
	 */
	sync(record, modelFactory) {
		if (record.attributes) {
			for (const [key, attribute] of Object.entries(record.attributes)) {
				this.setAttribute(key, attribute);
			}
		}

		if (record.links) {
			this.#links = record.links;
			this.links = this.#links;
		}

		if (record.meta) {
			this.#meta = record.meta;
			this.meta = this.#meta;
		}

		if (record.relationships) {
			modelFactory ??= (resource) => {
				return new Model(resource.type, resource.id);
			};
			for (const [key, relationship] of Object.entries(record.relationships)) {
				let relationshipValue;
				if (typeof relationship.data !== 'undefined') {
					if (relationship.data === null) {
						relationshipValue = null;
					} else if (Array.isArray(relationship.data)) {
						const relationshipModels = [];
						for (const relation of relationship.data) {
							const model = modelFactory(relation);
							if (model) {
								relationshipModels.push(model);
							}
						}
						relationshipValue = relationshipModels;
						for (const relationshipModel of relationshipModels) {
							if (this.id) {
								relationshipModel?.addDependence(this.type, this.id, key);
							}
						}
					} else {
						const relationshipModel = modelFactory(relationship.data);
						relationshipValue = relationshipModel;
						if (this.id) {
							relationshipModel?.addDependence(this.type, this.id, key);
						}
					}
					this.setRelationship(key, relationshipValue);
				}
				if (relationship.links) {
					this.#relationshipLinks[key] = relationship.links;
				}
				if (relationship.meta) {
					this.#relationshipMeta[key] = relationship.meta;
				}
			}
		}
	}
}

/** @typedef {import('./internal.ts').JSONAPIDocument} JSONAPIDocument */
/** @typedef {import('./internal.ts').ResourceObject} ResourceObject */
/** @typedef {import('./internal.ts').JsonApiObject} JsonApiObject */
/** @typedef {import('./internal.ts').ErrorObject} ErrorObject */

class Store {
	/** @type {{[x: string]: {[x: string]: Model}}} */
	#graph = {};

	/** @type {{[x: string]: string[]}} */
	#order = {};

	/**
	 * Remove a model from the store.
	 *
	 * @param {?Model} model The model to destroy.
	 */
	destroy(model) {
		if (!model) {
			return;
		}
		const typeInOrder = this.#order[model.type];
		const typeInGraph = this.#graph[model.type];
		if (typeof model.id === 'undefined') {
			return;
		}
		model.unlinkDependence((dependent) => {
			// eslint-disable-next-line unicorn/no-array-method-this-argument
			return this.find(dependent.type, dependent.id);
		});
		delete typeInGraph?.[model.id];
		typeInOrder?.splice(typeInOrder.indexOf(model.id), 1);
	}

	/**
	 * Retrieve a model by type and id. Constant-time lookup.
	 *
	 * @param {string} type The type of the model.
	 * @param {string} id The id of the model.
	 *
	 * @returns The corresponding model if present, and `null` otherwise.
	 */
	find(type, id) {
		return this.#graph?.[type]?.[id] ?? null;
	}

	/**
	 * Retrieve all models by type.
	 *
	 * @param {string} type The type of the model.
	 *
	 * @returns Array of the corresponding model if present, and empty array otherwise.
	 */
	findAll(type) {
		const typeInOrder = this.#order[type];
		const typeInGraph = this.#graph[type];
		if (!typeInOrder) {
			return [];
		}
		/** @type {Model[]}*/
		const models = [];
		for (const modelId of typeInOrder) {
			const model = typeInGraph?.[modelId];
			if (model) {
				models.push(model);
			}
		}
		return models;
	}

	/**
	 * Empty the store.
	 */
	reset() {
		delete this.meta;
		delete this.links;
		delete this.jsonapi;
		delete this.errors;

		this.#graph = {};
		this.#order = {};
	}

	/**
	 * Initialize model.
	 *
	 * @param  {string} type The type of the model.
	 * @param  {string} id The id of the model.
	 *
	 * @returns New model.
	 */
	initModel(type, id) {
		this.#graph[type] ??= {};
		this.#order[type] ??= [];

		const typeInGraph = this.#graph[type];
		const typeInOrder = this.#order[type];

		const model = typeInGraph?.[id] ?? new Model(type, id);

		if (typeInGraph) {
			typeInGraph[id] ??= model;
		}
		if (!typeInOrder) {
			return model;
		}

		const currentOrderIndex = typeInOrder.indexOf(id);

		if (currentOrderIndex === -1) {
			typeInOrder.push(id);
		} else {
			// Remove the id from the current order and add it to the bottom
			typeInOrder.splice(currentOrderIndex, 1);
			typeInOrder.push(id);
		}
		return model;
	}

	/**
	 * Sync record data to model.
	 *
	 * @param  {ResourceObject} record Record data to sync.
	 */
	syncRecord(record) {
		/** @type {IModel} */
		const model = this.initModel(record.type, record.id);

		const findOrInit = (/** @type {ResourceObject|Linkage} */ resource) => {
			// eslint-disable-next-line unicorn/no-array-method-this-argument
			if (!this.find(resource.type, resource.id)) {
				this.initModel(resource.type, resource.id);
			}
			// eslint-disable-next-line unicorn/no-array-method-this-argument
			return this.find(resource.type, resource.id);
		};

		model.sync(record, findOrInit);
	}

	/**
	 * Sync a JSON API-compliant payload with the store and store any top level
	 * properties included in the payload.
	 *
	 * @param {JSONAPIDocument=} payload The JSON API payload.
	 */
	sync(payload) {
		const { data, meta, links, jsonapi, errors, included } = payload ?? {};

		this.meta = meta;
		this.links = links;
		this.jsonapi = jsonapi;
		this.errors = errors;

		if (Array.isArray(included)) {
			for (const record of included) {
				this.syncRecord(record);
			}
		}

		if (Array.isArray(data)) {
			for (const record of data) {
				this.syncRecord(record);
			}
		} else if (data) {
			this.syncRecord(data);
		}
	}
}

export { Store, Model };
