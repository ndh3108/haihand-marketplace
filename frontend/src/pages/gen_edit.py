import os
import re

create_post_path = r'c:\Users\Triết\OneDrive\Desktop\thu-muc-nhanh-hung\frontend\src\pages\CreatePostPage.js'
edit_post_path = r'c:\Users\Triết\OneDrive\Desktop\thu-muc-nhanh-hung\frontend\src\pages\EditPostPage.js'

with open(create_post_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('export default function CreatePostPage() {', "import { useParams } from 'react-router-dom';\n\nexport default function EditPostPage() {\n  const { id } = useParams();\n  const [existingImages, setExistingImages] = useState([]);")

fetch_code = """
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/posts/${id}`);
        const parts = (data.location || '').split(',').map(i => i.trim());
        setFormData({
          title: data.title || '',
          price: data.price || '',
          category1: data.category || 'Thời trang',
          category2: '',
          brand: data.details?.brand || '',
          condition: data.details?.condition || '',
          ward: parts.length > 2 ? parts[0] : '',
          district: parts.length > 1 ? parts[parts.length-2] : '',
          city: parts.length > 0 ? parts[parts.length-1] : '',
          description: data.description || '',
          commit: true
        });
        if (data.images && data.images.length > 0) {
            setExistingImages(data.images);
            setPreviewImages(data.images.map(img => img.startsWith('http') ? img : `${API_URL}/${img.replace(/\\\\/g, '/')}`));
        } else if (data.image) {
            setExistingImages([data.image]);
            setPreviewImages([data.image.startsWith('http') ? data.image : `${API_URL}/${data.image.replace(/\\\\/g, '/')}`]);
        }
      } catch (err) {
        toast.error('Lỗi', 'Không tải được thông tin bài đăng');
      }
    };
    fetchPost();
  }, [id, API_URL]);
"""

content = content.replace("const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';", "const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';\n" + fetch_code)

content = content.replace('axios.post(`${API_URL}/api/posts`, data)', 'axios.put(`${API_URL}/api/posts/${id}`, data)')
content = content.replace('Đăng tin thành công', 'Cập nhật tin thành công')
content = content.replace('Lỗi đăng tin', 'Lỗi cập nhật tin')
content = content.replace('Tạo tin đăng mới', 'Chỉnh sửa tin đăng')
content = content.replace("Đăng tin ngay", "Cập nhật tin")

with open(edit_post_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
