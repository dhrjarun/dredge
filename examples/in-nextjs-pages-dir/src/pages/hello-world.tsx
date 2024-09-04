import { client } from "@/client";
import { useEffect, useState } from "react";

export default function HelloWorld() {
  const [text, setText] = useState("");

  useEffect(() => {
    async function fn() {
      const data = await client.get("/hello-world").data();
      setText(data);
    }

    fn();
  }, []);

  return (
    <div>
      <h1>{text}</h1>
    </div>
  );
}
