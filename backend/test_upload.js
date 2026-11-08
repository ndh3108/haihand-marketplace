const fs = require('fs');

async function test() {
  try {
    const formData = new FormData();
    formData.append("title", "Sản phẩm test đăng tin");
    formData.append("price", "50000");
    formData.append("category", "Đồ gia dụng");
    formData.append("location", "Xã Tân Hợp, Huyện Văn Yên, Tỉnh Yên Bái");
    formData.append("description", "Mô tả sản phẩm test");
    formData.append("author", "60c72b2f9b1d8b001c8e4b6a");
    formData.append("quantity", "1");
    formData.append("details", JSON.stringify({ condition: "Mới" }));

    const fileBuffer = fs.readFileSync('valid_test.jpg');
    const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
    formData.append('images', blob, 'valid_test.jpg');

    const res = await fetch("http://localhost:4000/api/posts", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", data);
  } catch (err) {
    console.error("Test error:", err);
  }
}

test();