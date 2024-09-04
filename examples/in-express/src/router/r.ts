import type { DB } from "@/db";
import { ValidationError, dredgeRoute } from "dredge-route";

type InitialContext = {
  db: DB;
};

export const route = dredgeRoute<InitialContext>()
  .options({
    dataTypes: {
      json: "application/json",
      text: "text/plain",
    },
  })
  .error((err, req, res) => {
    if (err instanceof ValidationError) {
    }

    return res.next({
      json: {
        err: {
          message: err?.message || "Something went wrong",
        },
      },
      status: 500,
    });
  });
