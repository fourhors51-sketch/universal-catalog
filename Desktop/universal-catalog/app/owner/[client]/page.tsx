"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function OwnerPage() {
  const pathname = usePathname();
  const clientSlug = pathname.split("/")[2];

  const [client, setClient] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadClient();
  }, []);

  async function loadClient() {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("slug", clientSlug)
      .single();

    setClient(data);
  }

  async function login() {
    setMessage("");

    if (!client) {
      setMessage("الكتالوج غير موجود");
      return;
    }

    const { data, error } = await supabase
      .from("catalog_users")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .eq("client_id", client.id)
      .eq("role", "owner")
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      setMessage("اسم المستخدم أو كلمة المرور غير صحيحة");
      return;
    }

    setIsLoggedIn(true);
    setMessage("");
    loadCategories(client.id);
    loadProducts(client.id);
  }

  async function loadCategories(clientId: string) {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("client_id", clientId)
      .order("name", { ascending: true });

    setCategories(data || []);
  }

  async function loadProducts(clientId: string) {
    const { data } = await supabase
      .from("items")
      .select("*, categories(name)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    setProducts(data || []);
  }

  function makeSlug(text: string) {
    return text.toLowerCase().trim().replaceAll(" ", "-").replaceAll("/", "-");
  }

  async function uploadImages(itemId: string) {
    const uploadedUrls: string[] = [];

    for (const file of imageFiles) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;

      const filePath = `products/${fileName}`;

      const { error } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);

      if (error) throw new Error(error.message);

      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      uploadedUrls.push(data.publicUrl);
    }

    if (uploadedUrls.length > 0) {
      await supabase.from("item_images").insert(
        uploadedUrls.map((url, index) => ({
          item_id: itemId,
          client_id: client.id,
          image_url: url,
          sort_order: index,
          image_type: index === 0 ? "main" : "gallery",
        }))
      );
    }

    return uploadedUrls;
  }

  async function saveProduct() {
    setMessage("");

    if (!client) return;

    if (!title || !slug || !categoryId) {
      setMessage("من فضلك اكتب اسم المنتج واختار القسم");
      return;
    }

    try {
      if (editingId) {
        const uploadedUrls = await uploadImages(editingId);
        const newMainImage = uploadedUrls[0];

        const updateData: any = {
          category_id: categoryId,
          title,
          slug,
          short_description: shortDescription,
          description,
          video_url: videoUrl,
          is_active: true,
        };

        if (newMainImage) {
          updateData.image_url = newMainImage;
          updateData.main_image_url = newMainImage;
        }

        const { error } = await supabase
          .from("items")
          .update(updateData)
          .eq("id", editingId)
          .eq("client_id", client.id);

        if (error) {
          setMessage("حصل خطأ أثناء التعديل: " + error.message);
          return;
        }

        setMessage("تم تعديل المنتج بنجاح ✅");
      } else {
        const { data: newItem, error } = await supabase
          .from("items")
          .insert({
            client_id: client.id,
            category_id: categoryId,
            title,
            slug,
            short_description: shortDescription,
            description,
            video_url: videoUrl,
            is_active: true,
          })
          .select()
          .single();

        if (error) {
          setMessage("حصل خطأ: " + error.message);
          return;
        }

        const uploadedUrls = await uploadImages(newItem.id);

        if (uploadedUrls[0]) {
          await supabase
            .from("items")
            .update({
              image_url: uploadedUrls[0],
              main_image_url: uploadedUrls[0],
            })
            .eq("id", newItem.id);
        }

        setMessage("تم إضافة المنتج بنجاح ✅");
      }

      resetForm();
      loadProducts(client.id);
    } catch (err: any) {
      setMessage("حصل خطأ: " + err.message);
    }
  }

  function editProduct(product: any) {
    setEditingId(product.id);
    setCategoryId(product.category_id || "");
    setTitle(product.title || "");
    setSlug(product.slug || "");
    setShortDescription(product.short_description || "");
    setDescription(product.description || "");
    setVideoUrl(product.video_url || "");
    setImageFiles([]);
    setMessage("أنت الآن تعدل المنتج");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteProduct(productId: string) {
    const confirmDelete = confirm("هل أنت متأكد من حذف المنتج؟");
    if (!confirmDelete) return;

    await supabase.from("item_images").delete().eq("item_id", productId);

    const { error } = await supabase
      .from("items")
      .delete()
      .eq("id", productId)
      .eq("client_id", client.id);

    if (error) {
      setMessage("حصل خطأ أثناء الحذف: " + error.message);
      return;
    }

    setMessage("تم حذف المنتج بنجاح ✅");

    if (editingId === productId) {
      resetForm();
    }

    loadProducts(client.id);
  }

  function resetForm() {
    setEditingId(null);
    setCategoryId("");
    setTitle("");
    setSlug("");
    setShortDescription("");
    setDescription("");
    setVideoUrl("");
    setImageFiles([]);
  }

  if (!isLoggedIn) {
    return (
      <main style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={{ fontSize: 30, fontWeight: "bold" }}>
            دخول صاحب الكتالوج
          </h1>

          <p style={{ color: "#6b7280" }}>
            {client ? client.name : "جاري تحميل الكتالوج..."}
          </p>

          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="اسم المستخدم"
            style={inputStyle}
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة المرور"
            type="password"
            style={inputStyle}
          />

          <button onClick={login} style={buttonStyle}>
            دخول
          </button>

          {message && <p style={messageStyle}>{message}</p>}
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: 30, fontWeight: "bold" }}>
          إدارة منتجات {client?.name}
        </h1>

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          style={inputStyle}
        >
          <option value="">اختار القسم</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setSlug(makeSlug(e.target.value));
          }}
          placeholder="اسم المنتج"
          style={inputStyle}
        />

        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="رابط المنتج"
          style={inputStyle}
        />

        <input
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          placeholder="وصف مختصر"
          style={inputStyle}
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="الوصف الكامل"
          rows={4}
          style={inputStyle}
        />

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
          style={inputStyle}
        />

        <p style={{ marginTop: 8, color: "#6b7280" }}>
          عدد الصور المختارة: {imageFiles.length}
        </p>

        <input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="رابط الفيديو"
          style={inputStyle}
        />

        <button onClick={saveProduct} style={buttonStyle}>
          {editingId ? "حفظ التعديل" : "إضافة المنتج"}
        </button>

        {editingId && (
          <button onClick={resetForm} style={cancelButtonStyle}>
            إلغاء التعديل
          </button>
        )}

        {message && <p style={messageStyle}>{message}</p>}
      </div>

      <div style={{ ...cardStyle, marginTop: 30 }}>
        <h2 style={{ fontSize: 24, fontWeight: "bold" }}>
          منتجاتك الحالية
        </h2>

        {products.map((product) => (
          <div key={product.id} style={productRowStyle}>
            <div>
              <b>{product.title}</b>
              <p style={{ margin: 0, color: "#6b7280" }}>
                {product.categories?.name || "بدون قسم"}
              </p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => editProduct(product)}
                style={smallButtonStyle}
              >
                تعديل
              </button>

              <button
                onClick={() => deleteProduct(product.id)}
                style={deleteButtonStyle}
              >
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

const pageStyle: CSSProperties = {
  padding: 40,
  background: "#f1f5f9",
  minHeight: "100vh",
  color: "#111827",
};

const cardStyle: CSSProperties = {
  background: "white",
  padding: 30,
  borderRadius: 20,
  maxWidth: 800,
  margin: "auto",
  boxShadow: "0 5px 20px rgba(0,0,0,.1)",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: 12,
  marginTop: 15,
  border: "1px solid #ddd",
  borderRadius: 10,
  color: "#111827",
  background: "white",
};

const buttonStyle: CSSProperties = {
  width: "100%",
  marginTop: 20,
  padding: 14,
  border: "none",
  borderRadius: 10,
  background: "#111827",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const cancelButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "#6b7280",
};

const smallButtonStyle: CSSProperties = {
  padding: "8px 14px",
  border: "none",
  borderRadius: 8,
  background: "#111827",
  color: "white",
  cursor: "pointer",
};

const deleteButtonStyle: CSSProperties = {
  padding: "8px 14px",
  border: "none",
  borderRadius: 8,
  background: "#dc2626",
  color: "white",
  cursor: "pointer",
};

const messageStyle: CSSProperties = {
  marginTop: 20,
  fontWeight: "bold",
  background: "#f3f4f6",
  padding: 12,
  borderRadius: 10,
};

const productRowStyle: CSSProperties = {
  marginTop: 15,
  padding: 15,
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};