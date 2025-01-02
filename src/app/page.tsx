"use client";

import lazy from "next/dynamic";

const ShoeWall = lazy(() => import("./ShoeWall"), { ssr: false, loading: () => <></> });

export default function Page() {
  return (
    <>
      <ShoeWall />
    </>
  );
}
