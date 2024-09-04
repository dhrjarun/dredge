import { client } from "@/client";

export default async function SayMyName({
  params,
}: {
  params: { name: string };
}) {
  const data = await client.get(`/say-my-name/${params.name}`).data();

  return (
    <div>
      <h1>{data}</h1>
    </div>
  );
}
