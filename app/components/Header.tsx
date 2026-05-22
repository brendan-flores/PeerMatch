import Image from "next/image";

export default function Header() {
  return (
    <div className="w-full rounded-[30px] bg-white px-8 py-8 shadow-sm shadow-slate-200 backdrop-blur-xl" style={{ minHeight: 179 }}>
      <div className="mx-auto flex h-full w-full max-w-[1120px] items-center justify-center">
        <Image
          src="/logo.png"
          alt="PeerMatch — Student Collaboration"
          width={320}
          height={64}
          className="h-16 w-auto max-w-full object-contain"
        />
      </div>
    </div>
  );
}
