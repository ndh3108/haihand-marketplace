import os

directory = r"c:\Users\Triết\OneDrive\Desktop\thu-muc-nhanh-hung\frontend\src\pages"

for filename in os.listdir(directory):
    if filename.endswith(".js"):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r', encoding='utf-8') as file:
            content = file.read()
        
        new_content = content.replace("https://haihand-marketplace.onrender.com", "http://localhost:4000")
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as file:
                file.write(new_content)
            print(f"Updated {filename}")
