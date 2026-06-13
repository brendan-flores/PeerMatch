const { getSupabaseAdmin } = require('./supabaseAdmin');
const { jsToDb, rowToDoc, docToRow, rowsToDocs, getFieldMap } = require('./mappers');

function toPgValue(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value._id) return String(value._id);
  return value;
}

function mapDuplicateKeyError(error) {
  if (error?.code === '23505') {
    const err = new Error(error.message || 'Duplicate key');
    err.code = 11000;
    throw err;
  }
  throw error;
}

function matchesNe(fieldValue, neValue) {
  if (neValue === true) return fieldValue !== true && fieldValue !== 'true';
  if (neValue === null) return fieldValue != null;
  return fieldValue !== neValue;
}

function matchesIn(fieldValue, list) {
  const strVal = fieldValue == null ? null : String(fieldValue);
  return list.some((item) => String(item) === strVal || item === fieldValue);
}

function matchesNin(fieldValue, list) {
  return !matchesIn(fieldValue, list);
}

function matchesRegex(fieldValue, pattern, options) {
  if (fieldValue == null) return false;
  const flags = options === 'i' ? 'i' : '';
  return new RegExp(pattern, flags).test(String(fieldValue));
}

function matchesExists(fieldValue, shouldExist) {
  const exists = fieldValue !== undefined && fieldValue !== null;
  return shouldExist ? exists : !exists;
}

function evalCondition(doc, field, condition) {
  const val = doc[field];

  if (
    condition &&
    typeof condition === 'object' &&
    !Array.isArray(condition) &&
    !(condition instanceof Date)
  ) {
    if ('$ne' in condition) return matchesNe(val, condition.$ne);
    if ('$in' in condition) return matchesIn(val, condition.$in);
    if ('$nin' in condition) return matchesNin(val, condition.$nin);
    if ('$gte' in condition) return val != null && val >= condition.$gte;
    if ('$lte' in condition) return val != null && val <= condition.$lte;
    if ('$gt' in condition) return val != null && val > condition.$gt;
    if ('$lt' in condition) return val != null && val < condition.$lt;
    if ('$exists' in condition) return matchesExists(val, condition.$exists);
    if ('$regex' in condition) return matchesRegex(val, condition.$regex, condition.$options);
  }

  if (Array.isArray(condition)) {
    const arr = Array.isArray(val) ? val.map(String) : [];
    return condition.every((item) => arr.includes(String(item)));
  }

  return String(val) === String(condition) || val === condition;
}

function matchesFilter(doc, filter) {
  if (!filter || typeof filter !== 'object') return true;

  if (filter.$and) {
    return filter.$and.every((sub) => matchesFilter(doc, sub));
  }

  if (filter.$or) {
    return filter.$or.some((sub) => matchesFilter(doc, sub));
  }

  for (const [key, condition] of Object.entries(filter)) {
    if (key === '$and' || key === '$or') continue;
    const field = key === '_id' ? '_id' : key;
    if (!evalCondition(doc, field, condition)) return false;
  }

  return true;
}

function parseSelectFields(selectStr, entity) {
  if (!selectStr) return null;
  const exclude = selectStr.trim().startsWith('-');
  const parts = selectStr
    .replace(/^-/, '')
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (exclude) {
    const map = getFieldMap(entity);
    const allJs = Object.keys(map).filter((k) => k !== 'id');
    return allJs.filter((f) => !parts.includes(f));
  }

  return parts;
}

function applySelect(doc, fields) {
  if (!fields || fields.length === 0) return doc;
  const out = { _id: doc._id };
  for (const f of fields) {
    if (f === '_id') continue;
    if (f in doc) out[f] = doc[f];
  }
  return out;
}

function applySort(docs, sortObj) {
  if (!sortObj) return docs;
  const entries = Object.entries(sortObj);
  return [...docs].sort((a, b) => {
    for (const [field, dir] of entries) {
      const av = a[field];
      const bv = b[field];
      if (av === bv) continue;
      const cmp = av == null ? -1 : bv == null ? 1 : av < bv ? -1 : av > bv ? 1 : 0;
      if (cmp !== 0) return dir === -1 || dir === 'desc' ? -cmp : cmp;
    }
    return 0;
  });
}

