import { client } from "@/client";

export default async function HelloWorld() {
  const data = await client.get("/hello-world").data();

  return (
    <div>
      <h1>{data}</h1>
    </div>
  );
}
