import { defaults, merge } from "lodash-es";
import { normalizeDeep, getDefaultInitValues } from "./normalize";

const initModelManager = () => {
  const cacheStore = {};

  const setCache = (modelName, newData) => {
    cacheStore[modelName] = {
      ids: Object.prototype.hasOwnProperty.call(newData, "ids")
        ? newData.ids
        : cacheStore[modelName]?.ids,
      entities: merge({}, cacheStore[modelName]?.entities, newData.entities),
    };
  };

  const createModelManager = ({ initialValues, ...definition } = {}) => {
    const defaultedDefinition = defaults(definition, {
      selectId: (item) => item.id,
      sortComparer: (a, b) => a.name.localeCompare(b.name),
    });

    if (initialValues) {
      const {
        ids,
        entities: { [definition.name]: entities, ...otherEntities },
      } = normalizeDeep(defaultedDefinition, initialValues);

      setCache(definition.name, { ids, entities });
      Object.entries(otherEntities).forEach(([name, entities]) => {
        setCache(name, { entities });
      });
    } else {
      setCache(definition.name, getDefaultInitValues());
    }

    return defaultedDefinition;
  };

  return {
    createModelManager,
    cacheStore,
  };
};

if (import.meta.vitest) {
  const { it, expect, describe } = import.meta.vitest;
  describe("modelManager", function () {
    it("should create and default model", () => {
      const { createModelManager, cacheStore } = initModelManager();

      createModelManager({ name: "user" });

      expect(cacheStore).toEqual({ user: { ids: [], entities: {} } });
    });

    it("should create and default model with initial Values", () => {
      const { createModelManager, cacheStore } = initModelManager();

      createModelManager({
        name: "user",
        initialValues: [{ id: "u-1", name: "user one" }],
      });

      expect(cacheStore).toEqual({
        user: {
          ids: ["u-1"],
          entities: { "u-1": { id: "u-1", name: "user one" } },
        },
      });
    });

    it("should create and default models with initial Values with schema", () => {
      const { createModelManager, cacheStore } = initModelManager();

      const ticketDefinition = createModelManager({
        name: "ticket",
        initialValues: [{ id: "t-1", name: "ticket one" }],
      });

      createModelManager({
        name: "user",
        schema: {
          tickets: [ticketDefinition],
        },
        initialValues: [
          {
            id: "u-1",
            name: "user one",
            tickets: [{ id: "t-1", name: "ticket one" }],
          },
          {
            id: "u-2",
            name: "user two",
            tickets: [
              { id: "t-1", name: "ticket one" },
              { id: "t-2", name: "ticket two" },
            ],
          },
        ],
      });

      expect(cacheStore).toEqual({
        ticket: {
          ids: ["t-1"],
          entities: {
            "t-1": { id: "t-1", name: "ticket one" },
            "t-2": { id: "t-2", name: "ticket two" },
          },
        },
        user: {
          ids: ["u-1", "u-2"],
          entities: {
            "u-1": { id: "u-1", name: "user one", tickets: ["t-1"] },
            "u-2": { id: "u-2", name: "user two", tickets: ["t-1", "t-2"] },
          },
        },
      });
    });
  });
}