class Document {
  constructor(entity, table, data, modelApi) {
    this._entity = entity;
    this._table = table;
    this._model = modelApi;
    this._isNew = !data._id;
    Object.assign(this, data);
  }

  markModified() {
    return this;
  }

  async save() {
    const supabase = getSupabaseAdmin();
    const row = docToRow(this._entity, this, { forInsert: this._isNew });

    if (this._isNew) {
      delete row.id;
      const { data, error } = await supabase.from(this._table).insert(row).select().single();
      if (error) mapDuplicateKeyError(error);
      const doc = rowToDoc(this._entity, data);
      Object.assign(this, doc);
      this._isNew = false;
      return this;
    }

    const id = String(this._id);
    delete row.id;
    if (this._entity !== 'user') {
      row.updated_at = new Date().toISOString();
    }
    const { data, error } = await supabase.from(this._table).update(row).eq('id', id).select().single();
    if (error) mapDuplicateKeyError(error);
    const doc = rowToDoc(this._entity, data);
    Object.assign(this, doc);
    return this;
  }
}

class Query {
  constructor(entity, table, filter, modelApi) {
    this._entity = entity;
    this._table = table;
    this._filter = filter || {};
    this._model = modelApi;
    this._select = null;
    this._sort = null;
    this._limit = null;
    this._populate = [];
    this._lean = false;
    this._single = false;
  }

  select(fields) {
    this._select = fields;
    return this;
  }

  sort(obj) {
    this._sort = obj;
    return this;
  }

  limit(n) {
    this._limit = n;
    return this;
  }

  populate(path, fields) {
    this._populate.push({ path, fields: fields || '' });
    return this;
  }

  lean() {
    this._lean = true;
    return this;
  }

  async _fetchRows() {
    const supabase = getSupabaseAdmin();
    let query = supabase.from(this._table).select('*');
    query = this._applySimpleFilters(query);

    const { data, error } = await query;
    if (error) throw error;

    let docs = rowsToDocs(this._entity, data);
    docs = docs.filter((doc) => matchesFilter(doc, this._filter));
    docs = applySort(docs, this._sort);
    if (this._limit != null) docs = docs.slice(0, this._limit);

    return docs;
  }

  _applySimpleFilters(query) {
    const f = this._filter;
    if (!f || typeof f !== 'object') return query;

    if (f.$and) {
      for (const clause of f.$and) {
        query = this._applyFlatFilters(query, clause);
      }
    } else {
      query = this._applyFlatFilters(query, f);
    }

    if (f.$or && Array.isArray(f.$or)) {
      const orParts = [];
      for (const clause of f.$or) {
        const part = this._orClauseToFilter(clause);
        if (part) orParts.push(part);
      }
      if (orParts.length) query = query.or(orParts.join(','));
    }

    return query;
  }

  _applyFlatFilters(query, clause) {
    if (!clause || typeof clause !== 'object') return query;

    for (const [key, val] of Object.entries(clause)) {
      if (key === '$and' || key === '$or') continue;
      const col = jsToDb(this._entity, key);

      if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        if ('$in' in val && val.$in?.length) {
          query = query.in(col, val.$in.map(String));
        } else if ('$regex' in val) {
          query = query.ilike(col, `%${val.$regex}%`);
        } else if ('$ne' in val && val.$ne === true && key === 'suspended') {
          query = query.or('suspended.is.null,suspended.eq.false');
        } else if ('$ne' in val && val.$ne === null) {
          query = query.not(col, 'is', null);
        } else if ('$ne' in val) {
          query = query.neq(col, val.$ne);
        }
      } else if (key === '_id' || key === 'id') {
        query = query.eq('id', String(val));
      } else if (typeof val !== 'object') {
        query = query.eq(col, val);
      }
    }

