import { defaults, merge } from "lodash-es";

const getDefaultInitValues = () => ({
  byId: {},
  allIds: [],
});

function normalize(modelManager, name, data) {
  const { modelDefinition, cacheStore } = modelManager;
  const definition = modelDefinition[name];
  if (!definition) {
    throw new Error(`Model ${name} not found`);
  }
  const prevData = cacheStore[name] ?? getDefaultInitValues();
  const { selectId, schema } = definition;
  const schemaEntries = Object.entries(schema);

  if (!Array.isArray(data)) {
    const allIds = selectId(data);

    return {
      allIds,
      byId: merge(prevData.byId, { [allIds]: data }),
    };
  }

  const result = data.reduce((acc, item) => {
    if (schemaEntries.length) {
      schemaEntries.forEach(([key, schemaDefinition]) => {
        if (Object.prototype.hasOwnProperty.call(item, key)) {
          const schemaName = Array.isArray(schemaDefinition)
            ? schemaDefinition[0]
            : schemaDefinition;

          const { allIds, byId } = normalize(
            modelManager,
            schemaName,
            item[key]
          );
          item[key] = allIds;

          if (schemaName === name) {
            prevData.byId = merge(prevData.byId, byId);
          } else {
            const prevExternalCache =
              cacheStore[name] ?? getDefaultInitValues();
            prevExternalCache.byId = merge(prevExternalCache.byId, byId);
          }
        }
      });
    }

    const key = selectId(item);

    acc.allIds = acc.allIds.includes(key)
      ? acc.allIds
      : acc.allIds.concat([key]);

    acc.byId = merge(acc.byId, { [key]: item });
    prevData.byId = merge(prevData.byId, acc.byId);

    return acc;
  }, getDefaultInitValues());

  return result;
}

const initModelManager = () => {
  const cacheStore = {};
  const modelDefinition = {};

  // const getCache = (modelName) => {
  //   return cacheStore[modelName] && cacheStore[modelName];
  // };

  const normalizeDeep = normalize.bind(null, { modelDefinition, cacheStore });

  const setCache = (modelName, data) => {
    cacheStore[modelName] = data || {};
  };

  const createModelManager = (name, { initValues, ...definition } = {}) => {
    const defaultedDefinition = defaults(definition, {
      selectId: (item) => item.id,
      sortComparer: (a, b) => a.name.localeCompare(b.name),
      schema: {},
    });

    modelDefinition[name] = defaultedDefinition;

    if (initValues) {
      const normalizedInitValues = normalizeDeep(name, initValues);
      console.log(name, normalizedInitValues);

      setCache(name, normalizedInitValues);
    } else {
      setCache(name, getDefaultInitValues());
    }

    return {
      name,
    };
  };

  return {
    createModelManager,
    cacheStore,
  };
};

const { createModelManager, cacheStore } = initModelManager();

createModelManager("ticket", {
  initValues: [
    { id: "t-001", name: "ticket one" },
    { id: "t-002", name: "ticket two" },
  ],
});

createModelManager("user", {
  initValues: [
    {
      id: "u-001",
      name: "user one",
      following: [{ id: "u-002", name: "user two" }],
      invitedBy: { id: "u-002", name: "user two" },
      tickets: [{ id: "t-005", name: "ticket five" }],
    },
    {
      id: "u-002",
      name: "user two",
      invitedBy: { id: "u-003", name: "user three" },
      followers: [
        { id: "u-001", name: "user one" },
        { id: "u-004", name: "user four" },
      ],
    },
  ],
  schema: {
    following: ["user"],
    followers: ["user"],
    invitedBy: "user",
    tickets: ["ticket"],
  },
});

console.log(JSON.stringify(cacheStore, null, 2));
