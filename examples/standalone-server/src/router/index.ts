import { dredgeRouter } from "dredge-route";
import { route } from "./r";

export const rootRouter = dredgeRouter([
  route
    .path("/hello-world")
    .get()
    .use((req, res) => {
      return res.end({
        text: "Hello World!",
      });
    })
    .build(),

  route
    .path("/say-my-name/:name")
    .get()
    .use((req, res) => {
      const name = req.param("name");

      return res.end({
        text: `Hello ${name}!`,
      });
    })
    .build(),
]);

export type RootRouter = typeof rootRouter;