    return query;
  }

  _orClauseToFilter(clause) {
    const parts = [];
    for (const [key, val] of Object.entries(clause)) {
      const col = jsToDb(this._entity, key);
      if (val && typeof val === 'object' && '$in' in val) {
        for (const v of val.$in) {
          if (v == null) parts.push(`${col}.is.null`);
          else parts.push(`${col}.eq.${v}`);
        }
      } else if (val && typeof val === 'object' && '$exists' in val) {
        if (!val.$exists) parts.push(`${col}.is.null`);
        else parts.push(`${col}.not.is.null`);
      } else {
        parts.push(`${col}.eq.${val}`);
      }
    }
    if (parts.length === 1) return parts[0];
    if (parts.length > 1) return `and(${parts.join(',')})`;
    return null;
  }

  async _populateDocs(docs) {
    if (!this._populate.length || !docs.length) return docs;

    for (const { path, fields } of this._populate) {
      const ids = [...new Set(docs.map((d) => d[path]).filter(Boolean).map(String))];
      if (!ids.length) continue;

      const refConfig = this._model._populateMap[path];
      if (!refConfig) continue;

      const refModel = refConfig.getModel();
      let refQuery = refModel.find({ _id: { $in: ids } });
      if (fields) refQuery = refQuery.select(fields);
      const refDocs = await refQuery.lean();
      const byId = new Map(refDocs.map((r) => [String(r._id), r]));

      for (const doc of docs) {
        const id = doc[path] ? String(doc[path]) : null;
        if (id && byId.has(id)) doc[path] = byId.get(id);
      }
    }

    return docs;
  }

  async exec() {
    let docs = await this._fetchRows();

    if (this._select) {
      const fields = parseSelectFields(this._select, this._entity);
      docs = docs.map((d) => applySelect(d, fields));
    }

    docs = await this._populateDocs(docs);

    if (this._single) {
      const one = docs[0] || null;
      if (!one) return null;
      if (this._lean) return one;
      return new Document(this._entity, this._table, one, this._model);
    }

    if (this._lean) return docs;
    return docs.map((d) => new Document(this._entity, this._table, d, this._model));
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
}

