import os
import re

root_dir = r"C:\Users\selvabharathp\Desktop\Peoplehub-Selva\frontend\src"

# Regex patterns to match "http://localhost:5001" or "http://10.1.6.178:5001"
# and replace them with template literal variables using VITE_API_URL.
patterns = [
    (re.compile(r'"http://(?:localhost|10\.1\.6\.178):5001([^"]*)"'), r'`${import.meta.env.VITE_API_URL || "http://10.1.6.178:5001"}\1`'),
    (re.compile(r"'http://(?:localhost|10\.1\.6\.178):5001([^']*)'"), r'`${import.meta.env.VITE_API_URL || "http://10.1.6.178:5001"}\1`'),
    (re.compile(r'`http://(?:localhost|10\.1\.6\.178):5001([^`]*)`'), r'`${import.meta.env.VITE_API_URL || "http://10.1.6.178:5001"}\1`')
]

for dirpath, _, filenames in os.walk(root_dir):
    for filename in filenames:
        if filename.endswith(('.ts', '.tsx')):
            filepath = os.path.join(dirpath, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original_content = content
                for pattern, repl in patterns:
                    content = pattern.sub(repl, content)
                
                if content != original_content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"Updated: {filepath}")
            except Exception as e:
                print(f"Error processing {filepath}: {e}")
