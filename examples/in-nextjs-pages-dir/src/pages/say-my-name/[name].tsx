import { client } from "@/client";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function SayMyName() {
  const router = useRouter();
  const [text, setText] = useState("");

  useEffect(() => {
    async function fn() {
      const data = await client.get(`/say-my-name/${router.query.name}`).data();
      setText(data);
    }

    fn();
  }, [router]);

  return (
    <div>
      <h1>{text}</h1>
    </div>
  );
}
