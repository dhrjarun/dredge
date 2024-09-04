import Link from "next/link";

export default function Home() {
  return (
    <main className="">
      <h1 className="text-lg">Dredge Routes</h1>
      <div className="space-x-3 underline text-sm">
        <Link href="/hello-world">Hello World</Link>
        <Link href="/say-my-name/Dhiraj">Say My Name</Link>
      </div>
    </main>
  );
}
