import { supabase } from "@/lib/supabase";
import Link from "next/link";
import ImageGallery from "./imageGallery";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    client: string;
    item: string;
  }>;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

export default async function ItemDetailsPage({ params }: PageProps) {
  const { client: clientSlug, item: itemParam } = await params;

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("slug", clientSlug)
    .single();

  if (!client) {
    return <main className="p-10">الكتالوج غير موجود</main>;
  }

  let query = supabase
    .from("items")
    .select("*, categories(name)")
    .eq("client_id", client.id)
    .eq("is_active", true);

  if (isUuid(itemParam)) {
    query = query.eq("id", itemParam);
  } else {
    query = query.eq("slug", itemParam);
  }

  const { data: item } = await query.single();

  if (!item) {
    return <main className="p-10">المنتج غير موجود</main>;
  }

  const { data: itemImages } = await supabase
    .from("item_images")
    .select("*")
    .eq("item_id", item.id)
    .order("sort_order", { ascending: true });

  const galleryImages =
    itemImages && itemImages.length > 0
      ? itemImages.map((img) => img.image_url)
      : item.image_url
      ? [item.image_url]
      : [];

  const productLink = `http://localhost:3000/${client.slug}/${item.id}`;

  const message = encodeURIComponent(
    `السلام عليكم، أريد معرفة تفاصيل أكثر عن المنتج:

اسم المنتج: ${item.title}

القسم: ${item.categories?.name || ""}

رابط المنتج:
${productLink}`
  );

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/${client.slug}`}
          className="mb-5 inline-block font-bold text-gray-600 hover:text-black"
        >
          ← رجوع للكتالوج
        </Link>

        <div className="overflow-hidden rounded-2xl bg-white shadow">
          <ImageGallery images={galleryImages} />

          <div className="p-6">
            <p className="text-sm text-gray-500">
              {item.categories?.name || "بدون قسم"}
            </p>

            <h1 className="mt-2 text-4xl font-bold text-gray-900">
              {item.title}
            </h1>

            {item.video_url && (
              <div style={{ marginTop: "24px" }}>
                <video
                  src={item.video_url}
                  controls
                  style={{
                    width: "100%",
                    borderRadius: "16px",
                    backgroundColor: "#000",
                  }}
                />
              </div>
            )}

            <p className="mt-4 text-lg text-gray-700">
              {item.description || item.short_description}
            </p>

            <a
              href={`https://api.whatsapp.com/send?phone=${client.whatsapp_number}&text=${message}`}
              target="_blank"
              className="mt-8 block rounded-xl bg-green-600 px-6 py-4 text-center text-lg font-bold text-white hover:bg-green-700"
            >
              تفاصيل أكثر على واتساب
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}