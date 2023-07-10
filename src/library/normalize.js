import { merge } from "lodash-es";

export function getDefaultInitValues() {
  return {
    ids: [],
    entities: {},
  };
}

export function normalizeDeep(definition, data) {
  const { selectId, name, schema } = definition;
  const schemaEntries = Object.entries(schema ?? {});

  if (!Array.isArray(data)) {
    return normalizeDeep(definition, [data]);
  }

  const result = data.reduce((acc, item) => {
    const key = selectId(item);

    if (schemaEntries.length) {
      schemaEntries.forEach(([key, schemaDefinition]) => {
        if (Object.prototype.hasOwnProperty.call(item, key)) {
          const dependantSchema = Array.isArray(schemaDefinition)
            ? schemaDefinition[0]
            : schemaDefinition;

          const { ids, entities } = normalizeDeep(dependantSchema, item[key]);

          item[key] = ids;
          acc.entities = merge(acc.entities, entities);
        }
      });
    }

    acc.ids = acc.ids.concat([key]);

    acc.entities = merge(acc.entities, { [name]: { [key]: item } });

    return acc;
  }, getDefaultInitValues());

  return result;
}

// in-source test suites
if (import.meta.vitest) {
  const { it, expect, describe } = import.meta.vitest;

  describe("normalizeDeep", function () {
    it("should normalize non array entities without schema", () => {
      const noArray = normalizeDeep(
        { name: "user", selectId: (item) => item.id },
        { id: "u-1", name: "user one" }
      );

      expect(noArray).toEqual({
        ids: ["u-1"],
        entities: { user: { "u-1": { id: "u-1", name: "user one" } } },
      });
    });

    it("should normalize non array entities with schema", () => {
      const ticketsDefinition = {
        name: "ticket",
        selectId: (item) => item.id,
      };

      const noArrayWithSchema = normalizeDeep(
        {
          name: "user",
          selectId: (item) => item.id,
          schema: { ticket: ticketsDefinition },
        },
        {
          id: "u-1",
          name: "user one",
          ticket: { id: "t-1", name: "ticket one" },
        }
      );

      expect(noArrayWithSchema).toEqual({
        ids: ["u-1"],
        entities: {
          user: { "u-1": { id: "u-1", name: "user one", ticket: ["t-1"] } },
          ticket: { "t-1": { id: "t-1", name: "ticket one" } },
        },
      });
    });

    it("should normalize array entities without schema", () => {
      const plainArray = normalizeDeep(
        { name: "user", selectId: (item) => item.id },
        [
          { id: "u-1", name: "user one" },
          { id: "u-2", name: "user two" },
        ]
      );

      expect(plainArray).toEqual({
        ids: ["u-1", "u-2"],
        entities: {
          user: {
            "u-1": { id: "u-1", name: "user one" },
            "u-2": { id: "u-2", name: "user two" },
          },
        },
      });
    });

    it("should normalize array entities with schema", () => {
      const ticketsDefinition = {
        name: "ticket",
        selectId: (item) => item.id,
      };

      const plainArray = normalizeDeep(
        {
          name: "user",
          selectId: (item) => item.id,
          schema: { ticket: [ticketsDefinition] },
        },
        [
          {
            id: "u-1",
            name: "user one",
            ticket: [{ id: "t-1", name: "ticket one" }],
          },
          {
            id: "u-2",
            name: "user two",
            ticket: [
              { id: "t-2", name: "ticket two" },
              { id: "t-4", name: "ticket four" },
            ],
          },
        ]
      );

      expect(plainArray).toEqual({
        ids: ["u-1", "u-2"],
        entities: {
          user: {
            "u-1": { id: "u-1", name: "user one", ticket: ["t-1"] },
            "u-2": { id: "u-2", name: "user two", ticket: ["t-2", "t-4"] },
          },
          ticket: {
            "t-1": { id: "t-1", name: "ticket one" },
            "t-2": { id: "t-2", name: "ticket two" },
            "t-4": { id: "t-4", name: "ticket four" },
          },
        },
      });
    });
  });
}
