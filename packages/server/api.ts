// type RouteMap = Record<string, Route>;
// class Api {
//   routes: Record<string, Route | RouteMap>;

//   bodyTransformer: unknown;
//   queryTransformer: unknown;

//   caller() {
//     let routes = this.routes;
//     return function (
//       url: string,
//       options: {
//         body: any;
//         header: Record<string, string>;
//       }
//     ) {
//       // check if valid url
//       const u = new URL(url);

//       const paths = u.pathname.split("/");

//       paths.forEach((item, index) => {
//         const r = routes[item] || routes["$"];
//         if (!r) {
//           throw new Error("NOT Found");
//         }

//         if (index === paths.length - 1) {
//           // check if r is of Route type
//           // if r is of router type then execute it also check method and
//           // else throw error
//         }

//         // if r is of not of desired type throw
//       });
//     };
//   }
// }
