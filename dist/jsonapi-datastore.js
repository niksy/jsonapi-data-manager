/**
 * @class Model
 */
"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Model = (function () {
  /**
   * @method constructor
   * @param {string} type The type of the model.
   * @param {string} id The id of the model.
   */

  function Model(type, id) {
    _classCallCheck(this, Model);

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
   * @class Store
   */

  /**
   * Add a dependent to a model.
   * @method _addDependence
   * @param {string} type The type of the dependent model.
   * @param {string} id The id of the dependent model.
   * @param {string} key The name of the relation found on the dependent model.
    */

  _createClass(Model, [{
    key: "_addDependence",
    value: function _addDependence(type, id, key) {
      var self = this,
          found;

      found = self._dependents.find(function (dependent) {
        return dependent.id === id && dependent.type === type && dependent.relation === key;
      });
      if (found === undefined) {
        self._dependents.push({ id: id, type: type, relation: key });
      }
    }

    /**
     * Removes a dependent from a model.
     * @method _removeDependence
     * @param {string} type The type of the dependent model.
     * @param {string} id The id of the dependent model.
      */
  }, {
    key: "_removeDependence",
    value: function _removeDependence(type, id) {
      var self = this,
          found;

      self._dependents.forEach(function (val, idx) {
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
  }, {
    key: "removeRelationship",
    value: function removeRelationship(type, id, relName) {
      var self = this;
      self._removeDependence(type, id);
      if (self[relName].constructor === Array) {
        self[relName].forEach(function (val, idx) {
          if (val.id === id && val._type === type) {
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
     *  - `{array=}` `meta` The list of meta properties to be serialized (default: all meta properties).
     * @return {object} JSONAPI-compliant object
     */
  }, {
    key: "serialize",
    value: function serialize(opts) {
      var self = this,
          res = { data: { type: this._type } },
          key;

      opts = opts || {};
      opts.attributes = opts.attributes || this._attributes;
      opts.relationships = opts.relationships || this._relationships;
      opts.links = opts.links || undefined;
      opts.meta = opts.meta || undefined;

      if (this.id !== undefined) res.data.id = this.id;
      if (opts.attributes.length !== 0) res.data.attributes = {};
      if (opts.relationships.length !== 0) res.data.relationships = {};

      opts.attributes.forEach(function (key) {
        res.data.attributes[key] = self[key];
      });

      opts.relationships.forEach(function (key) {
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
        if (self._relationshipMeta[key]) {
          res.data.relationships[key].meta = self._relationshipMeta[key];
        }
      });

      if (Object.keys(this._links).length !== 0) {
        if (opts.links === undefined) {
          res.data.links = this._links;
        } else if (opts.links && opts.links.length !== 0) {
          res.data.links = {};
          opts.links.forEach(function (key) {
            res.data.links[key] = self._links[key];
          });
        }
      }

      if (Object.keys(this._meta).length !== 0) {
        if (opts.meta === undefined) {
          res.data.meta = this._meta;
        } else if (opts.meta && opts.meta.length !== 0) {
          res.data.meta = {};
          opts.meta.forEach(function (key) {
            res.data.meta[key] = self._meta[key];
          });
        }
      }

      return res;
    }

    /**
     * Set/add an attribute to a model.
     * @method setAttribute
     * @param {string} attrName The name of the attribute.
     * @param {object} value The value of the attribute.
     */
  }, {
    key: "setAttribute",
    value: function setAttribute(attrName, value) {
      if (this[attrName] === undefined) this._attributes.push(attrName);
      this[attrName] = value;
    }

    /**
     * Set/add a relationships to a model.
     * @method setRelationship
     * @param {string} relName The name of the relationship.
     * @param {object} models The linked model(s).
     */
  }, {
    key: "setRelationship",
    value: function setRelationship(relName, models) {
      if (this[relName] === undefined) this._relationships.push(relName);
      this[relName] = models;
    }
  }]);

  return Model;
})();

var Store = (function () {
  /**
   * @method constructor
   */

  function Store() {
    _classCallCheck(this, Store);

    this.graph = {};
    this.order = {};
  }

  /**
   * Remove a model from the store.
   * @method destroy
   * @param {object} model The model to destroy.
   */

  _createClass(Store, [{
    key: "destroy",
    value: function destroy(model) {
      var self = this;
      model._destroyed = true;
      model._dependents.forEach(function (dependent, depIdx) {
        self.graph[dependent.type][dependent.id].removeRelationship(model._type, model.id, dependent.relation);
      });
      delete this.graph[model._type][model.id];
      this.order[model._type].splice(this.order[model._type].indexOf(model.id), 1);
    }

    /**
     * Retrieve a model by type and id. Constant-time lookup.
     * @method find
     * @param {string} type The type of the model.
     * @param {string} id The id of the model.
     * @return {object} The corresponding model if present, and null otherwise.
     */
  }, {
    key: "find",
    value: function find(type, id) {
      if (!this.graph[type] || !this.graph[type][id]) return null;
      return this.graph[type][id];
    }

    /**
     * Retrieve all models by type.
     * @method findAll
     * @param {string} type The type of the model.
     * @return {object} Array of the corresponding model if present, and empty array otherwise.
     */
  }, {
    key: "findAll",
    value: function findAll(type) {
      var self = this;

      if (!this.graph[type]) return [];
      return self.order[type].map(function (modelId) {
        return self.graph[type][modelId];
      });
    }

    /**
     * Empty the store.
     * @method reset
     */
  }, {
    key: "reset",
    value: function reset() {
      this.graph = {};
      this.order = {};
    }
  }, {
    key: "initModel",
    value: function initModel(type, id) {
      this.graph[type] = this.graph[type] || {};
      this.order[type] = this.order[type] || [];
      this.graph[type][id] = this.graph[type][id] || new Model(type, id);
      var currentOrderIndex = this.order[type].indexOf(id);
      if (currentOrderIndex === -1) {
        this.order[type].push(id);
      } else {
        // remove the id from the current order and add it to the bottom
        this.order[type].splice(currentOrderIndex, 1);
        this.order[type].push(id);
      }
      return this.graph[type][id];
    }
  }, {
    key: "syncRecord",
    value: function syncRecord(rec) {
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
        model._links = model.links = rec.links;
      }

      if (rec.meta) {
        model._meta = model.meta = rec.meta;
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
     * Sync a JSONAPI-compliant payload with the store and return any top level properties included in the payload
     * @method sync
     * @param {object} data The JSONAPI payload
     * @param {object} opts The options for sync. Available properties:
     *
     *  - `{boolean=}` `topLevel` Return top level properties (default: false).
     * @return {object} The model/array of models corresponding to the payload's primary resource(s) and any top level properties.
     */
  }, {
    key: "sync",
    value: function sync(payload, opts) {
      var primary = payload.data,
          syncRecord = this.syncRecord.bind(this),
          opts = opts || {},
          obj = {};
      opts.topLevel = opts.topLevel || false;
      if ("meta" in payload) {
        obj.meta = payload.meta;
      }
      if ("links" in payload) {
        obj.links = payload.links;
      }
      if ("jsonapi" in payload) {
        obj.jsonapi = payload.jsonapi;
      }
      if (payload.errors) {
        obj.errors = payload.errors;
        return obj;
      }
      if (!primary) return [];
      if (payload.included) payload.included.map(syncRecord);
      obj.data = primary.constructor === Array ? primary.map(syncRecord) : syncRecord(primary);
      if (opts.topLevel) {
        return obj;
      }
      return obj.data;
    }
  }]);

  return Store;
})();

module.exports.Store = Store;
module.exports.Model = Model;