function createModel({ entity, table, populateMap = {} }) {
  const api = {
    _entity: entity,
    _table: table,
    _populateMap: populateMap,

    find(filter) {
      return new Query(entity, table, filter, api);
    },

    findOne(filter) {
      const q = new Query(entity, table, filter, api);
      q._single = true;
      q._limit = 1;
      return q;
    },

    findById(id) {
      return api.findOne({ _id: id });
    },

    async create(payload) {
      const supabase = getSupabaseAdmin();
      const row = docToRow(entity, payload, { forInsert: true });
      delete row.id;
      const now = new Date().toISOString();
      if (!row.created_at) row.created_at = now;
      if ('updated_at' in getFieldMap(entity) && !row.updated_at) row.updated_at = now;

      const { data, error } = await supabase.from(table).insert(row).select().single();
      if (error) mapDuplicateKeyError(error);
      const doc = rowToDoc(entity, data);
      return new Document(entity, table, doc, api);
    },

    async insertMany(items, options = {}) {
      const supabase = getSupabaseAdmin();
      const rows = items.map((item) => {
        const row = docToRow(entity, item, { forInsert: true });
        delete row.id;
        const now = new Date().toISOString();
        if (!row.created_at) row.created_at = now;
        if ('updated_at' in getFieldMap(entity) && !row.updated_at) row.updated_at = now;
        return row;
      });

      const { data, error } = await supabase.from(table).insert(rows).select();
      if (error) mapDuplicateKeyError(error);
      return rowsToDocs(entity, data);
    },

    async countDocuments(filter = {}) {
      const docs = await new Query(entity, table, filter, api).exec();
      return docs.length;
    },

    async exists(filter) {
      const doc = await api.findOne(filter).select('_id').lean();
      return doc ? { _id: doc._id } : null;
    },

    async updateOne(filter, update) {
      const docs = await new Query(entity, table, filter, api).lean();
      if (!docs.length) return { matchedCount: 0, modifiedCount: 0 };
      const ok = await api._applyUpdate(docs[0]._id, update);
      return { matchedCount: 1, modifiedCount: ok ? 1 : 0 };
    },

    async updateMany(filter, update) {
      const docs = await new Query(entity, table, filter, api).lean();
      if (!docs.length) return { matchedCount: 0, modifiedCount: 0 };
      let modified = 0;
      for (const doc of docs) {
        const ok = await api._applyUpdate(doc._id, update);
        if (ok) modified += 1;
      }
      return { matchedCount: docs.length, modifiedCount: modified };
    },

    async _applyUpdate(id, update) {
      const supabase = getSupabaseAdmin();
      const existing = await api.findById(id).lean();
      if (!existing) return false;

      const patch = { ...existing };

      if (update.$set) Object.assign(patch, update.$set);
      if (update.$unset) {
        for (const key of Object.keys(update.$unset)) patch[key] = null;
      }
      if (update.$addToSet) {
        for (const [key, value] of Object.entries(update.$addToSet)) {
          const arr = Array.isArray(patch[key]) ? [...patch[key].map(String)] : [];
          const strVal = String(value);
          if (!arr.includes(strVal)) arr.push(strVal);
          patch[key] = arr;
        }
      }
      if (!update.$set && !update.$unset && !update.$addToSet) {
        Object.assign(patch, update);
      }

      const row = docToRow(entity, patch);
      const rowId = row.id;
      delete row.id;
      if (entity !== 'user') row.updated_at = new Date().toISOString();

      const { error } = await supabase.from(table).update(row).eq('id', rowId);
      if (error) mapDuplicateKeyError(error);
      return true;
    },

    async deleteOne(filter) {
      const doc = await api.findOne(filter).lean();
      if (!doc) return { deletedCount: 0 };
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from(table).delete().eq('id', String(doc._id));
      if (error) throw error;
      return { deletedCount: 1 };
    },

    async deleteMany(filter) {
      const docs = await new Query(entity, table, filter, api).lean();
      if (!docs.length) return { deletedCount: 0 };
      const supabase = getSupabaseAdmin();
      const ids = docs.map((d) => String(d._id));
      const { error } = await supabase.from(table).delete().in('id', ids);
      if (error) throw error;
      return { deletedCount: ids.length };
    },

    findByIdAndUpdate(id, update, options = {}) {
      return api._buildUpdateQuery({ _id: id }, update, options);
    },

    findOneAndUpdate(filter, update, options = {}) {
      return api._buildUpdateQuery(filter, update, options);
    },

    _buildUpdateQuery(filter, update, options = {}) {
      const chain = {
        _populate: [],
        _lean: false,
        populate(path, fields) {
          chain._populate.push({ path, fields: fields || '' });
          return chain;
        },
        lean() {
          chain._lean = true;
          return chain;
        },
        async exec() {
          const before = await api.findOne(filter).lean();
          if (!before) return null;
          await api._applyUpdate(before._id, update);
          if (options.new === false) return before;
          let q = api.findOne({ _id: before._id });
          for (const { path, fields } of chain._populate) {
            q = q.populate(path, fields);
          }
          if (chain._lean) q = q.lean();
          return q;
        },
        then(resolve, reject) {
          return chain.exec().then(resolve, reject);
        },
      };
      return chain;
    },

    findOneAndDelete(filter) {
      const q = new Query(entity, table, filter, api);
      q._single = true;
      q._limit = 1;
      q._lean = true;

      const chain = {
        lean() {
          return chain;
        },
        then(resolve, reject) {
          return q.exec().then(async (doc) => {
            if (!doc) return resolve(null);
            await api.deleteOne({ _id: doc._id });
            return resolve(doc);
          }, reject);
        },
      };
      return chain;
    },
  };

  return api;
}

module.exports = { createModel, Document, Query, matchesFilter };
