import { supabase } from "@/lib/supabase";

import Link from "next/link";

type PageProps = {

  params: Promise<{

    client: string;

  }>;

};

export default async function ClientCatalogPage({ params }: PageProps) {

  const { client: clientSlug } = await params;

  const { data: client } = await supabase

    .from("clients")

    .select("*")

    .eq("slug", clientSlug)

    .single();

  if (!client) {

    return <main className="p-10">الكتالوج غير موجود</main>;

  }

  const { data: items } = await supabase

    .from("items")

    .select("*, categories(name)")

    .eq("client_id", client.id)

    .eq("is_active", true)

    .order("created_at", { ascending: false });

  return (

    <main className="min-h-screen bg-gray-100 px-4 py-6">

      <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow">

        <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>

        <p className="mt-2 text-gray-600">{client.description}</p>

      </div>

      <div className="mx-auto mt-8 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">

        {items?.map((item) => (

          <div key={item.id} className="rounded-2xl bg-white p-5 shadow">

            {item.image_url ? (

              <img

                src={item.image_url}

                alt={item.title}

                className="h-48 w-full rounded-xl object-cover"

              />

            ) : (

              <div className="flex h-48 items-center justify-center rounded-xl bg-gray-200 text-gray-500">

                صورة المنتج

              </div>

            )}

            <p className="mt-4 text-sm text-gray-500">

              {item.categories?.name || "بدون قسم"}

            </p>

            <Link href={`/${client.slug}/${item.id}`}>

              <h2 className="mt-2 text-2xl font-bold text-gray-900 hover:underline">

                {item.title}

              </h2>

            </Link>

            <p className="mt-2 text-gray-600">{item.short_description}</p>

            <Link

              href={`/${client.slug}/${item.id}`}

              className="mt-5 block rounded-xl bg-black px-5 py-3 text-center font-bold text-white"

            >

              عرض التفاصيل

            </Link>

          </div>

        ))}

      </div>

    </main>

  );

}