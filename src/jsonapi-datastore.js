/**
 * @class JsonApiDataStoreModel
 */
 class JsonApiDataStoreModel {
  /**
   * @method constructor
   * @param {string} type The type of the model.
   * @param {string} id The id of the model.
   */
  constructor(type, id) {
    this.id = id;
    this._type = type;
    this._attributes = [];
    this._dependents = [];
    this._relationships = [];
    this._links = {};
    this._relationshipLinks = {};
  }

  /**
   * Add a dependent to a model.
   * @method _addDependence
   * @param {string} type The type of the dependent model.
   * @param {string} id The id of the dependent model.
   * @param {string} key The name of the relation found on the dependent model.
    */
  _addDependence(type, id, key) {
    var self = this,
      found;

    found = self._dependents.find(function(dependent) {
      return dependent.id === id && dependent.type === type && dependent.relation === key;
    });
    if (found === undefined) {
      self._dependents.push({id: id, type: type, relation: key});
    }
  }

  /**
   * Removes a dependent from a model.
   * @method _removeDependence
   * @param {string} type The type of the dependent model.
   * @param {string} id The id of the dependent model.
    */
  _removeDependence(type, id) {
    var self = this,
      found;

    self._dependents.forEach(function(val, idx) {
      if (val.id === id && val.type === type) {
        self._dependents.splice(idx, 1);
      }
    });
  }

  /**
   * Removes a relationship from a model.
   * @method removeRelationship
   * @param {string} type The type of the dependent model.
   * @param {string} id The id of the dependent model.
   * @param {string} relName The name of the relationship.
    */
  removeRelationship(type, id, relName) {
    var self = this;
    self._removeDependence(type, id);
    if (self[relName].constructor === Array) {
      self[relName].forEach(function(val, idx) {
        if (val.id === id && val.type === type) {
          self[relName].splice(idx, 1);
        }
      });
    } else if (self[relName].id === id) {
      self[relName] = null;
    }
  }

  /**
   * Serialize a model.
   * @method serialize
   * @param {object} opts The options for serialization.  Available properties:
   *
   *  - `{array=}` `attributes` The list of attributes to be serialized (default: all attributes).
   *  - `{array=}` `relationships` The list of relationships to be serialized (default: all relationships).
   *  - `{array=}` `links` The list of links to be serialized (default: all links).
   * @return {object} JSONAPI-compliant object
   */
  serialize(opts) {
    var self = this,
        res = { data: { type: this._type } },
        key;

    opts = opts || {};
    opts.attributes = opts.attributes || this._attributes;
    opts.relationships = opts.relationships || this._relationships;
    opts.links = opts.links || [];

    if (this.id !== undefined) res.data.id = this.id;
    if (opts.attributes.length !== 0) res.data.attributes = {};
    if (opts.relationships.length !== 0) res.data.relationships = {};

    opts.attributes.forEach(function(key) {
      res.data.attributes[key] = self[key];
    });

    opts.relationships.forEach(function(key) {
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
       res.data.relationships[key].links = self._relationshipLinks[key];
      }
    });

    if (Object.keys(this._links).length !== 0) {
      res.data.links = this._links;
    }
    if (opts.links.length !== 0) {
      opts.links.forEach(function(key) {
        res.data.links[key] = self._links[key];
      });
    }

    return res;
  }

  /**
   * Set/add an attribute to a model.
   * @method setAttribute
   * @param {string} attrName The name of the attribute.
   * @param {object} value The value of the attribute.
   */
  setAttribute(attrName, value) {
    if (this[attrName] === undefined) this._attributes.push(attrName);
    this[attrName] = value;
  }

  /**
   * Set/add a relationships to a model.
   * @method setRelationship
   * @param {string} relName The name of the relationship.
   * @param {object} models The linked model(s).
   */
  setRelationship(relName, models) {
    if (this[relName] === undefined) this._relationships.push(relName);
    this[relName] = models;
  }
}

/**
 * @class JsonApiDataStore
 */
class JsonApiDataStore {
  /**
   * @method constructor
   */
  constructor() {
    this.graph = {};
  }

  /**
   * Remove a model from the store.
   * @method destroy
   * @param {object} model The model to destroy.
   */
  destroy(model) {
    var self = this;
    model._dependents.forEach(function(dependent, depIdx) {
      self.graph[dependent.type][dependent.id].removeRelationship(model._type, model.id, dependent.relation);
    });
    delete this.graph[model._type][model.id];
  }

  /**
   * Retrieve a model by type and id. Constant-time lookup.
   * @method find
   * @param {string} type The type of the model.
   * @param {string} id The id of the model.
   * @return {object} The corresponding model if present, and null otherwise.
   */
  find(type, id) {
    if (!this.graph[type] || !this.graph[type][id]) return null;
    return this.graph[type][id];
  }

  /**
   * Retrieve all models by type.
   * @method findAll
   * @param {string} type The type of the model.
   * @return {object} Array of the corresponding model if present, and empty array otherwise.
   */
  findAll(type) {
    var self = this;

    if (!this.graph[type]) return [];
    return Object.keys(self.graph[type]).map(function(v) { return self.graph[type][v]; });
  }

  /**
   * Empty the store.
   * @method reset
   */
  reset() {
    this.graph = {};
  }

  initModel(type, id) {
    this.graph[type] = this.graph[type] || {};
    this.graph[type][id] = this.graph[type][id] || new JsonApiDataStoreModel(type, id);

    return this.graph[type][id];
  }

  syncRecord(rec) {
    var self = this,
        model = this.initModel(rec.type, rec.id),
        key;

    function findOrInit(resource) {
      if (!self.find(resource.type, resource.id)) {
        var placeHolderModel = self.initModel(resource.type, resource.id);
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
      model._links = rec.links;
    }

    if (rec.relationships) {
      for (key in rec.relationships) {
        var rel = rec.relationships[key];
        if (rel.data !== undefined) {
          if (model._relationships.indexOf(key) === -1) {
            model._relationships.push(key);
          }
          if (rel.data === null) {
            model[key] = null;
          } else if (rel.data.constructor === Array) {
            model[key] = rel.data.map(findOrInit);
            model[key].forEach(function(record, key) { record._addDependence(model._type, model.id, key);});
          } else {
            model[key] = findOrInit(rel.data);
            model[key]._addDependence(model._type, model.id, key);
          }
        }
        if (rel.links) {
          model._relationshipLinks[key] = rel.links;
        }
      }
    }

    return model;
  }

  /**
   * Sync a JSONAPI-compliant payload with the store and return any metadata included in the payload
   * @method syncWithMeta
   * @param {object} data The JSONAPI payload
   * @return {object} The model/array of models corresponding to the payload's primary resource(s) and any metadata.
   */
  syncWithMeta(payload) {
    var primary = payload.data,
        syncRecord = this.syncRecord.bind(this);
    if (!primary) return [];
    if (payload.included) payload.included.map(syncRecord);
    return {
      data: (primary.constructor === Array) ? primary.map(syncRecord) : syncRecord(primary),
      meta: ("meta" in payload) ? payload.meta : null
    };
  }

  /**
   * Sync a JSONAPI-compliant payload with the store.
   * @method sync
   * @param {object} data The JSONAPI payload
   * @return {object} The model/array of models corresponding to the payload's primary resource(s).
   */
  sync(payload) {
    if (payload.errors) {
      return { errors: payload.errors };
    }
    return this.syncWithMeta(payload).data;
  }
}

if ('undefined' !== typeof module) {
  module.exports = {
    JsonApiDataStore: JsonApiDataStore,
    JsonApiDataStoreModel: JsonApiDataStoreModel
  };
}
